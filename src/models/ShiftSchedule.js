const mongoose = require("mongoose");

const shiftScheduleSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Staff member is required for shift schedule"],
            index: true,
        },
        shiftDate: {
            type: Date,
            required: [true, "Shift date is required"],
            index: true,
        },
        shiftType: {
            type: String,
            enum: ["Morning", "Evening", "Night", "Custom", "On-Call"],
            required: [true, "Shift type is required"],
        },
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },
        gracePeriodMinutes: {
            type: Number,
            default: 45, // 45 minutes handover buffer before and after shift
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        wardZone: {
            type: String,
            default: "General Pediatric Ward",
            enum: ["General Pediatric Ward", "Pediatric HDU", "Isolation Unit", "Neonatal Nursery", "Emergency Peds"],
        },
        dutyRole: {
            type: String,
            trim: true,
        },
        checkInTime: {
            type: Date,
        },
        checkOutTime: {
            type: Date,
        },
        handoverToUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        shiftHandoverStatus: {
            type: String,
            enum: ["Pending", "In_Progress", "Completed", "Bypassed"],
            default: "Pending",
        },
        source: {
            type: String,
            enum: ["Manual", "Excel_Import"],
            default: "Manual",
        },
        status: {
            type: String,
            enum: ["Scheduled", "Active", "Completed", "Cancelled"],
            default: "Scheduled",
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

shiftScheduleSchema.index({ user: 1, startTime: 1, endTime: 1 });
shiftScheduleSchema.index({ shiftDate: 1, shiftType: 1 });

const ShiftSchedule = mongoose.model("ShiftSchedule", shiftScheduleSchema);

module.exports = ShiftSchedule;
