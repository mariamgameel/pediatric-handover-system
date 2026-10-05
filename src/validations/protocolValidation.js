const Joi = require("joi");

const checklistItemSchema = Joi.object({
    stepNumber: Joi.number().integer().min(1).required(),
    action: Joi.string().trim().required(),
    roleRequired: Joi.string().default("Resident"),
    targetTimeMinutes: Joi.number().integer().min(1).default(5),
    isMandatory: Joi.boolean().default(true),
});

const createProtocolSchema = {
    body: Joi.object({
        protocolCode: Joi.string().trim().uppercase().required(),
        title: Joi.string().trim().min(3).required(),
        category: Joi.string()
            .valid(
                "Deterioration_Escalation",
                "Resuscitation_CodeBlue",
                "Handover_SBAR",
                "Admission_Discharge",
                "Infection_Isolation",
                "Procedural_Safety"
            )
            .required(),
        priority: Joi.string().valid("Routine", "Urgent", "Critical_Stat").default("Routine"),
        triggerConditions: Joi.string().trim().allow("", null),
        checklistItems: Joi.array().items(checklistItemSchema).min(1).required(),
        escalationRole: Joi.string().default("Specialist"),
        status: Joi.string().valid("Active", "Under_Review", "Archived").default("Active"),
    }),
};

const updateProtocolSchema = {
    body: Joi.object({
        protocolCode: Joi.string().trim().uppercase(),
        title: Joi.string().trim().min(3),
        category: Joi.string().valid(
            "Deterioration_Escalation",
            "Resuscitation_CodeBlue",
            "Handover_SBAR",
            "Admission_Discharge",
            "Infection_Isolation",
            "Procedural_Safety"
        ),
        priority: Joi.string().valid("Routine", "Urgent", "Critical_Stat"),
        triggerConditions: Joi.string().trim().allow("", null),
        checklistItems: Joi.array().items(checklistItemSchema).min(1),
        escalationRole: Joi.string(),
        status: Joi.string().valid("Active", "Under_Review", "Archived"),
    }).min(1),
};

const executeProtocolSchema = {
    body: Joi.object({
        patientId: Joi.string().required(),
        executedSteps: Joi.array()
            .items(
                Joi.object({
                    stepNumber: Joi.number().required(),
                    action: Joi.string().required(),
                    completed: Joi.boolean().required(),
                    notes: Joi.string().allow("", null),
                })
            )
            .required(),
        clinicalNotes: Joi.string().trim().allow("", null),
    }),
};

module.exports = {
    createProtocolSchema,
    updateProtocolSchema,
    executeProtocolSchema,
};
