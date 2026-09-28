const mongoose = require("mongoose");

const patientViewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
            index: true,
        },
        lastViewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
    }
);

patientViewSchema.index({ user: 1, patient: 1 }, { unique: true });

const PatientView = mongoose.model("PatientView", patientViewSchema);

module.exports = PatientView;
