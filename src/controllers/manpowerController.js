const StaffProfile = require("../models/StaffProfile");
const User = require("../models/User");
const ShiftSchedule = require("../models/ShiftSchedule");
const StaffLeave = require("../models/StaffLeave");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

// List all staff profiles in the pediatric manpower database
const getStaffProfiles = catchAsync(async (req, res, next) => {
    const { clinicalGrade, activeStatus, ward, search } = req.query;
    const filter = {};

    if (clinicalGrade) filter.clinicalGrade = clinicalGrade;
    if (activeStatus) filter.activeStatus = activeStatus;
    if (ward) filter.defaultWard = ward;

    let profiles = await StaffProfile.find(filter)
        .populate("user", "userId name email role status shiftExempt")
        .sort({ clinicalGrade: 1, staffCode: 1 });

    if (search) {
        const query = search.toLowerCase();
        profiles = profiles.filter((p) => {
            const userName = p.user?.name?.toLowerCase() || "";
            const staffId = p.user?.userId?.toLowerCase() || "";
            const code = p.staffCode?.toLowerCase() || "";
            const bleep = p.bleepNumber?.toLowerCase() || "";
            const subspecialty = p.pediatricSubspecialty?.toLowerCase() || "";
            return (
                userName.includes(query) ||
                staffId.includes(query) ||
                code.includes(query) ||
                bleep.includes(query) ||
                subspecialty.includes(query)
            );
        });
    }

    res.status(200).json({
        success: true,
        count: profiles.length,
        data: { profiles },
    });
});

// Get a single staff profile
const getStaffProfileById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const profile = await StaffProfile.findById(id).populate(
        "user",
        "userId name email role status shiftExempt"
    );

    if (!profile) {
        return next(new AppError("Staff profile not found", 404));
    }

    res.status(200).json({
        success: true,
        data: { profile },
    });
});

// Admin creates or links a new staff profile
const createStaffProfile = catchAsync(async (req, res, next) => {
    const {
        user: userId,
        staffCode,
        clinicalGrade,
        pediatricSubspecialty,
        bleepNumber,
        phoneExtension,
        emergencyContact,
        certifications,
        defaultWard,
        maxConsecutiveNights,
        activeStatus,
    } = req.body;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        return next(new AppError("Associated user account not found", 404));
    }

    const existingProfile = await StaffProfile.findOne({
        $or: [{ user: userId }, { staffCode: staffCode.toUpperCase() }],
    });
    if (existingProfile) {
        return next(new AppError("A profile already exists for this user or staff code", 400));
    }

    const profile = await StaffProfile.create({
        user: userId,
        staffCode: staffCode.toUpperCase(),
        clinicalGrade,
        pediatricSubspecialty,
        bleepNumber,
        phoneExtension,
        emergencyContact,
        certifications: certifications || [],
        defaultWard: defaultWard || "General Pediatric Ward",
        maxConsecutiveNights: maxConsecutiveNights || 3,
        activeStatus: activeStatus || "Active",
    });

    await logAudit({
        req,
        action: "CREATE_STAFF_PROFILE",
        entity: "StaffProfile",
        entityId: profile._id,
        newValue: {
            staffCode: profile.staffCode,
            userName: targetUser.name,
            clinicalGrade: profile.clinicalGrade,
            bleepNumber: profile.bleepNumber,
        },
    });

    res.status(201).json({
        success: true,
        message: `Staff profile created for ${targetUser.name}`,
        data: { profile },
    });
});

// Admin updates staff profile
const updateStaffProfile = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const profile = await StaffProfile.findById(id).populate("user", "name userId");

    if (!profile) {
        return next(new AppError("Staff profile not found", 404));
    }

    const previousValue = {
        clinicalGrade: profile.clinicalGrade,
        bleepNumber: profile.bleepNumber,
        defaultWard: profile.defaultWard,
        activeStatus: profile.activeStatus,
    };

    Object.assign(profile, req.body);
    await profile.save();

    await logAudit({
        req,
        action: "UPDATE_STAFF_PROFILE",
        entity: "StaffProfile",
        entityId: profile._id,
        previousValue,
        newValue: {
            clinicalGrade: profile.clinicalGrade,
            bleepNumber: profile.bleepNumber,
            defaultWard: profile.defaultWard,
            activeStatus: profile.activeStatus,
        },
    });

    res.status(200).json({
        success: true,
        message: "Staff profile updated successfully",
        data: { profile },
    });
});

// Admin deletes staff profile
const deleteStaffProfile = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const profile = await StaffProfile.findById(id);

    if (!profile) {
        return next(new AppError("Staff profile not found", 404));
    }

    await StaffProfile.findByIdAndDelete(id);

    await logAudit({
        req,
        action: "DELETE_STAFF_PROFILE",
        entity: "StaffProfile",
        entityId: id,
        previousValue: {
            staffCode: profile.staffCode,
            clinicalGrade: profile.clinicalGrade,
        },
    });

    res.status(200).json({
        success: true,
        message: "Staff profile deleted successfully",
    });
});

