const { HandoverRecord } = require("../models/HandoverRecord");
const { Patient } = require("../models/Patient");
const { compileHandoverSummary } = require("../services/handoverEngine");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

// Get auto-compiled handover preview for a patient
const getHandoverPreview = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;

    const summary = await compileHandoverSummary(patientId);
    if (!summary) {
        return next(new AppError("Patient not found", 404));
    }

    res.status(200).json({
        success: true,
        data: summary,
    });
});

// Submit a shift handover record
const createHandoverRecord = catchAsync(async (req, res, next) => {
    const { patient: patientId, toDoctor, shiftType, status, customNotes } = req.body;

    const summary = await compileHandoverSummary(patientId);
    if (!summary) {
        return next(new AppError("Patient not found", 404));
    }

    const handover = await HandoverRecord.create({
        patient: patientId,
        fromDoctor: req.user._id,
        toDoctor: toDoctor || null,
        shiftType,
        status,
        autoSummarySnapshot: summary.autoSummarySnapshot,
        customNotes,
        handoverDate: new Date(),
    });

    await logAudit({
        req,
        action: "SUBMIT_HANDOVER",
        entity: "HandoverRecord",
        entityId: handover._id,
        newValue: {
            patientId,
            status,
            shiftType,
            toDoctor,
        },
    });

    const populated = await HandoverRecord.findById(handover._id)
        .populate("fromDoctor", "userId name role")
        .populate("toDoctor", "userId name role");

    res.status(201).json({
        success: true,
        message: "Shift handover recorded successfully",
        data: { handover: populated },
    });
});

// Receiving doctor acknowledges shift handover
const acknowledgeHandover = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const handover = await HandoverRecord.findById(id).populate("patient", "name bedNumber");
    if (!handover) {
        return next(new AppError("Handover record not found", 404));
    }

    if (handover.acknowledged) {
        return next(new AppError("Handover has already been acknowledged", 400));
    }

    handover.acknowledged = true;
    handover.acknowledgedBy = req.user._id;
    handover.acknowledgedAt = new Date();
    await handover.save();

    await logAudit({
        req,
        action: "ACKNOWLEDGE_HANDOVER",
        entity: "HandoverRecord",
        entityId: handover._id,
        newValue: {
            acknowledgedBy: req.user.userId,
            acknowledgedAt: handover.acknowledgedAt,
        },
    });

    const populated = await HandoverRecord.findById(handover._id)
        .populate("fromDoctor", "userId name role")
        .populate("toDoctor", "userId name role")
        .populate("acknowledgedBy", "userId name role");

    res.status(200).json({
        success: true,
        message: "Handover acknowledged by receiving clinician",
        data: { handover: populated },
    });
});

// Get handover history for a patient
const getHandoverHistory = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;

    const handovers = await HandoverRecord.find({ patient: patientId })
        .populate("fromDoctor", "userId name role")
        .populate("toDoctor", "userId name role")
        .populate("acknowledgedBy", "userId name role")
        .sort({ handoverDate: -1 });

    res.status(200).json({
        success: true,
        count: handovers.length,
        data: { handovers },
    });
});

// Department-wide handover sheet: gets summaries for all active admitted patients
const getWardHandoverSheet = catchAsync(async (req, res, next) => {
    const patients = await Patient.find({ "dischargeStatus.isDischarged": false })
        .sort({ status: -1, bedNumber: 1 });

    const summaries = await Promise.all(
        patients.map((p) => compileHandoverSummary(p._id))
    );

    res.status(200).json({
        success: true,
        count: summaries.length,
        data: { wardHandovers: summaries },
    });
});

module.exports = {
    getHandoverPreview,
    createHandoverRecord,
    acknowledgeHandover,
    getHandoverHistory,
    getWardHandoverSheet,
};
