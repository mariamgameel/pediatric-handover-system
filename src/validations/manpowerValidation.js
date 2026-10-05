const Joi = require("joi");

const certificationSchema = Joi.object({
    name: Joi.string().required(),
    validUntil: Joi.date().required(),
    certificateNumber: Joi.string().allow("", null),
});

const createStaffProfileSchema = {
    body: Joi.object({
        user: Joi.string().required(),
        staffCode: Joi.string().trim().uppercase().required(),
        clinicalGrade: Joi.string()
            .valid(
                "Consultant",
                "Associate_Specialist",
                "Senior_Registrar",
                "Resident_PGY3",
                "Resident_PGY1_2",
                "Nurse_Supervisor",
                "Staff_Nurse",
                "Clinical_Pharmacist"
            )
            .required(),
        pediatricSubspecialty: Joi.string().trim().allow("", null),
        bleepNumber: Joi.string().trim().allow("", null),
        phoneExtension: Joi.string().trim().allow("", null),
        emergencyContact: Joi.string().trim().allow("", null),
        certifications: Joi.array().items(certificationSchema).default([]),
        defaultWard: Joi.string()
            .valid(
                "General Pediatric Ward",
                "Pediatric HDU",
                "Isolation Unit",
                "Neonatal Nursery",
                "Emergency Peds"
            )
            .default("General Pediatric Ward"),
        maxConsecutiveNights: Joi.number().integer().min(1).max(7).default(3),
        activeStatus: Joi.string().valid("Active", "On_Leave", "Inactive").default("Active"),
    }),
};

const updateStaffProfileSchema = {
    body: Joi.object({
        staffCode: Joi.string().trim().uppercase(),
        clinicalGrade: Joi.string().valid(
            "Consultant",
            "Associate_Specialist",
            "Senior_Registrar",
            "Resident_PGY3",
            "Resident_PGY1_2",
            "Nurse_Supervisor",
            "Staff_Nurse",
            "Clinical_Pharmacist"
        ),
        pediatricSubspecialty: Joi.string().trim().allow("", null),
        bleepNumber: Joi.string().trim().allow("", null),
        phoneExtension: Joi.string().trim().allow("", null),
        emergencyContact: Joi.string().trim().allow("", null),
        certifications: Joi.array().items(certificationSchema),
        defaultWard: Joi.string().valid(
            "General Pediatric Ward",
            "Pediatric HDU",
            "Isolation Unit",
            "Neonatal Nursery",
            "Emergency Peds"
        ),
        maxConsecutiveNights: Joi.number().integer().min(1).max(7),
        activeStatus: Joi.string().valid("Active", "On_Leave", "Inactive"),
    }).min(1),
};

const requestLeaveSchema = {
    body: Joi.object({
        leaveType: Joi.string()
            .valid("Annual", "Sick", "Study_Academic", "Compassionate", "Compensatory_Rest")
            .required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().greater(Joi.ref("startDate")).required(),
        notes: Joi.string().trim().allow("", null),
    }),
};

const reviewLeaveSchema = {
    body: Joi.object({
        status: Joi.string().valid("Approved", "Rejected").required(),
        notes: Joi.string().trim().allow("", null),
    }),
};

module.exports = {
    createStaffProfileSchema,
    updateStaffProfileSchema,
    requestLeaveSchema,
    reviewLeaveSchema,
};
