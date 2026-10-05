const mongoose = require("mongoose");

const dosageFormulaSchema = new mongoose.Schema(
    {
        drug: {
            type: String,
            required: true,
            trim: true,
        },
        dose: {
            type: String,
            required: true,
            trim: true,
        },
        maxDose: {
            type: String,
            trim: true,
        },
        route: {
            type: String,
            default: "IV",
            trim: true,
        },
        frequency: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const guidelineSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Guideline title is required"],
            trim: true,
            unique: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Clinical category is required"],
            enum: [
                "Emergency_PICU",
                "Neonatology",
                "General_Pediatrics",
                "Respiratory",
                "Infectious_Disease",
                "Endocrinology_Metabolic",
                "Neurology",
                "Cardiology",
            ],
            index: true,
        },
        targetAgeGroup: {
            type: String,
            enum: ["Neonate_0_28d", "Infant_1_12m", "Child_1_12y", "Adolescent_12_18y", "All_Pediatric"],
            default: "All_Pediatric",
        },
        summary: {
            type: String,
            required: [true, "Guideline summary is required"],
            trim: true,
        },
        contentMarkdown: {
            type: String,
            required: [true, "Guideline content is required"],
        },
        dosageFormulas: [dosageFormulaSchema],
        references: [{ type: String, trim: true }],
        version: {
            type: String,
            default: "1.0",
        },
        status: {
            type: String,
            enum: ["Active", "Draft", "Archived"],
            default: "Active",
            index: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

guidelineSchema.index({ category: 1, status: 1 });
guidelineSchema.index({ title: "text", summary: "text", contentMarkdown: "text" });

const Guideline = mongoose.model("Guideline", guidelineSchema);

module.exports = Guideline;
