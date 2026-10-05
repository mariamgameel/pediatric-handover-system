const Joi = require("joi");

const createShiftSchema = {
    body: Joi.object({
        user: Joi.string().required(),
        shiftDate: Joi.date().iso().required(),
        shiftType: Joi.string().valid("Morning", "Evening", "Night", "Custom", "On-Call").required(),
        startTime: Joi.date().iso().required(),
        endTime: Joi.date().iso().greater(Joi.ref("startTime")).required(),
        wardZone: Joi.string().valid(
            "General Pediatric Ward",
            "Pediatric HDU",
            "Isolation Unit",
            "Neonatal Nursery",
            "Emergency Peds"
        ).default("General Pediatric Ward"),
        dutyRole: Joi.string().allow("", null),
        gracePeriodMinutes: Joi.number().min(0).max(180).default(45),
        notes: Joi.string().allow("", null),
    }),
};

const updateShiftSchema = {
    params: Joi.object({
        id: Joi.string().required(),
    }),
    body: Joi.object({
        user: Joi.string(),
        shiftDate: Joi.date().iso(),
        shiftType: Joi.string().valid("Morning", "Evening", "Night", "Custom", "On-Call"),
        startTime: Joi.date().iso(),
        endTime: Joi.date().iso(),
        wardZone: Joi.string().valid(
            "General Pediatric Ward",
            "Pediatric HDU",
            "Isolation Unit",
            "Neonatal Nursery",
            "Emergency Peds"
        ),
        dutyRole: Joi.string().allow("", null),
        gracePeriodMinutes: Joi.number().min(0).max(180),
        status: Joi.string().valid("Scheduled", "Active", "Completed", "Cancelled"),
        notes: Joi.string().allow("", null),
    }),
};

const overrideShiftSchema = {
    params: Joi.object({
        userId: Joi.string().required(),
    }),
    body: Joi.object({
        overrideHours: Joi.number().min(0.5).max(72).default(4),
        reason: Joi.string().required(),
    }),
};

const toggleExemptionSchema = {
    params: Joi.object({
        userId: Joi.string().required(),
    }),
    body: Joi.object({
        shiftExempt: Joi.boolean().required(),
    }),
};

const requestSwapSchema = {
    body: Joi.object({
        originalShiftId: Joi.string().required(),
        targetUserId: Joi.string().required(),
        reason: Joi.string().trim().required(),
    }),
};

const reviewSwapSchema = {
    params: Joi.object({
        id: Joi.string().required(),
    }),
    body: Joi.object({
        status: Joi.string().valid("Approved", "Rejected").required(),
        adminNotes: Joi.string().allow("", null),
    }),
};

module.exports = {
    createShiftSchema,
    updateShiftSchema,
    overrideShiftSchema,
    toggleExemptionSchema,
    requestSwapSchema,
    reviewSwapSchema,
};
