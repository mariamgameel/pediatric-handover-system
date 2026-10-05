const Joi = require("joi");

const dosageFormulaSchema = Joi.object({
    drug: Joi.string().required(),
    dose: Joi.string().required(),
    maxDose: Joi.string().allow("", null),
    route: Joi.string().default("IV"),
    frequency: Joi.string().allow("", null),
    notes: Joi.string().allow("", null),
});

const createGuidelineSchema = {
    body: Joi.object({
        title: Joi.string().trim().min(3).max(200).required(),
        category: Joi.string()
            .valid(
                "Emergency_PICU",
                "Neonatology",
                "General_Pediatrics",
                "Respiratory",
                "Infectious_Disease",
                "Endocrinology_Metabolic",
                "Neurology",
                "Cardiology"
            )
            .required(),
        targetAgeGroup: Joi.string()
            .valid("Neonate_0_28d", "Infant_1_12m", "Child_1_12y", "Adolescent_12_18y", "All_Pediatric")
            .default("All_Pediatric"),
        summary: Joi.string().trim().min(10).required(),
        contentMarkdown: Joi.string().min(20).required(),
        dosageFormulas: Joi.array().items(dosageFormulaSchema).default([]),
        references: Joi.array().items(Joi.string().trim()).default([]),
        version: Joi.string().default("1.0"),
        status: Joi.string().valid("Active", "Draft", "Archived").default("Active"),
    }),
};

const updateGuidelineSchema = {
    body: Joi.object({
        title: Joi.string().trim().min(3).max(200),
        category: Joi.string().valid(
            "Emergency_PICU",
            "Neonatology",
            "General_Pediatrics",
            "Respiratory",
            "Infectious_Disease",
            "Endocrinology_Metabolic",
            "Neurology",
            "Cardiology"
        ),
        targetAgeGroup: Joi.string().valid(
            "Neonate_0_28d",
            "Infant_1_12m",
            "Child_1_12y",
            "Adolescent_12_18y",
            "All_Pediatric"
        ),
        summary: Joi.string().trim().min(10),
        contentMarkdown: Joi.string().min(20),
        dosageFormulas: Joi.array().items(dosageFormulaSchema),
        references: Joi.array().items(Joi.string().trim()),
        version: Joi.string(),
        status: Joi.string().valid("Active", "Draft", "Archived"),
    }).min(1),
};

module.exports = {
    createGuidelineSchema,
    updateGuidelineSchema,
};
