const ManagementPlan = require("../models/ManagementPlan");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const { createAlert } = require("../services/alertService");

const createManagementPlan = catchAsync(async (req, res, next) => {
    const {
        patient: patientId,
        plan,
        recommendations,
        clinicalReasoning,
        medications,
        ivFluids,
        oxygenSupport,
        supportiveCare,
        procedures,
    } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot create management plan for a discharged patient", 400));
    }

    // Role check: Specialist, Consultant, or Admin
    if (!["Specialist", "Consultant", "Admin"].includes(req.user.role)) {
        return next(new AppError("Only Specialists, Consultants, or Admins can author management plans", 403));
    }

    // Find the latest existing plan to determine version number and supersede it
    const latestPlan = await ManagementPlan.findOne({ patient: patientId, isSuperseded: false })
        .sort({ version: -1 });

    const newVersion = latestPlan ? latestPlan.version + 1 : 1;

    const newPlan = await ManagementPlan.create({
        patient: patientId,
        version: newVersion,
        plan,
        recommendations,
        clinicalReasoning,
        medications: medications || [],
        ivFluids,
        oxygenSupport,
        supportiveCare,
        procedures: procedures || [],
        isSuperseded: false,
        authorRole: req.user.role,
        createdBy: req.user._id,
        createdAt: new Date(),
    });

    // Mark previous plan as superseded
    if (latestPlan) {
        latestPlan.isSuperseded = true;
        latestPlan.supersededBy = newPlan._id;
        await latestPlan.save();
    }

    patient.lastUpdatedBy = req.user._id;
    await patient.save();

    // If Consultant created, emit alert
    if (req.user.role === "Consultant") {
        await createAlert({
            patientId: patient._id,
            type: "new consultant management plan",
            message: `Consultant Dr. ${req.user.name} (${req.user.userId}) updated the Management Plan (v${newVersion}) for ${patient.name}`,
            priority: "Medium",
            relatedEvent: { entityType: "ManagementPlan", entityId: newPlan._id },
        });
    }

    await logAudit({
        req,
        action: "CREATE_MANAGEMENT_PLAN",
        entity: "ManagementPlan",
        entityId: newPlan._id,
        newValue: {
            version: newVersion,
            authorRole: req.user.role,
            planSummary: plan.substring(0, 100),
        },
    });

    const populated = await ManagementPlan.findById(newPlan._id).populate("createdBy", "userId name role");

    res.status(201).json({
        success: true,
        message: `Management plan v${newVersion} created successfully`,
        data: { managementPlan: populated },
    });
});

const getPatientPlans = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;

    const plans = await ManagementPlan.find({ patient: patientId })
        .populate("createdBy", "userId name role")
        .populate("supersededBy", "version")
        .sort({ version: -1 });

    res.status(200).json({
        success: true,
        count: plans.length,
        data: {
            currentPlan: plans.find((p) => !p.isSuperseded) || null,
            history: plans,
        },
    });
});

module.exports = {
    createManagementPlan,
    getPatientPlans,
};
