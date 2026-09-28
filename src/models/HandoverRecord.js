const mongoose = require("mongoose");

const HANDOVER_STATUSES = [
    "Handed Over",
    "Needs Direct Discussion",
    "Critical — Verbal Handover Required",
];

const handoverRecordSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        fromDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        toDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        shiftType: {
            type: String,
            enum: ["Morning to Evening", "Evening to Night", "Night to Morning"],
            required: true,
        },
        handoverDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        status: {
            type: String,
            enum: HANDOVER_STATUSES,
            required: true,
            index: true,
        },
        autoSummarySnapshot: {
            patientStatus: String,
            statusReason: String,
            activeProblemsSummary: [String],
            currentManagementSummary: {
                plan: String,
                medications: Array,
                ivFluids: String,
                oxygenSupport: String,
            },
            latestVitals: Object,
            pendingInvestigations: [String],
            unreviewedResults: [String],
            pendingTasks: [String],
            warnings: [String],
        },
        customNotes: {
            type: String,
            trim: true,
        },
        acknowledged: {
            type: Boolean,
            default: false,
            index: true,
        },
        acknowledgedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        acknowledgedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

handoverRecordSchema.index({ patient: 1, handoverDate: -1 });

const HandoverRecord = mongoose.model("HandoverRecord", handoverRecordSchema);

module.exports = {
    HandoverRecord,
    HANDOVER_STATUSES,
};
