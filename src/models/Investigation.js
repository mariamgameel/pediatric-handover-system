const mongoose = require("mongoose");

const investigationSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        name: {
            type: String,
            required: [true, "Investigation name is required (e.g. CBC, Blood Culture)"],
            trim: true,
        },
        type: {
            type: String,
            enum: ["Laboratory", "Radiology", "Microbiology", "Bedside", "Other"],
            required: [true, "Investigation type is required"],
        },
        status: {
            type: String,
            enum: ["Requested", "Pending", "Result Available", "Reviewed"],
            default: "Requested",
            index: true,
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        result: {
            type: String,
            trim: true,
        },
        resultAt: {
            type: Date,
        },
        isAbnormal: {
            type: Boolean,
            default: false,
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: {
            type: Date,
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

investigationSchema.index({ patient: 1, status: 1 });
investigationSchema.index({ status: 1, isAbnormal: 1 });

const Investigation = mongoose.model("Investigation", investigationSchema);

module.exports = Investigation;
