const mongoose = require("mongoose");

const ALERT_TYPES = [
    "critical patient",
    "important pending result",
    "overdue task",
    "clinical deterioration",
    "new consultant management plan",
    "other",
];

const alertSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        type: {
            type: String,
            enum: ALERT_TYPES,
            required: true,
            index: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "Medium",
            index: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        readAt: {
            type: Date,
        },
        relatedEvent: {
            entityType: { type: String },
            entityId: { type: mongoose.Schema.Types.ObjectId },
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: false,
    }
);

alertSchema.index({ isRead: 1, priority: 1, createdAt: -1 });

const Alert = mongoose.model("Alert", alertSchema);

module.exports = {
    Alert,
    ALERT_TYPES,
};
