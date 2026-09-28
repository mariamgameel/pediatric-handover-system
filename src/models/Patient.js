const mongoose = require("mongoose");

const CRITICAL_REASONS = [
    "respiratory distress",
    "increased O2 requirement",
    "persistent desaturation",
    "altered consciousness",
    "convulsions",
    "poor perfusion",
    "persistent hypotension",
    "other",
];

const patientSchema = new mongoose.Schema(
    {
        patientId: {
            type: String,
            required: [true, "Patient ID is required (e.g. PED-2026-001)"],
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        fileNumber: {
            type: String,
            required: [true, "Hospital File Number is required"],
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, "Patient name is required"],
            trim: true,
            index: true,
        },
        age: {
            years: { type: Number, default: 0 },
            months: { type: Number, default: 0 },
            days: { type: Number, default: 0 },
        },
        weight: {
            type: Number,
            required: [true, "Patient weight (kg) is required"],
            min: [0.3, "Weight must be at least 0.3 kg"],
        },
        bedNumber: {
            type: String,
            required: [true, "Bed number is required"],
            trim: true,
            index: true,
        },
        admissionDate: {
            type: Date,
            default: Date.now,
        },
        mainDiagnosis: {
            type: String,
            required: [true, "Main diagnosis is required"],
            trim: true,
        },
        associatedDiagnoses: {
            type: [String],
            default: [],
        },
        allergies: {
            type: [String],
            default: ["NKDA"],
        },
        status: {
            type: String,
            enum: ["Stable", "Close Monitoring", "Critical"],
            default: "Stable",
            index: true,
        },
        statusReason: {
            type: String,
            enum: CRITICAL_REASONS,
            required: function () {
                return this.status === "Critical";
            },
        },
        statusReasonOther: {
            type: String,
            trim: true,
            required: function () {
                return this.status === "Critical" && this.statusReason === "other";
            },
        },
        dischargeStatus: {
            isDischarged: { type: Boolean, default: false, index: true },
            outcome: {
                type: String,
                enum: ["Discharged", "Transferred", "Referred", "Other"],
            },
            date: { type: Date },
            summaryNotes: { type: String, trim: true },
            dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
        statusHistory: [
            {
                status: { type: String, required: true },
                reason: { type: String },
                reasonOther: { type: String },
                updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                updatedAt: { type: Date, default: Date.now },
            },
        ],
        responsibleDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

patientSchema.index({ name: "text", patientId: "text", fileNumber: "text", bedNumber: "text" });

const Patient = mongoose.model("Patient", patientSchema);

module.exports = {
    Patient,
    CRITICAL_REASONS,
};
