const Protocol = require("../models/Protocol");
const { Patient } = require("../models/Patient");
const { ClinicalUpdate } = require("../models/ClinicalUpdate");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

// Get all protocols
const getProtocols = catchAsync(async (req, res, next) => {
    const { category, priority, status } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (status) {
        filter.status = status;
    } else {
        if (req.user.role !== "Admin") {
            filter.status = "Active";
        }
    }

    const protocols = await Protocol.find(filter)
        .populate("createdBy", "userId name role")
        .sort({ priority: -1, createdAt: 1 });

    res.status(200).json({
        success: true,
        count: protocols.length,
        data: { protocols },
    });
});

// Get a single protocol by ID or code
const getProtocolById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    let protocol;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        protocol = await Protocol.findById(id).populate("createdBy", "userId name role");
    } else {
        protocol = await Protocol.findOne({ protocolCode: id.toUpperCase() }).populate("createdBy", "userId name role");
    }

    if (!protocol) {
        return next(new AppError("Clinical protocol not found", 404));
    }

    res.status(200).json({
        success: true,
        data: { protocol },
    });
});

// Admin creates new protocol
const createProtocol = catchAsync(async (req, res, next) => {
    const { protocolCode, title, category, priority, triggerConditions, checklistItems, escalationRole, status } =
        req.body;

    const existing = await Protocol.findOne({ protocolCode: protocolCode.toUpperCase() });
    if (existing) {
        return next(new AppError(`Protocol code ${protocolCode} is already registered`, 400));
    }

    const protocol = await Protocol.create({
        protocolCode: protocolCode.toUpperCase(),
        title,
        category,
        priority: priority || "Routine",
        triggerConditions,
        checklistItems,
        escalationRole: escalationRole || "Specialist",
        status: status || "Active",
        createdBy: req.user._id,
    });

    await logAudit({
        req,
        action: "CREATE_PROTOCOL",
        entity: "Protocol",
        entityId: protocol._id,
        newValue: {
            protocolCode: protocol.protocolCode,
            title: protocol.title,
            category: protocol.category,
            priority: protocol.priority,
        },
    });

    res.status(201).json({
        success: true,
        message: "Protocol created successfully",
        data: { protocol },
    });
});

// Admin updates protocol
const updateProtocol = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const protocol = await Protocol.findById(id);

    if (!protocol) {
        return next(new AppError("Protocol not found", 404));
    }

    const previousValue = {
        title: protocol.title,
        priority: protocol.priority,
        status: protocol.status,
    };

    Object.assign(protocol, req.body);
    await protocol.save();

    await logAudit({
        req,
        action: "UPDATE_PROTOCOL",
        entity: "Protocol",
        entityId: protocol._id,
        previousValue,
        newValue: {
            title: protocol.title,
            priority: protocol.priority,
            status: protocol.status,
        },
    });

    res.status(200).json({
        success: true,
        message: "Protocol updated successfully",
        data: { protocol },
    });
});

// Admin deletes protocol
const deleteProtocol = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const protocol = await Protocol.findById(id);

    if (!protocol) {
        return next(new AppError("Protocol not found", 404));
    }

    await Protocol.findByIdAndDelete(id);

    await logAudit({
        req,
        action: "DELETE_PROTOCOL",
        entity: "Protocol",
        entityId: id,
        previousValue: {
            protocolCode: protocol.protocolCode,
            title: protocol.title,
        },
    });

    res.status(200).json({
        success: true,
        message: "Protocol deleted successfully",
    });
});

// Clinicians execute an interactive protocol checklist for a patient
const executeProtocol = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { patientId, executedSteps, clinicalNotes } = req.body;

    const protocol = await Protocol.findById(id);
    if (!protocol) {
        return next(new AppError("Protocol not found", 404));
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    const isDeterioration = ["Urgent", "Critical_Stat"].includes(protocol.priority);
    const stepsSummary = executedSteps
        .map((s) => `[${s.completed ? "✓" : "✗"}] Step ${s.stepNumber}: ${s.action} ${s.notes ? "(" + s.notes + ")" : ""}`)
        .join("\n");

    const details = `Executed Protocol: [${protocol.protocolCode}] ${protocol.title}\nCategory: ${protocol.category}\n` +
        `Escalation Target: ${protocol.escalationRole}\nChecklist Summary:\n${stepsSummary}\n` +
        (clinicalNotes ? `\nClinical Notes: ${clinicalNotes}` : "");

    const clinicalUpdate = await ClinicalUpdate.create({
        patient: patient._id,
        recordedBy: req.user._id,
        type: isDeterioration ? "Clinical Deterioration" : "Clinical Protocol / SOP",
        severity: isDeterioration ? "Urgent" : "Routine",
        isDeterioration,
        deteriorationTrigger: isDeterioration ? `Protocol Trigger: ${protocol.title}` : null,
        deteriorationLevel: isDeterioration ? protocol.priority : null,
        deteriorationAction: `Completed protocol checklist under supervision of ${protocol.escalationRole}`,
        details,
    });

    await logAudit({
        req,
        action: "EXECUTE_PROTOCOL",
        entity: "Protocol",
        entityId: protocol._id,
        newValue: {
            patientId: patient.patientId,
            patientName: patient.name,
            protocolCode: protocol.protocolCode,
            stepsCompleted: executedSteps.filter((s) => s.completed).length,
            totalSteps: executedSteps.length,
        },
    });

    res.status(200).json({
        success: true,
        message: `Protocol ${protocol.protocolCode} checklist executed and recorded in patient timeline.`,
        data: { clinicalUpdate },
    });
});

module.exports = {
    getProtocols,
    getProtocolById,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    executeProtocol,
};
