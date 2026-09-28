const ShiftSchedule = require("../models/ShiftSchedule");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

// Get shifts for the logged-in doctor
const getMyShifts = catchAsync(async (req, res, next) => {
    const shifts = await ShiftSchedule.find({
        user: req.user._id,
        status: { $ne: "Cancelled" },
    }).sort({ startTime: -1 }).limit(20);

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

// Admin lists all shifts
const getAllShifts = catchAsync(async (req, res, next) => {
    const { userId, date, status } = req.query;
    const filter = {};

    if (userId) filter.user = userId;
    if (status) filter.status = status;
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        filter.shiftDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const shifts = await ShiftSchedule.find(filter)
        .populate("user", "userId name role email shiftExempt activeShiftOverrideUntil")
        .populate("assignedBy", "userId name")
        .sort({ startTime: -1 });

    res.status(200).json({
        success: true,
        count: shifts.length,
        data: { shifts },
    });
});

// Admin creates/assigns a shift
const createShift = catchAsync(async (req, res, next) => {
    const { user: targetUserId, shiftDate, shiftType, startTime, endTime, gracePeriodMinutes, notes } = req.body;

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
        },
    });

    res.status(200).json({
        success: true,
        message: "Shift updated successfully",
        data: { shift },
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
    grantShiftOverride,
    toggleShiftExemption,
};
