const mongoose = require("mongoose");

const staffLeaveSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Staff member is required"],
            index: true,
        },
        leaveType: {
            type: String,
            required: [true, "Leave type is required"],
            enum: ["Annual", "Sick", "Study_Academic", "Compassionate", "Compensatory_Rest"],
        },
        startDate: {
            type: Date,
            required: [true, "Start date is required"],
        },
        endDate: {
            type: Date,
            required: [true, "End date is required"],
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
            index: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

staffLeaveSchema.index({ user: 1, startDate: 1, endDate: 1 });

const StaffLeave = mongoose.model("StaffLeave", staffLeaveSchema);

module.exports = StaffLeave;
