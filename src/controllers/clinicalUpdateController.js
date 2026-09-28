const { ClinicalUpdate } = require("../models/ClinicalUpdate");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const { createAlert } = require("../services/alertService");

const createClinicalUpdate = catchAsync(async (req, res, next) => {
    const { patient: patientId, type, details, severity } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot add update for a discharged patient", 400));
    }

    const update = await ClinicalUpdate.create({
        patient: patientId,
        type,
        details,
        severity: severity || "Routine",
        recordedBy: req.user._id,
        recordedAt: new Date(),
    });

    patient.lastUpdatedBy = req.user._id;
    await patient.save();

    await logAudit({
        req,
        action: "ADD_CLINICAL_UPDATE",
        entity: "ClinicalUpdate",
        entityId: update._id,
        newValue: { type, severity, details },
    });

    const populated = await ClinicalUpdate.findById(update._id).populate("recordedBy", "userId name role");

    res.status(201).json({
        success: true,
        message: "Clinical update recorded",
        data: { clinicalUpdate: populated },
    });
});

// Quick-Record Deterioration workflow
const recordDeterioration = catchAsync(async (req, res, next) => {
    const {
        patient: patientId,
        triggerReason,
        escalationLevel,
        immediateActionTaken,
        setPatientCritical = true,
        criticalReason,
    } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot record deterioration for a discharged patient", 400));
    }

    // 1. Create the Clinical Update record marked as deterioration
    const details = `CLINICAL DETERIORATION: ${triggerReason}. Immediate action: ${immediateActionTaken}. Escalation: ${escalationLevel}.`;

    const update = await ClinicalUpdate.create({
        patient: patientId,
        type: "Clinical Deterioration",
        details,
        severity: "Emergency",
        isDeterioration: true,
        deteriorationData: {
            triggerReason,
            escalationLevel,
            immediateActionTaken,
        },
        recordedBy: req.user._id,
        recordedAt: new Date(),
    });

    // 2. Escalate patient status if requested
    if (setPatientCritical) {
        const previousStatus = patient.status;
        const assignedReason = criticalReason || "respiratory distress";

        patient.status = "Critical";
        patient.statusReason = assignedReason;
        patient.statusHistory.push({
            status: "Critical",
            reason: assignedReason,
            updatedBy: req.user._id,
            updatedAt: new Date(),
        });
    }

    patient.lastUpdatedBy = req.user._id;
    await patient.save();

    // 3. Emit high priority alert
    await createAlert({
        patientId: patient._id,
        type: "clinical deterioration",
        message: `EMERGENCY ALERT: Deterioration in ${patient.name} (Bed ${patient.bedNumber}). ${triggerReason}. Escalation: ${escalationLevel}`,
        priority: "Critical",
        relatedEvent: { entityType: "ClinicalUpdate", entityId: update._id },
    });

    // 4. Audit log
    await logAudit({
        req,
        action: "RECORD_DETERIORATION",
        entity: "ClinicalUpdate",
        entityId: update._id,
        newValue: {
            triggerReason,
            escalationLevel,
            immediateActionTaken,
            patientStatus: patient.status,
        },
    });

    const populated = await ClinicalUpdate.findById(update._id).populate("recordedBy", "userId name role");

    res.status(201).json({
        success: true,
        message: "Clinical deterioration recorded and clinical team alerted",
        data: {
            clinicalUpdate: populated,
            patientStatus: patient.status,
        },
    });
});

const getPatientUpdates = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;
    const { type, limit = 50 } = req.query;

    const filter = { patient: patientId };
    if (type) filter.type = type;

    const updates = await ClinicalUpdate.find(filter)
        .populate("recordedBy", "userId name role")
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit, 10));

    res.status(200).json({
        success: true,
        count: updates.length,
        data: { updates },
    });
});

module.exports = {
    createClinicalUpdate,
    recordDeterioration,
    getPatientUpdates,
};
