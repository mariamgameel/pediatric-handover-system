const Joi = require("joi");
const { CRITICAL_REASONS } = require("../models/Patient");
const { CLINICAL_UPDATE_TYPES } = require("../models/ClinicalUpdate");

const createPatientSchema = {
    body: Joi.object({
        patientId: Joi.string().trim().uppercase().required(),
        fileNumber: Joi.string().trim().uppercase().required(),
        name: Joi.string().trim().required(),
        age: Joi.object({
            years: Joi.number().min(0).default(0),
            months: Joi.number().min(0).max(11).default(0),
            days: Joi.number().min(0).max(30).default(0),
        }).required(),
        weight: Joi.number().min(0.3).required(),
        bedNumber: Joi.string().trim().required(),
        admissionDate: Joi.date().iso().default(Date.now),
        mainDiagnosis: Joi.string().trim().required(),
        associatedDiagnoses: Joi.array().items(Joi.string().trim()),
        allergies: Joi.array().items(Joi.string().trim()).default(["NKDA"]),
        status: Joi.string().valid("Stable", "Close Monitoring", "Critical").default("Stable"),
        statusReason: Joi.when("status", {
            is: "Critical",
            then: Joi.string().valid(...CRITICAL_REASONS).required(),
            otherwise: Joi.string().valid(...CRITICAL_REASONS).allow(null, ""),
        }),
        statusReasonOther: Joi.when("statusReason", {
            is: "other",
            then: Joi.string().trim().required(),
            otherwise: Joi.string().allow(null, ""),
        }),
        responsibleDoctor: Joi.string().hex().length(24),
    }),
};

const updatePatientStatusSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        status: Joi.string().valid("Stable", "Close Monitoring", "Critical").required(),
        statusReason: Joi.when("status", {
            is: "Critical",
            then: Joi.string().valid(...CRITICAL_REASONS).required(),
            otherwise: Joi.string().valid(...CRITICAL_REASONS).allow(null, ""),
        }),
        statusReasonOther: Joi.when("statusReason", {
            is: "other",
            then: Joi.string().trim().required(),
            otherwise: Joi.string().allow(null, ""),
        }),
    }),
};

const dischargePatientSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        outcome: Joi.string().valid("Discharged", "Transferred", "Referred", "Other").required(),
        summaryNotes: Joi.string().trim().required(),
    }),
};

const createVitalSignSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        temperature: Joi.number().min(25).max(45),
        heartRate: Joi.number().min(30).max(300),
        respiratoryRate: Joi.number().min(5).max(120),
        bloodPressure: Joi.object({
            systolic: Joi.number().min(30).max(250),
            diastolic: Joi.number().min(15).max(150),
        }),
        spO2: Joi.number().min(0).max(100),
        gcs: Joi.number().min(3).max(15),
        weight: Joi.number().min(0.3),
        oxygenSupport: Joi.object({
            mode: Joi.string().valid(
                "Room Air",
                "Nasal Cannula",
                "Face Mask",
                "Non-Rebreather Mask",
                "High Flow Nasal Cannula",
                "CPAP/BiPAP",
                "Mechanical Ventilation"
            ),
            flowRate: Joi.number().min(0).max(60),
            fiO2: Joi.number().min(21).max(100),
        }),
        ivFluids: Joi.string().allow(""),
        devices: Joi.array().items(Joi.string()),
    }),
};

const createProblemSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        title: Joi.string().trim().required(),
        description: Joi.string().allow(""),
        startDate: Joi.date().iso().default(Date.now),
    }),
};

const resolveProblemSchema = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        resolutionNote: Joi.string().trim().required(),
    }),
};

const createClinicalUpdateSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        type: Joi.string().valid(...CLINICAL_UPDATE_TYPES).required(),
        details: Joi.string().trim().required(),
        severity: Joi.string().valid("Routine", "Urgent", "Emergency").default("Routine"),
    }),
};

const recordDeteriorationSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        triggerReason: Joi.string().trim().required(),
        escalationLevel: Joi.string().valid(
            "Resident to Specialist",
            "Specialist to Consultant",
            "PICU Review Required",
            "Emergency Code Team Called"
        ).required(),
        immediateActionTaken: Joi.string().trim().required(),
        setPatientCritical: Joi.boolean().default(true),
        criticalReason: Joi.string().valid(...CRITICAL_REASONS),
    }),
};

const createManagementPlanSchema = {
    body: Joi.object({
        patient: Joi.string().hex().length(24).required(),
        plan: Joi.string().trim().required(),
        recommendations: Joi.string().allow(""),
        clinicalReasoning: Joi.string().allow(""),
        medications: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                dosage: Joi.string().required(),
                route: Joi.string().default("IV"),
                frequency: Joi.string().required(),
                isAntibiotic: Joi.boolean().default(false),
            })
        ),
        ivFluids: Joi.string().allow(""),
        oxygenSupport: Joi.string().allow(""),
        supportiveCare: Joi.string().allow(""),
        procedures: Joi.array().items(Joi.string()),
    }),
};

module.exports = {
    createPatientSchema,
    updatePatientStatusSchema,
    dischargePatientSchema,
    createVitalSignSchema,
    createProblemSchema,
    resolveProblemSchema,
    createClinicalUpdateSchema,
    recordDeteriorationSchema,
    createManagementPlanSchema,
};
