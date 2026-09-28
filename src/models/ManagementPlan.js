const mongoose = require("mongoose");

const managementPlanSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        version: {
            type: Number,
            required: true,
            default: 1,
        },
        plan: {
            type: String,
            required: [true, "Management plan details are required"],
            trim: true,
        },
        recommendations: {
            type: String,
            trim: true,
        },
        clinicalReasoning: {
            type: String,
            trim: true,
        },
        medications: [
            {
                name: { type: String, required: true },
                dosage: { type: String, required: true },
                route: { type: String, default: "IV" },
                frequency: { type: String, required: true },
                isAntibiotic: { type: Boolean, default: false },
            },
        ],
        ivFluids: {
            type: String,
            trim: true,
        },
        oxygenSupport: {
            type: String,
            trim: true,
        },
        supportiveCare: {
            type: String,
            trim: true,
        },
        procedures: {
            type: [String],
            default: [],
        },
        isSuperseded: {
            type: Boolean,
            default: false,
            index: true,
        },
        supersededBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ManagementPlan",
        },
        authorRole: {
            type: String,
            enum: ["Specialist", "Consultant", "Admin"],
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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

managementPlanSchema.index({ patient: 1, version: -1 });

const ManagementPlan = mongoose.model("ManagementPlan", managementPlanSchema);

module.exports = ManagementPlan;
