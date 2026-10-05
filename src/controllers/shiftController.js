const ShiftSchedule = require("../models/ShiftSchedule");
const ShiftSwapRequest = require("../models/ShiftSwapRequest");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const {
    generateShiftExcelTemplate,
    parseAndValidateExcel,
    commitImportedShifts,
} = require("../services/shiftImportService");

// Get shifts for the logged-in doctor
const getMyShifts = catchAsync(async (req, res, next) => {
    const shifts = await ShiftSchedule.find({
        user: req.user._id,
        status: { $ne: "Cancelled" },
    })
        .populate("handoverToUser", "userId name role")
        .sort({ startTime: -1 })
        .limit(30);

    res.status(200).json({
        success: true,
        count: shifts.length,
        data: {
            shifts,
            shiftExempt: req.user.shiftExempt,
            activeShiftOverrideUntil: req.user.activeShiftOverrideUntil,
        },
    });
});

// Admin / Clinicians list all shifts (supports date range for roster calendar)
const getAllShifts = catchAsync(async (req, res, next) => {
    const { userId, date, startDate, endDate, status, wardZone } = req.query;
    const filter = {};

    if (userId) filter.user = userId;
    if (status) filter.status = status;
    if (wardZone) filter.wardZone = wardZone;

    if (startDate && endDate) {
        filter.shiftDate = {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
    } else if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        filter.shiftDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const shifts = await ShiftSchedule.find(filter)
        .populate("user", "userId name role email shiftExempt activeShiftOverrideUntil")
        .populate("assignedBy", "userId name")
        .populate("handoverToUser", "userId name role")
        .sort({ startTime: 1 });

    res.status(200).json({
        success: true,
        count: shifts.length,
        data: { shifts },
    });
});

// Admin creates/assigns a shift
const createShift = catchAsync(async (req, res, next) => {
    const {
        user: targetUserId,
        shiftDate,
        shiftType,
        startTime,
        endTime,
        wardZone,
        dutyRole,
        gracePeriodMinutes,
        notes,
    } = req.body;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        return next(new AppError("Target doctor/staff member not found", 404));
    }

    const shift = await ShiftSchedule.create({
        user: targetUserId,
        shiftDate,
        shiftType,
        startTime,
        endTime,
        wardZone: wardZone || "General Pediatric Ward",
        dutyRole: dutyRole || targetUser.role,
        gracePeriodMinutes: gracePeriodMinutes || 45,
        assignedBy: req.user._id,
        notes,
    });

    await logAudit({
        req,
        action: "CREATE_SHIFT",
        entity: "ShiftSchedule",
        entityId: shift._id,
        newValue: {
            user: targetUser.userId,
            userName: targetUser.name,
            shiftType,
            wardZone: shift.wardZone,
            startTime,
            endTime,
        },
    });

    res.status(201).json({
        success: true,
        message: `Shift assigned to ${targetUser.name} (${targetUser.userId})`,
        data: { shift },
    });
});

// Admin updates a shift
const updateShift = catchAsync(async (req, res, next) => {
    const shift = await ShiftSchedule.findById(req.params.id);
    if (!shift) {
        return next(new AppError("Shift not found", 404));
    }

    const previousValue = {
        shiftType: shift.shiftType,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
        wardZone: shift.wardZone,
    };

    Object.assign(shift, req.body);
    await shift.save();

    await logAudit({
        req,
        action: "UPDATE_SHIFT",
        entity: "ShiftSchedule",
        entityId: shift._id,
        previousValue,
        newValue: {
            shiftType: shift.shiftType,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: shift.status,
            wardZone: shift.wardZone,
        },
    });

    res.status(200).json({
        success: true,
        message: "Shift updated successfully",
        data: { shift },
    });
});

// Admin deletes a shift
const deleteShift = catchAsync(async (req, res, next) => {
    const shift = await ShiftSchedule.findById(req.params.id).populate("user", "name userId");
    if (!shift) {
        return next(new AppError("Shift not found", 404));
    }

    await ShiftSchedule.findByIdAndDelete(req.params.id);

    await logAudit({
        req,
        action: "DELETE_SHIFT",
        entity: "ShiftSchedule",
        entityId: req.params.id,
        previousValue: {
            doctor: shift.user?.name,
            shiftType: shift.shiftType,
            startTime: shift.startTime,
        },
    });

    res.status(200).json({
        success: true,
        message: "Shift deleted successfully",
    });
});

