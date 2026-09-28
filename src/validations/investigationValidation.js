const Joi = require("joi");

const requestInvestigationSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        name: Joi.string().trim().required(),
        type: Joi.string().valid("Laboratory", "Radiology", "Microbiology", "Bedside", "Other").required(),
        notes: Joi.string().allow(""),
    }),
};

const recordResultSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        result: Joi.string().trim().required(),
        isAbnormal: Joi.boolean().default(false),
        notes: Joi.string().allow(""),
    }),
};

const reviewResultSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        notes: Joi.string().allow(""),
    }),
};

module.exports = {
    requestInvestigationSchema,
    recordResultSchema,
    reviewResultSchema,
};
