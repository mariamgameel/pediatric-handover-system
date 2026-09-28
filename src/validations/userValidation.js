const Joi = require("joi");
const { ALL_PERMISSIONS } = require("../config/permissions");

const loginSchema = {
    body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),
};

const createUserSchema = {
    body: Joi.object({
        userId: Joi.string().trim().uppercase().required().messages({
            "string.empty": "Unique Staff/User ID is required (e.g. DOC-101)",
        }),
        name: Joi.string().trim().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid("Resident", "Specialist", "Consultant", "Admin").default("Resident"),
        status: Joi.string().valid("Active", "Inactive").default("Active"),
        permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)),
        shiftExempt: Joi.boolean(),
    }),
};

const updateUserRoleSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        role: Joi.string().valid("Resident", "Specialist", "Consultant", "Admin").required(),
    }),
};

const updateUserPermissionsSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        permissions: Joi.array().items(Joi.string().valid(...ALL_PERMISSIONS)).required(),
    }),
};

const updateUserStatusSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        status: Joi.string().valid("Active", "Inactive").required(),
    }),
};

const resetPasswordSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        password: Joi.string().min(6).required(),
    }),
};

module.exports = {
    loginSchema,
    createUserSchema,
    updateUserRoleSchema,
    updateUserPermissionsSchema,
    updateUserStatusSchema,
    resetPasswordSchema,
};