// Real-Time Ward Coverage & Safe Staffing Ratio Engine
const getLiveWardCoverage = catchAsync(async (req, res, next) => {
    const now = new Date();

    // 1. Find shifts active at this exact moment (with grace period)
    const activeShifts = await ShiftSchedule.find({
        status: { $ne: "Cancelled" },
        startTime: { $lte: new Date(now.getTime() + 45 * 60 * 1000) },
        endTime: { $gte: new Date(now.getTime() - 45 * 60 * 1000) },
    }).populate("user", "userId name email role shiftExempt");

    // 2. Fetch staff profile bleeps for active doctors/nurses
    const userIds = activeShifts.map((s) => s.user?._id).filter(Boolean);
    const profiles = await StaffProfile.find({ user: { $in: userIds } }).lean();
    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(String(p.user), p));

    // Categorize by duty roles
    let consultants = [];
    let specialists = [];
    let residents = [];
    let nurses = [];

    activeShifts.forEach((s) => {
        const u = s.user;
        if (!u) return;
        const prof = profileMap.get(String(u._id));
        const item = {
            shiftId: s._id,
            userId: u._id,
            staffId: u.userId,
            name: u.name,
            role: u.role,
            dutyRole: s.dutyRole || u.role,
            wardZone: s.wardZone || "General Pediatric Ward",
            shiftType: s.shiftType,
            bleepNumber: prof?.bleepNumber || "N/A",
            phoneExtension: prof?.phoneExtension || "N/A",
            checkedIn: !!s.checkInTime,
        };

        const dutyLower = (s.dutyRole || "").toLowerCase();
        const gradeLower = (prof?.clinicalGrade || "").toLowerCase();
        const roleLower = (u.role || "").toLowerCase();
        const idLower = (u.userId || "").toLowerCase();

        if (dutyLower.includes("nurse") || gradeLower.includes("nurse") || idLower.startsWith("nur")) {
            nurses.push(item);
        } else if (roleLower.includes("consultant") || dutyLower.includes("consultant")) {
            consultants.push(item);
        } else if (roleLower.includes("specialist") || dutyLower.includes("specialist")) {
            specialists.push(item);
        } else {
            residents.push(item);
        }
    });

    // 3. Current active inpatient census
    const activePatientsCount = await Patient.countDocuments({
        "dischargeStatus.isDischarged": { $ne: true },
    });
    const criticalPatientsCount = await Patient.countDocuments({
        "dischargeStatus.isDischarged": { $ne: true },
        status: { $in: ["Critical", "Close Monitoring", "Close_Monitoring"] },
    });

    // 4. Calculate Staffing Ratios
    const totalNurses = nurses.length;
    const totalDoctors = consultants.length + specialists.length + residents.length;

    // Nurse-to-patient ratio: patients per nurse
    const nurseRatioValue = totalNurses > 0 ? (activePatientsCount / totalNurses).toFixed(1) : 0;
    const doctorRatioValue = totalDoctors > 0 ? (activePatientsCount / totalDoctors).toFixed(1) : 0;

    // Safety status indicator
    let nurseRatioStatus = "Safe"; // Safe (<=4), Caution (5-6), Deficit (>6 or 0 nurses)
    if (totalNurses === 0 && activePatientsCount > 0) {
        nurseRatioStatus = "Critical Deficit (No Nurse on Duty)";
    } else if (nurseRatioValue > 6) {
        nurseRatioStatus = "Critical Deficit (> 1:6)";
    } else if (nurseRatioValue > 4) {
        nurseRatioStatus = "Staffing Caution (1:" + nurseRatioValue + ")";
    }

    res.status(200).json({
        success: true,
        data: {
            timestamp: now,
            wardCensus: {
                totalActivePatients: activePatientsCount,
                criticalPatients: criticalPatientsCount,
            },
            coverageCounts: {
                totalDoctors,
                totalNurses,
                consultantsCount: consultants.length,
                specialistsCount: specialists.length,
                residentsCount: residents.length,
            },
            staffingRatios: {
                nurseToPatient: totalNurses > 0 ? `1 : ${nurseRatioValue}` : "N/A (0 Nurses)",
                doctorToPatient: totalDoctors > 0 ? `1 : ${doctorRatioValue}` : "N/A",
                nurseRatioStatus,
                isSafe: nurseRatioStatus === "Safe",
            },
            onDutyStaff: {
                consultants,
                specialists,
                residents,
                nurses,
            },
        },
    });
});

// Leave Management
const getLeaves = catchAsync(async (req, res, next) => {
    const { status, userId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;

    const leaves = await StaffLeave.find(filter)
        .populate("user", "userId name email role")
        .populate("approvedBy", "userId name")
        .sort({ startDate: -1 });

    res.status(200).json({
        success: true,
        count: leaves.length,
        data: { leaves },
    });
});

const requestLeave = catchAsync(async (req, res, next) => {
    const { leaveType, startDate, endDate, notes } = req.body;

    const leave = await StaffLeave.create({
        user: req.user._id,
        leaveType,
        startDate,
        endDate,
        notes,
        status: "Pending",
    });

    await logAudit({
        req,
        action: "REQUEST_LEAVE",
        entity: "StaffLeave",
        entityId: leave._id,
        newValue: { leaveType, startDate, endDate },
    });

    res.status(201).json({
        success: true,
        message: "Leave request submitted for administrative review",
        data: { leave },
    });
});

const approveRejectLeave = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const leave = await StaffLeave.findById(id).populate("user", "name userId");
    if (!leave) {
        return next(new AppError("Leave request not found", 404));
    }

    leave.status = status;
    leave.approvedBy = req.user._id;
    if (notes) leave.notes = notes;
    await leave.save();

    await logAudit({
        req,
        action: `${status.toUpperCase()}_LEAVE`,
        entity: "StaffLeave",
        entityId: leave._id,
        newValue: { status, approvedBy: req.user.userId },
    });

    res.status(200).json({
        success: true,
        message: `Leave request has been ${status.toLowerCase()} successfully`,
        data: { leave },
    });
});

module.exports = {
    getStaffProfiles,
    getStaffProfileById,
    createStaffProfile,
    updateStaffProfile,
    deleteStaffProfile,
    getLiveWardCoverage,
    getLeaves,
    requestLeave,
    approveRejectLeave,
};
