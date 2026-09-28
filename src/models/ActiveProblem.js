const mongoose = require("mongoose");

const activeProblemSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        title: {
            type: String,
            required: [true, "Problem title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["Active", "Resolved"],
            default: "Active",
            index: true,
        },
        resolutionInfo: {
            resolvedAt: { type: Date },
            resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            resolutionNote: { type: String, trim: true },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updates: [
            {
                note: { type: String, required: true },
                updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                updatedAt: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

activeProblemSchema.index({ patient: 1, status: 1, createdAt: -1 });

const ActiveProblem = mongoose.model("ActiveProblem", activeProblemSchema);

module.exports = ActiveProblem;
