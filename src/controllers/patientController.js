const { Patient } = require("../models/Patient");
const VitalSign = require("../models/VitalSign");
const ActiveProblem = require("../models/ActiveProblem");
const ManagementPlan = require("../models/ManagementPlan");
const PatientView = require("../models/PatientView");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const { createAlert } = require("../services/alertService");

// Create patient
const createPatient = catchAsync(async (req, res, next) => {
    const {
        patientId,
        fileNumber,
        name,
        age,
        weight,
        bedNumber,
        admissionDate,
        mainDiagnosis,
        associatedDiagnoses,
        allergies,
        status,
        statusReason,
        statusReasonOther,
        responsibleDoctor,
    } = req.body;

    const existing = await Patient.findOne({
        $or: [{ patientId: patientId.toUpperCase() }, { fileNumber: fileNumber.toUpperCase() }],
    });

    if (existing) {
        if (existing.patientId === patientId.toUpperCase()) {
            return next(new AppError(`Patient ID '${patientId}' is already registered`, 400));
        }
        return next(new AppError(`File Number '${fileNumber}' is already in use`, 400));
    }

    const initialStatusHistory = [
        {
            status: status || "Stable",
            reason: status === "Critical" ? statusReason : undefined,
            reasonOther: status === "Critical" && statusReason === "other" ? statusReasonOther : undefined,
            updatedBy: req.user._id,
            updatedAt: new Date(),
        },
    ];

    const newPatient = await Patient.create({
        patientId: patientId.toUpperCase(),
        fileNumber: fileNumber.toUpperCase(),
        name,
        age,
        weight,
        bedNumber,
        admissionDate: admissionDate || new Date(),
        mainDiagnosis,
        associatedDiagnoses: associatedDiagnoses || [],
        allergies: allergies && allergies.length > 0 ? allergies : ["NKDA"],
        status: status || "Stable",
        statusReason: status === "Critical" ? statusReason : undefined,
        statusReasonOther: status === "Critical" && statusReason === "other" ? statusReasonOther : undefined,
        responsibleDoctor: responsibleDoctor || req.user._id,
        lastUpdatedBy: req.user._id,
        statusHistory: initialStatusHistory,
    });

    if (newPatient.status === "Critical") {
        await createAlert({
            patientId: newPatient._id,
            type: "critical patient",
            message: `Patient ${newPatient.name} admitted/registered with CRITICAL status: ${newPatient.statusReason}`,
            priority: "Critical",
            relatedEvent: { entityType: "Patient", entityId: newPatient._id },
        });
    }

    await logAudit({
        req,
        action: "CREATE_PATIENT",
        entity: "Patient",
        entityId: newPatient._id,
        newValue: {
            patientId: newPatient.patientId,
            name: newPatient.name,
            bedNumber: newPatient.bedNumber,
            status: newPatient.status,
            mainDiagnosis: newPatient.mainDiagnosis,
        },
    });

    res.status(201).json({
        success: true,
        message: "Patient registered successfully",
        data: { patient: newPatient },
    });
});

// Get all patients (with search and status filters)
const getAllPatients = catchAsync(async (req, res, next) => {
    const { status, search, discharged, bedNumber } = req.query;
    const filter = {};

    // By default, filter out discharged patients unless explicitly queried
    if (discharged === "true") {
        filter["dischargeStatus.isDischarged"] = true;
    } else {
        filter["dischargeStatus.isDischarged"] = false;
    }

    if (status) {
        filter.status = status;
    }

    if (bedNumber) {
        filter.bedNumber = bedNumber;
    }

    if (search) {
        const regex = new RegExp(search, "i");
        filter.$or = [
            { name: regex },
            { patientId: regex },
            { fileNumber: regex },
            { bedNumber: regex },
            { mainDiagnosis: regex },
        ];
    }

    const patients = await Patient.find(filter)
        .populate("responsibleDoctor", "userId name role")
        .populate("lastUpdatedBy", "userId name role")
        .sort({
            // Sort Critical first, then Close Monitoring, then Stable
            status: -1,
            updatedAt: -1,
        });

    res.status(200).json({
        success: true,
        count: patients.length,
        data: { patients },
    });
});

