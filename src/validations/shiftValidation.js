const Joi = require("joi");

const createShiftSchema = {
    body: Joi.object({
        user: Joi.string().hex().length(24).required(),
        shiftDate: Joi.date().iso().required(),
        shiftType: Joi.string().valid("Morning", "Evening", "Night", "Custom", "On-Call").required(),
        startTime: Joi.date().iso().required(),
        endTime: Joi.date().iso().greater(Joi.ref("startTime")).required(),
        gracePeriodMinutes: Joi.number().min(0).max(180).default(45),
        notes: Joi.string().allow(""),
    }),
};

const updateShiftSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        shiftDate: Joi.date().iso(),
        shiftType: Joi.string().valid("Morning", "Evening", "Night", "Custom", "On-Call"),
        startTime: Joi.date().iso(),
        endTime: Joi.date().iso(),
        gracePeriodMinutes: Joi.number().min(0).max(180),
        status: Joi.string().valid("Scheduled", "Active", "Completed", "Cancelled"),
        notes: Joi.string().allow(""),
    }),
};

const overrideShiftSchema = {
    params: Joi.object({
        userId: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        overrideHours: Joi.number().min(0.5).max(72).default(4),
        reason: Joi.string().required(),
    }),
};

const toggleExemptionSchema = {
    params: Joi.object({
        userId: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        shiftExempt: Joi.boolean().required(),
    }),
};

module.exports = {
    createShiftSchema,
    updateShiftSchema,
    overrideShiftSchema,
    toggleExemptionSchema,
};
