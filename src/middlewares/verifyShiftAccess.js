const ShiftSchedule = require("../models/ShiftSchedule");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const verifyShiftAccess = catchAsync(async (req, res, next) => {
    // 1. Must have an authenticated user
    if (!req.user) {
        return next(new AppError("Not authenticated", 401));
    }

    // 2. Admins are permanently exempt from shift lockout
    if (req.user.role === "Admin") {
        return next();
    }

    // 3. User is designated as shift-exempt (e.g. senior consultant / head of department)
    if (req.user.shiftExempt === true) {
        return next();
    }

    // 4. Temporary emergency override granted by Admin
    if (req.user.activeShiftOverrideUntil && new Date(req.user.activeShiftOverrideUntil) > new Date()) {
        return next();
    }

    // 5. Check if current time falls within scheduled shift +/- grace period
    const now = new Date();

    // Query active shifts for this user for today/now
    // Buffer query: we search for shifts where startTime - buffer <= now and endTime + buffer >= now
    // Since gracePeriodMinutes can vary, we search shifts covering today or overlapping +- 2 hours and check in code
    const candidateShifts = await ShiftSchedule.find({
        user: req.user._id,
        status: { $ne: "Cancelled" },
        startTime: { $lte: new Date(now.getTime() + 120 * 60 * 1000) }, // started or starting within 2h
        endTime: { $gte: new Date(now.getTime() - 120 * 60 * 1000) },   // ended or ending within 2h
    });

    const hasActiveShift = candidateShifts.some((shift) => {
        const graceMs = (shift.gracePeriodMinutes || 45) * 60 * 1000;
        const shiftStart = new Date(shift.startTime).getTime() - graceMs;
        const shiftEnd = new Date(shift.endTime).getTime() + graceMs;
        const currentMs = now.getTime();
        return currentMs >= shiftStart && currentMs <= shiftEnd;
    });

    if (hasActiveShift) {
        return next();
    }

    return res.status(403).json({
        success: false,
        code: "SHIFT_ACCESS_BLOCKED",
        message: "Access restricted: You do not have an active scheduled shift at this time. Handover and patient records are only accessible during your assigned shift hours. Please contact the administrator for an emergency override.",
    });
});

module.exports = verifyShiftAccess;
