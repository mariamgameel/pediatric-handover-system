const ActiveProblem = require("../models/ActiveProblem");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

const createProblem = catchAsync(async (req, res, next) => {
    const { patient: patientId, title, description, startDate } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    const problem = await ActiveProblem.create({
        patient: patientId,
        title,
        description,
        startDate: startDate || new Date(),
        status: "Active",
        createdBy: req.user._id,
        updatedBy: req.user._id,
    });

    patient.lastUpdatedBy = req.user._id;
    await patient.save();

    await logAudit({
        req,
        action: "CREATE_PROBLEM",
        entity: "ActiveProblem",
        entityId: problem._id,
        newValue: { title, status: "Active" },
    });

    const populated = await ActiveProblem.findById(problem._id).populate("createdBy", "userId name role");

    res.status(201).json({
        success: true,
        message: "Active problem recorded",
        data: { problem: populated },
    });
});

const resolveProblem = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { resolutionNote } = req.body;

    const problem = await ActiveProblem.findById(id);
    if (!problem) {
        return next(new AppError("Problem not found", 404));
    }

    if (problem.status === "Resolved") {
        return next(new AppError("Problem is already marked as resolved", 400));
    }

    problem.status = "Resolved";
    problem.resolutionInfo = {
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
        resolutionNote,
    };
    problem.updatedBy = req.user._id;
    await problem.save();

    await logAudit({
        req,
        action: "RESOLVE_PROBLEM",
        entity: "ActiveProblem",
        entityId: problem._id,
        newValue: { status: "Resolved", resolutionNote },
    });

    const populated = await ActiveProblem.findById(problem._id)
        .populate("createdBy", "userId name role")
        .populate("resolutionInfo.resolvedBy", "userId name role");

    res.status(200).json({
        success: true,
        message: "Problem resolved and archived to history",
        data: { problem: populated },
    });
});

const addProblemUpdate = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { note } = req.body;

    const problem = await ActiveProblem.findById(id);
    if (!problem) {
        return next(new AppError("Problem not found", 404));
    }

    problem.updates.push({
        note,
        updatedBy: req.user._id,
        updatedAt: new Date(),
    });
    problem.updatedBy = req.user._id;
    await problem.save();

    await logAudit({
        req,
        action: "UPDATE_PROBLEM",
        entity: "ActiveProblem",
        entityId: problem._id,
        newValue: { note },
    });

    res.status(200).json({
        success: true,
        message: "Problem progress note added",
        data: { problem },
    });
});

const getPatientProblems = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;
    const { status } = req.query;

    const filter = { patient: patientId };
    if (status) {
        filter.status = status;
    }

    const problems = await ActiveProblem.find(filter)
        .populate("createdBy", "userId name role")
        .populate("updatedBy", "userId name role")
        .populate("resolutionInfo.resolvedBy", "userId name role")
        .populate("updates.updatedBy", "userId name role")
        .sort({ status: 1, createdAt: -1 });

    res.status(200).json({
        success: true,
        count: problems.length,
        data: { problems },
    });
});

module.exports = {
    createProblem,
    resolveProblem,
    addProblemUpdate,
    getPatientProblems,
};
