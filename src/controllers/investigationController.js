const Investigation = require("../models/Investigation");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const { createAlert } = require("../services/alertService");

// Request investigation
const requestInvestigation = catchAsync(async (req, res, next) => {
    const { patient: patientId, name, type, notes } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot request investigation for a discharged patient", 400));
    }

    const investigation = await Investigation.create({
        patient: patientId,
        name,
        type,
        status: "Requested",
        requestedBy: req.user._id,
        requestedAt: new Date(),
        notes,
    });

    patient.lastUpdatedBy = req.user._id;
    await patient.save();

    await logAudit({
        req,
        action: "REQUEST_INVESTIGATION",
        entity: "Investigation",
        entityId: investigation._id,
        newValue: { name, type, status: "Requested" },
    });

    const populated = await Investigation.findById(investigation._id).populate("requestedBy", "userId name role");

    res.status(201).json({
        success: true,
        message: "Investigation requested",
        data: { investigation: populated },
    });
});

// Record result (moves status to Result Available)
const recordResult = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { result, isAbnormal, notes } = req.body;

    const investigation = await Investigation.findById(id).populate("patient", "name bedNumber");
    if (!investigation) {
        return next(new AppError("Investigation not found", 404));
    }

    investigation.result = result;
    investigation.resultAt = new Date();
    investigation.isAbnormal = isAbnormal || false;
    investigation.status = "Result Available";
    if (notes) investigation.notes = notes;

    await investigation.save();

    // Trigger alert for clinical team
    await createAlert({
        patientId: investigation.patient._id,
        type: "important pending result",
        message: `Result Available: ${investigation.name} for ${investigation.patient.name} (Bed ${investigation.patient.bedNumber})${isAbnormal ? " [ABNORMAL VALUE]" : ""}`,
        priority: isAbnormal ? "High" : "Medium",
        relatedEvent: { entityType: "Investigation", entityId: investigation._id },
    });

    await logAudit({
        req,
        action: "RECORD_INVESTIGATION_RESULT",
        entity: "Investigation",
        entityId: investigation._id,
        newValue: { result, isAbnormal, status: "Result Available" },
    });

    res.status(200).json({
        success: true,
        message: "Investigation result recorded and ready for clinical review",
        data: { investigation },
    });
});

// Review result (Specialist, Consultant, or Admin)
const reviewResult = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { notes } = req.body;

    // Role check: Specialist, Consultant, or Admin
    if (!["Specialist", "Consultant", "Admin"].includes(req.user.role)) {
        return next(new AppError("Only Specialists, Consultants, or Admins are authorized to formally review investigation results", 403));
    }

    const investigation = await Investigation.findById(id);
    if (!investigation) {
        return next(new AppError("Investigation not found", 404));
    }

    if (investigation.status !== "Result Available") {
        return next(new AppError("Investigation does not have an available result to review", 400));
    }

    investigation.status = "Reviewed";
    investigation.reviewedBy = req.user._id;
    investigation.reviewedAt = new Date();
    if (notes) investigation.notes = notes;

    await investigation.save();

    await logAudit({
        req,
        action: "REVIEW_INVESTIGATION_RESULT",
        entity: "Investigation",
        entityId: investigation._id,
        newValue: {
            status: "Reviewed",
            reviewedBy: req.user.userId,
            reviewedAt: investigation.reviewedAt,
        },
    });

    const populated = await Investigation.findById(investigation._id)
        .populate("requestedBy", "userId name role")
        .populate("reviewedBy", "userId name role");

    res.status(200).json({
        success: true,
        message: "Investigation marked as reviewed",
        data: { investigation: populated },
    });
});

// Get patient investigations
const getPatientInvestigations = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;
    const { status } = req.query;

    const filter = { patient: patientId };
    if (status) filter.status = status;

    const investigations = await Investigation.find(filter)
        .populate("requestedBy", "userId name role")
        .populate("reviewedBy", "userId name role")
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: investigations.length,
        data: { investigations },
    });
});

// Get all unreviewed results across ward
const getUnreviewedResults = catchAsync(async (req, res, next) => {
    const unreviewed = await Investigation.find({ status: "Result Available" })
        .populate("patient", "patientId fileNumber name bedNumber status")
        .populate("requestedBy", "userId name role")
        .sort({ isAbnormal: -1, resultAt: -1 });

    res.status(200).json({
        success: true,
        count: unreviewed.length,
        data: { unreviewed },
    });
});

module.exports = {
    requestInvestigation,
    recordResult,
    reviewResult,
    getPatientInvestigations,
    getUnreviewedResults,
};
