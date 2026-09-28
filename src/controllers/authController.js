const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ShiftSchedule = require("../models/ShiftSchedule");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });
};

const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
        return next(new AppError("Invalid email or password", 401));
    }

    if (user.status === "Inactive") {
        return next(new AppError("Your account is inactive. Please contact the administrator.", 403));
    }

    // Check shift status for doctors (Admin is always exempt)
    let shiftWarning = null;
    let isWithinShift = true;

    if (user.role !== "Admin" && !user.shiftExempt) {
        const now = new Date();
        const hasEmergencyOverride = user.activeShiftOverrideUntil && new Date(user.activeShiftOverrideUntil) > now;

        if (!hasEmergencyOverride) {
            const candidateShifts = await ShiftSchedule.find({
                user: user._id,
                status: { $ne: "Cancelled" },
                startTime: { $lte: new Date(now.getTime() + 120 * 60 * 1000) },
                endTime: { $gte: new Date(now.getTime() - 120 * 60 * 1000) },
            });

            isWithinShift = candidateShifts.some((shift) => {
                const graceMs = (shift.gracePeriodMinutes || 45) * 60 * 1000;
                const shiftStart = new Date(shift.startTime).getTime() - graceMs;
                const shiftEnd = new Date(shift.endTime).getTime() + graceMs;
                const currentMs = now.getTime();
                return currentMs >= shiftStart && currentMs <= shiftEnd;
            });

            if (!isWithinShift) {
                return res.status(403).json({
                    success: false,
                    code: "SHIFT_ACCESS_BLOCKED",
                    message: "Access restricted: You do not have an active scheduled shift at this time. Please contact the hospital administrator for a shift assignment or emergency override.",
                });
            }
        }
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    // Remove password from output
    user.password = undefined;

    // Log successful login audit
    await logAudit({
        req: { user, ip: req.ip },
        action: "USER_LOGIN",
        entity: "User",
        entityId: user._id,
        newValue: { lastLogin: user.lastLogin },
    });

    res.status(200).json({
        success: true,
        token,
        data: {
            user,
            shiftWarning,
        },
    });
});

const getMe = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user._id);

    // Also look up current or next shift
    const now = new Date();
    const currentShift = await ShiftSchedule.findOne({
        user: user._id,
        status: { $ne: "Cancelled" },
        startTime: { $lte: new Date(now.getTime() + 60 * 60 * 1000) },
        endTime: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
    }).sort({ startTime: -1 });

    res.status(200).json({
        success: true,
        data: {
            user,
            currentShift,
        },
    });
});

module.exports = {
    login,
    getMe,
};