// Admin downloads official Excel template
const downloadExcelTemplate = catchAsync(async (req, res, next) => {
    const excelBuffer = await generateShiftExcelTemplate();

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        "attachment; filename=pediatric_shift_roster_template.xlsx"
    );
    res.send(excelBuffer);
});

// Admin uploads and parses Excel shift sheet
const uploadExcelShifts = catchAsync(async (req, res, next) => {
    if (!req.file) {
        return next(new AppError("Please upload an Excel (.xlsx, .xls) or .csv file", 400));
    }

    const { confirm } = req.body;
    const parsedResult = await parseAndValidateExcel(req.file.buffer);

    // If confirm is true and there are valid rows, commit immediately
    if (confirm === "true" || confirm === true) {
        if (parsedResult.validCount === 0) {
            return next(new AppError("Cannot commit: No valid shift rows found in sheet", 400));
        }

        const inserted = await commitImportedShifts(parsedResult.previewRows, req.user._id);

        await logAudit({
            req,
            action: "EXCEL_ROSTER_IMPORT",
            entity: "ShiftSchedule",
            entityId: req.user._id,
            newValue: {
                totalImported: inserted.length,
                fileName: req.file.originalname,
            },
        });

        return res.status(201).json({
            success: true,
            message: `Successfully imported ${inserted.length} shifts into the roster!`,
            data: {
                importedCount: inserted.length,
                warningCount: parsedResult.warningCount,
                warnings: parsedResult.warnings,
            },
        });
    }

    // Otherwise, return validation preview for Admin review
    res.status(200).json({
        success: true,
        message: "Excel roster parsed successfully for review",
        data: parsedResult,
    });
});

// Commit pre-validated rows (when Admin previews first, then clicks Confirm)
const commitValidatedShifts = catchAsync(async (req, res, next) => {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return next(new AppError("No validated shift rows provided for import", 400));
    }

    const inserted = await commitImportedShifts(rows, req.user._id);

    await logAudit({
        req,
        action: "EXCEL_ROSTER_IMPORT",
        entity: "ShiftSchedule",
        entityId: req.user._id,
        newValue: {
            totalImported: inserted.length,
        },
    });

    res.status(201).json({
        success: true,
        message: `Successfully imported ${inserted.length} shifts into the schedule!`,
        data: {
            importedCount: inserted.length,
        },
    });
});

// Doctor/Nurse Check-in to active shift
const checkInShift = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const shift = await ShiftSchedule.findOne({ _id: id, user: req.user._id });

    if (!shift) {
        return next(new AppError("Shift not found or does not belong to you", 404));
    }

    shift.checkInTime = new Date();
    shift.status = "Active";
    await shift.save();

    await logAudit({
        req,
        action: "SHIFT_CHECK_IN",
        entity: "ShiftSchedule",
        entityId: shift._id,
        newValue: { checkInTime: shift.checkInTime },
    });

    res.status(200).json({
        success: true,
        message: `Checked in to ${shift.shiftType} shift successfully at ${shift.checkInTime.toLocaleTimeString()}`,
        data: { shift },
    });
});

// Doctor/Nurse Check-out after handover
const checkOutShift = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { handoverToUserId } = req.body;
    const shift = await ShiftSchedule.findOne({ _id: id, user: req.user._id });

    if (!shift) {
        return next(new AppError("Shift not found or does not belong to you", 404));
    }

    shift.checkOutTime = new Date();
    shift.status = "Completed";
    if (handoverToUserId) {
        shift.handoverToUser = handoverToUserId;
        shift.shiftHandoverStatus = "Completed";
    }
    await shift.save();

    await logAudit({
        req,
        action: "SHIFT_CHECK_OUT",
        entity: "ShiftSchedule",
        entityId: shift._id,
        newValue: {
            checkOutTime: shift.checkOutTime,
            handoverToUser: handoverToUserId,
        },
    });

    res.status(200).json({
        success: true,
        message: "Checked out of shift successfully. Handover recorded.",
        data: { shift },
    });
});

// Request a Shift Swap with another clinician
const requestShiftSwap = catchAsync(async (req, res, next) => {
    const { originalShiftId, targetUserId, reason } = req.body;

    const originalShift = await ShiftSchedule.findOne({ _id: originalShiftId, user: req.user._id });
    if (!originalShift) {
        return next(new AppError("Shift not found or does not belong to you", 404));
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        return next(new AppError("Target colleague not found", 404));
    }

    const swapRequest = await ShiftSwapRequest.create({
        originalShift: originalShift._id,
        requestingUser: req.user._id,
        targetUser: targetUserId,
        reason,
        status: "Pending_Approval",
    });

    await logAudit({
        req,
        action: "REQUEST_SHIFT_SWAP",
        entity: "ShiftSwapRequest",
        entityId: swapRequest._id,
        newValue: {
            originalShift: originalShift._id,
            targetDoctor: targetUser.name,
            reason,
        },
    });

    res.status(201).json({
        success: true,
        message: `Shift swap request sent to ${targetUser.name} and submitted for administrative review.`,
        data: { swapRequest },
    });
});

