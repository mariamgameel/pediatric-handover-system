const mongoose = require("mongoose");

const vitalSignSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        temperature: {
            type: Number, // °C
        },
        heartRate: {
            type: Number, // bpm
        },
        respiratoryRate: {
            type: Number, // breaths per min
        },
        bloodPressure: {
            systolic: { type: Number },
            diastolic: { type: Number },
        },
        spO2: {
            type: Number, // %
            min: 0,
            max: 100,
        },
        gcs: {
            type: Number, // 3 - 15
            min: 3,
            max: 15,
        },
        weight: {
            type: Number, // kg
        },
        oxygenSupport: {
            mode: {
                type: String,
                enum: [
                    "Room Air",
                    "Nasal Cannula",
                    "Face Mask",
                    "Non-Rebreather Mask",
                    "High Flow Nasal Cannula",
                    "CPAP/BiPAP",
                    "Mechanical Ventilation",
                ],
                default: "Room Air",
            },
            flowRate: { type: Number, default: 0 }, // L/min
            fiO2: { type: Number, default: 21 }, // %
        },
        ivFluids: {
            type: String,
            trim: true,
        },
        devices: {
            type: [String],
            default: [],
        },
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recording clinician is required"],
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

vitalSignSchema.index({ patient: 1, recordedAt: -1 });

const VitalSign = mongoose.model("VitalSign", vitalSignSchema);

module.exports = VitalSign;
