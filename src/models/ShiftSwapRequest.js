const mongoose = require("mongoose");

const shiftSwapRequestSchema = new mongoose.Schema(
    {
        originalShift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ShiftSchedule",
            required: [true, "Original shift reference is required"],
        },
        requestingUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Requesting doctor/nurse is required"],
            index: true,
        },
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Target doctor/nurse is required"],
            index: true,
        },
        reason: {
            type: String,
            trim: true,
            required: [true, "Reason for swap request is required"],
        },
        status: {
            type: String,
            enum: ["Pending_Approval", "Approved", "Rejected", "Cancelled"],
            default: "Pending_Approval",
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: {
            type: Date,
        },
        adminNotes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

shiftSwapRequestSchema.index({ status: 1, requestingUser: 1, targetUser: 1 });

const ShiftSwapRequest = mongoose.model("ShiftSwapRequest", shiftSwapRequestSchema);

module.exports = ShiftSwapRequest;
