const { Patient } = require("../models/Patient");
const ActiveProblem = require("../models/ActiveProblem");
const VitalSign = require("../models/VitalSign");
const ManagementPlan = require("../models/ManagementPlan");
const Investigation = require("../models/Investigation");
const Task = require("../models/Task");
const { ClinicalUpdate } = require("../models/ClinicalUpdate");

/**
 * Automatically compiles an up-to-the-minute structured clinical handover summary.
 * Eliminates redundant clinical documentation.
 * @param {string|ObjectId} patientId
 */
const compileHandoverSummary = async (patientId) => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const [
        patient,
        activeProblems,
        latestVitals,
        currentPlan,
        pendingInvestigations,
        unreviewedResults,
        pendingTasks,
        recentDeteriorations,
    ] = await Promise.all([
        Patient.findById(patientId).populate("responsibleDoctor", "userId name"),
        ActiveProblem.find({ patient: patientId, status: "Active" }).sort({ createdAt: -1 }),
        VitalSign.findOne({ patient: patientId }).sort({ recordedAt: -1 }),
        ManagementPlan.findOne({ patient: patientId, isSuperseded: false }).sort({ version: -1 }),
        Investigation.find({ patient: patientId, status: { $in: ["Requested", "Pending"] } }),
        Investigation.find({ patient: patientId, status: "Result Available" }),
        Task.find({ patient: patientId, status: { $in: ["Pending", "In Progress", "Overdue"] } }).sort({ dueAt: 1 }),
        ClinicalUpdate.find({ patient: patientId, isDeterioration: true, recordedAt: { $gte: twelveHoursAgo } }),
    ]);

    if (!patient) return null;

    const warnings = [];

    // Evaluate High-Risk & Critical warnings
    if (patient.status === "Critical") {
        warnings.push(`CRITICAL STATUS: ${patient.statusReason || "High risk patient"}`);
    }

    if (recentDeteriorations.length > 0) {
        warnings.push(`RAPID DETERIORATION recorded within the last 12 hours (${recentDeteriorations.length} event/s)`);
    }

    if (latestVitals) {
        if (latestVitals.spO2 && latestVitals.spO2 < 92) {
            warnings.push(`Desaturation: Latest SpO2 ${latestVitals.spO2}%`);
        }
        if (latestVitals.temperature && latestVitals.temperature >= 38.5) {
            warnings.push(`Fever: Latest Temp ${latestVitals.temperature}°C`);
        }
    }

    const unreviewedAbnormal = unreviewedResults.filter((r) => r.isAbnormal);
    if (unreviewedAbnormal.length > 0) {
        warnings.push(`${unreviewedAbnormal.length} ABNORMAL investigation result(s) pending doctor review!`);
    }

    const overdueCount = pendingTasks.filter((t) => t.status === "Overdue" || new Date(t.dueAt) < new Date()).length;
    if (overdueCount > 0) {
        warnings.push(`${overdueCount} clinical task(s) are OVERDUE`);
    }

    // Default recommended handover status
    let recommendedStatus = "Handed Over";
    if (patient.status === "Critical" || recentDeteriorations.length > 0 || unreviewedAbnormal.length > 0) {
        recommendedStatus = "Critical — Verbal Handover Required";
    } else if (patient.status === "Close Monitoring" || warnings.length > 0) {
        recommendedStatus = "Needs Direct Discussion";
    }

    return {
        patient: {
            id: patient._id,
            patientId: patient.patientId,
            fileNumber: patient.fileNumber,
            name: patient.name,
            bedNumber: patient.bedNumber,
            age: patient.age,
            weight: patient.weight,
            mainDiagnosis: patient.mainDiagnosis,
            allergies: patient.allergies,
            status: patient.status,
            statusReason: patient.statusReason,
        },
        recommendedStatus,
        autoSummarySnapshot: {
            patientStatus: patient.status,
            statusReason: patient.statusReason,
            activeProblemsSummary: activeProblems.map((p) => p.title),
            currentManagementSummary: {
                plan: currentPlan ? currentPlan.plan : "Supportive care as per ward protocol",
                medications: currentPlan ? currentPlan.medications : [],
                ivFluids: currentPlan ? currentPlan.ivFluids : (latestVitals ? latestVitals.ivFluids : "None"),
                oxygenSupport: currentPlan ? currentPlan.oxygenSupport : (latestVitals?.oxygenSupport?.mode || "Room Air"),
            },
            latestVitals: latestVitals ? {
                temperature: latestVitals.temperature,
                heartRate: latestVitals.heartRate,
                respiratoryRate: latestVitals.respiratoryRate,
                bloodPressure: latestVitals.bloodPressure,
                spO2: latestVitals.spO2,
                gcs: latestVitals.gcs,
                oxygenSupport: latestVitals.oxygenSupport,
                recordedAt: latestVitals.recordedAt,
            } : null,
            pendingInvestigations: pendingInvestigations.map((i) => `${i.name} (${i.status})`),
            unreviewedResults: unreviewedResults.map((i) => `${i.name}: ${i.result}${i.isAbnormal ? " [ABNORMAL]" : ""}`),
            pendingTasks: pendingTasks.map((t) => `${t.description} [Due: ${new Date(t.dueAt).toLocaleTimeString()}]`),
            warnings,
        },
    };
};

module.exports = {
    compileHandoverSummary,
};