// Get single patient profile workspace
const getPatientById = catchAsync(async (req, res, next) => {
    const patient = await Patient.findById(req.params.id)
        .populate("responsibleDoctor", "userId name role email")
        .populate("lastUpdatedBy", "userId name role")
        .populate("statusHistory.updatedBy", "userId name role");

    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    // Retrieve active problems
    const activeProblems = await ActiveProblem.find({ patient: patient._id, status: "Active" })
        .populate("createdBy", "userId name role")
        .sort({ createdAt: -1 });

    // Retrieve latest vitals
    const latestVitals = await VitalSign.findOne({ patient: patient._id })
        .populate("recordedBy", "userId name role")
        .sort({ recordedAt: -1 });

    // Retrieve current active management plan
    const currentPlan = await ManagementPlan.findOne({ patient: patient._id, isSuperseded: false })
        .populate("createdBy", "userId name role")
        .sort({ version: -1 });

    // Retrieve user's last view timestamp before updating
    const previousView = await PatientView.findOne({
        user: req.user._id,
        patient: patient._id,
    });

    const lastViewedAt = previousView ? previousView.lastViewedAt : null;

    // Update or insert current view timestamp
    await PatientView.findOneAndUpdate(
        { user: req.user._id, patient: patient._id },
        { lastViewedAt: new Date() },
        { upsert: true, new: true }
    );

    res.status(200).json({
        success: true,
        data: {
            patient,
            latestVitals,
            activeProblems,
            currentPlan,
            lastViewedAt,
        },
    });
});

// Update patient status
const updatePatientStatus = catchAsync(async (req, res, next) => {
    const { status, statusReason, statusReasonOther } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot change status of a discharged patient", 400));
    }

    const previousStatus = patient.status;
    const previousReason = patient.statusReason;

    patient.status = status;
    patient.statusReason = status === "Critical" ? statusReason : undefined;
    patient.statusReasonOther = status === "Critical" && statusReason === "other" ? statusReasonOther : undefined;
    patient.lastUpdatedBy = req.user._id;

    patient.statusHistory.push({
        status,
        reason: patient.statusReason,
        reasonOther: patient.statusReasonOther,
        updatedBy: req.user._id,
        updatedAt: new Date(),
    });

    await patient.save();

    if (status === "Critical" && previousStatus !== "Critical") {
        await createAlert({
            patientId: patient._id,
            type: "critical patient",
            message: `CRITICAL ALERT: ${patient.name} (Bed ${patient.bedNumber}) changed to Critical: ${patient.statusReason}`,
            priority: "Critical",
            relatedEvent: { entityType: "Patient", entityId: patient._id },
        });
    }

    await logAudit({
        req,
        action: "UPDATE_PATIENT_STATUS",
        entity: "Patient",
        entityId: patient._id,
        previousValue: { status: previousStatus, reason: previousReason },
        newValue: { status: patient.status, reason: patient.statusReason },
    });

    res.status(200).json({
        success: true,
        message: `Patient status updated to ${status}`,
        data: { patient },
    });
});

// Discharge / Transfer patient (preserves all history, removes from active list)
const dischargePatient = catchAsync(async (req, res, next) => {
    const { outcome, summaryNotes } = req.body;
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Patient is already discharged/transferred", 400));
    }

    patient.dischargeStatus = {
        isDischarged: true,
        outcome,
        date: new Date(),
        summaryNotes,
        dischargedBy: req.user._id,
    };
    patient.lastUpdatedBy = req.user._id;

    await patient.save();

    await logAudit({
        req,
        action: "DISCHARGE_PATIENT",
        entity: "Patient",
        entityId: patient._id,
        newValue: {
            outcome,
            date: patient.dischargeStatus.date,
            summaryNotes,
        },
    });

    res.status(200).json({
        success: true,
        message: `Patient successfully recorded as ${outcome}`,
        data: { patient },
    });
});

// Timeline aggregator endpoint
const getTimeline = catchAsync(async (req, res, next) => {
    const { getPatientTimeline } = require("../services/timelineService");
    const timeline = await getPatientTimeline(req.params.id);

    res.status(200).json({
        success: true,
        count: timeline.length,
        data: { timeline },
    });
});

// "What Changed?" delta comparison endpoint
const getWhatChanged = catchAsync(async (req, res, next) => {
    const { getChangesSinceLastView } = require("../services/whatChangedService");
    const changesData = await getChangesSinceLastView(req.user._id, req.params.id);

    res.status(200).json({
        success: true,
        data: changesData,
    });
});

module.exports = {
    createPatient,
    getAllPatients,
    getPatientById,
    updatePatientStatus,
    dischargePatient,
    getTimeline,
    getWhatChanged,
};

