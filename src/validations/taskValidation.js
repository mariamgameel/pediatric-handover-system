const Joi = require("joi");

const createTaskSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        description: Joi.string().trim().required(),
        priority: Joi.string().valid("Routine", "Urgent", "Critical").default("Routine"),
        dueAt: Joi.date().iso().required(),
        assignedTo: Joi.string().hex().length(24),
    }),
};

const updateTaskStatusSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        status: Joi.string().valid("Pending", "In Progress", "Completed", "Cancelled").required(),
        completionNotes: Joi.string().allow(""),
    }),
};

module.exports = {
    createTaskSchema,
    updateTaskStatusSchema,
};