// List Shift Swap Requests
const listShiftSwaps = catchAsync(async (req, res, next) => {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // Clinicians see their own requests; Admin sees all
    if (req.user.role !== "Admin") {
        filter.$or = [{ requestingUser: req.user._id }, { targetUser: req.user._id }];
    }

    const swaps = await ShiftSwapRequest.find(filter)
        .populate("originalShift")
        .populate("requestingUser", "userId name role email")
        .populate("targetUser", "userId name role email")
        .populate("reviewedBy", "userId name")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: swaps.length,
        data: { swaps },
    });
});

// Admin approves or rejects Shift Swap Request
const reviewShiftSwap = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const swap = await ShiftSwapRequest.findById(id).populate("originalShift");
    if (!swap) {
        return next(new AppError("Swap request not found", 404));
    }

    swap.status = status;
    swap.reviewedBy = req.user._id;
    swap.reviewedAt = new Date();
    if (adminNotes) swap.adminNotes = adminNotes;
    await swap.save();

    // If approved, update shift assignment to target user
    if (status === "Approved" && swap.originalShift) {
        const shift = await ShiftSchedule.findById(swap.originalShift._id);
        if (shift) {
            shift.user = swap.targetUser;
            shift.notes = (shift.notes ? shift.notes + " | " : "") + `Swapped from previous doctor (Approved by Admin)`;
            await shift.save();
        }
    }

    await logAudit({
        req,
        action: `${status.toUpperCase()}_SHIFT_SWAP`,
        entity: "ShiftSwapRequest",
        entityId: swap._id,
        newValue: { status, adminNotes },
    });

    res.status(200).json({
        success: true,
        message: `Shift swap has been ${status.toLowerCase()}`,
        data: { swap },
    });
});

// Admin grants emergency temporary shift override to a doctor
const grantShiftOverride = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { overrideHours, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    const overrideExpiry = new Date(Date.now() + overrideHours * 60 * 60 * 1000);
    const previousOverride = user.activeShiftOverrideUntil;

    user.activeShiftOverrideUntil = overrideExpiry;
    await user.save({ validateBeforeSave: false });

    await logAudit({
        req,
        action: "GRANT_SHIFT_OVERRIDE",
        entity: "User",
        entityId: user._id,
        previousValue: { activeShiftOverrideUntil: previousOverride },
        newValue: {
            activeShiftOverrideUntil: overrideExpiry,
            overrideHours,
            reason,
        },
    });

    res.status(200).json({
        success: true,
        message: `Emergency shift access granted to ${user.name} (${user.userId}) for ${overrideHours} hours until ${overrideExpiry.toLocaleTimeString()}`,
        data: {
            user: {
                _id: user._id,
                userId: user.userId,
                name: user.name,
                activeShiftOverrideUntil: user.activeShiftOverrideUntil,
            },
        },
    });
});

// Admin toggles shift exemption
const toggleShiftExemption = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { shiftExempt } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    const previousValue = { shiftExempt: user.shiftExempt };
    user.shiftExempt = shiftExempt;
    await user.save({ validateBeforeSave: false });

    await logAudit({
        req,
        action: "TOGGLE_SHIFT_EXEMPTION",
        entity: "User",
        entityId: user._id,
        previousValue,
        newValue: { shiftExempt: user.shiftExempt },
    });

    res.status(200).json({
        success: true,
        message: `Shift exemption for ${user.name} (${user.userId}) set to ${shiftExempt}`,
        data: {
            user: {
                _id: user._id,
                userId: user.userId,
                name: user.name,
                shiftExempt: user.shiftExempt,
            },
        },
    });
});

module.exports = {
    getMyShifts,
    getAllShifts,
    createShift,
    updateShift,
    deleteShift,
    downloadExcelTemplate,
    uploadExcelShifts,
    commitValidatedShifts,
    checkInShift,
    checkOutShift,
    requestShiftSwap,
    listShiftSwaps,
    reviewShiftSwap,
    grantShiftOverride,
    toggleShiftExemption,
};
