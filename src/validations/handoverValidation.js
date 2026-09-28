const Joi = require("joi");
const { HANDOVER_STATUSES } = require("../models/HandoverRecord");

const createHandoverSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        toDoctor: Joi.string().hex().length(24),
        shiftType: Joi.string().valid("Morning to Evening", "Evening to Night", "Night to Morning").required(),
        status: Joi.string().valid(...HANDOVER_STATUSES).required(),
        customNotes: Joi.string().allow(""),
    }),
};

const acknowledgeHandoverSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
};

module.exports = {
    createHandoverSchema,
    acknowledgeHandoverSchema,
};
