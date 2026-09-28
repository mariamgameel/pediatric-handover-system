const Task = require("../models/Task");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const { createAlert } = require("../services/alertService");

// Auto-update overdue tasks helper
const syncOverdueTasks = async (queryFilter) => {
    const now = new Date();
    await Task.updateMany(
        {
            ...queryFilter,
            dueAt: { $lt: now },
            status: { $in: ["Pending", "In Progress"] },
        },
        { status: "Overdue" }
    );
};

// Create a task
const createTask = catchAsync(async (req, res, next) => {
    const { patient: patientId, description, priority, dueAt, assignedTo } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot assign tasks for a discharged patient", 400));
    }

    const task = await Task.create({
        patient: patientId,
        description,
        priority: priority || "Routine",
        dueAt,
        assignedTo: assignedTo || req.user._id,
        status: "Pending",
        createdBy: req.user._id,
    });

    patient.lastUpdatedBy = req.user._id;
    await patient.save();

    await logAudit({
        req,
        action: "CREATE_TASK",
        entity: "Task",
        entityId: task._id,
        newValue: { description, priority, dueAt },
    });

    const populated = await Task.findById(task._id)
        .populate("assignedTo", "userId name role")
        .populate("createdBy", "userId name role");

    res.status(201).json({
        success: true,
        message: "Clinical task created",
        data: { task: populated },
    });
});

// GET /api/tasks/my - Doctor's assigned tasks
const getMyTasks = catchAsync(async (req, res, next) => {
    await syncOverdueTasks({ assignedTo: req.user._id });

    const tasks = await Task.find({
        assignedTo: req.user._id,
        status: { $in: ["Pending", "In Progress", "Overdue"] },
    })
        .populate("patient", "patientId fileNumber name bedNumber status")
        .populate("createdBy", "userId name role")
        .sort({ dueAt: 1 });

    res.status(200).json({
        success: true,
        count: tasks.length,
        data: { tasks },
    });
});

// Get tasks for a patient
const getPatientTasks = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;

    await syncOverdueTasks({ patient: patientId });

    const tasks = await Task.find({ patient: patientId })
        .populate("assignedTo", "userId name role")
        .populate("createdBy", "userId name role")
        .populate("completedBy", "userId name role")
        .sort({ status: 1, dueAt: 1 });

    res.status(200).json({
        success: true,
        count: tasks.length,
        data: { tasks },
    });
});

// Update task status (Complete / Progress / Cancel)
const updateTaskStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, completionNotes } = req.body;

    const task = await Task.findById(id).populate("patient", "name bedNumber");
    if (!task) {
        return next(new AppError("Task not found", 404));
    }

    const previousStatus = task.status;
    task.status = status;

    if (status === "Completed") {
        task.completedBy = req.user._id;
        task.completedAt = new Date();
    }
    if (completionNotes) {
        task.completionNotes = completionNotes;
    }

    await task.save();

    await logAudit({
        req,
        action: "UPDATE_TASK_STATUS",
        entity: "Task",
        entityId: task._id,
        previousValue: { status: previousStatus },
        newValue: { status, completionNotes },
    });

    const populated = await Task.findById(task._id)
        .populate("assignedTo", "userId name role")
        .populate("completedBy", "userId name role");

    res.status(200).json({
        success: true,
        message: `Task updated to ${status}`,
        data: { task: populated },
    });
});

// Get all overdue tasks across the ward
const getOverdueTasks = catchAsync(async (req, res, next) => {
    await syncOverdueTasks({});

    const overdue = await Task.find({ status: "Overdue" })
        .populate("patient", "patientId fileNumber name bedNumber status")
        .populate("assignedTo", "userId name role")
        .sort({ dueAt: 1 });

    res.status(200).json({
        success: true,
        count: overdue.length,
        data: { tasks: overdue },
    });
});

module.exports = {
    createTask,
    getMyTasks,
    getPatientTasks,
    updateTaskStatus,
    getOverdueTasks,
};
