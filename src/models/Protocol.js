const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
    {
        stepNumber: {
            type: Number,
            required: true,
        },
        action: {
            type: String,
            required: true,
            trim: true,
        },
        roleRequired: {
            type: String,
            default: "Resident",
            trim: true,
        },
        targetTimeMinutes: {
            type: Number,
            default: 5,
        },
        isMandatory: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

const protocolSchema = new mongoose.Schema(
    {
        protocolCode: {
            type: String,
            required: [true, "Protocol code is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },
        title: {
            type: String,
            required: [true, "Protocol title is required"],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Protocol category is required"],
            enum: [
                "Deterioration_Escalation",
                "Resuscitation_CodeBlue",
                "Handover_SBAR",
                "Admission_Discharge",
                "Infection_Isolation",
                "Procedural_Safety",
            ],
            index: true,
        },
        priority: {
            type: String,
            enum: ["Routine", "Urgent", "Critical_Stat"],
            default: "Routine",
        },
        triggerConditions: {
            type: String,
            trim: true,
        },
        checklistItems: [checklistItemSchema],
        escalationRole: {
            type: String,
            default: "Specialist",
            trim: true,
        },
        status: {
            type: String,
            enum: ["Active", "Under_Review", "Archived"],
            default: "Active",
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

protocolSchema.index({ category: 1, status: 1 });

const Protocol = mongoose.model("Protocol", protocolSchema);

module.exports = Protocol;
