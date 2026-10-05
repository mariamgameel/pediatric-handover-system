const mongoose = require("mongoose");

const CLINICAL_UPDATE_TYPES = [
    "Clinical Change",
    "New Investigation",
    "New Result",
    "Treatment Change",
    "Consultation",
    "New Task",
    "Clinical Deterioration",
    "Clinical Protocol / SOP",
    "Other",
];

const clinicalUpdateSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        type: {
            type: String,
            enum: CLINICAL_UPDATE_TYPES,
            required: [true, "Clinical update type is required"],
            index: true,
        },
        details: {
            type: String,
            required: [true, "Clinical details are required"],
            trim: true,
        },
        severity: {
            type: String,
            enum: ["Routine", "Urgent", "Emergency"],
            default: "Routine",
        },
        isDeterioration: {
            type: Boolean,
            default: false,
            index: true,
        },
        deteriorationData: {
            triggerReason: { type: String, trim: true },
            escalationLevel: {
                type: String,
                enum: [
                    "Resident to Specialist",
                    "Specialist to Consultant",
                    "PICU Review Required",
                    "Emergency Code Team Called",
                ],
            },
            immediateActionTaken: { type: String, trim: true },
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recordedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: false,
    }
);

clinicalUpdateSchema.index({ patient: 1, recordedAt: -1 });

const ClinicalUpdate = mongoose.model("ClinicalUpdate", clinicalUpdateSchema);

module.exports = {
    ClinicalUpdate,
    CLINICAL_UPDATE_TYPES,
};
