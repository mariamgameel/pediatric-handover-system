const PatientView = require("../models/PatientView");
const { Patient } = require("../models/Patient");
const { ClinicalUpdate } = require("../models/ClinicalUpdate");
const Investigation = require("../models/Investigation");
const ManagementPlan = require("../models/ManagementPlan");
const ActiveProblem = require("../models/ActiveProblem");
const Task = require("../models/Task");

/**
 * Computes meaningful clinical changes since the doctor's previous visit.
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} patientId
 */
const getChangesSinceLastView = async (userId, patientId) => {
    const patientView = await PatientView.findOne({ user: userId, patient: patientId });

    // If the doctor has never viewed this patient before, return a welcoming indicator
    if (!patientView || !patientView.lastViewedAt) {
        return {
            isFirstVisit: true,
            lastViewedAt: null,
            changeCount: 0,
            hasCriticalChange: false,
            changes: [],
        };
    }

    const sinceDate = patientView.lastViewedAt;

    const [
        patient,
        newUpdates,
        newResults,
        newPlans,
        newProblems,
        completedTasks,
    ] = await Promise.all([
        Patient.findById(patientId),
        ClinicalUpdate.find({ patient: patientId, recordedAt: { $gt: sinceDate } })
            .populate("recordedBy", "userId name role")
            .lean(),
        Investigation.find({ patient: patientId, resultAt: { $gt: sinceDate } })
            .populate("reviewedBy", "userId name")
            .lean(),
        ManagementPlan.find({ patient: patientId, createdAt: { $gt: sinceDate } })
            .populate("createdBy", "userId name role")
            .lean(),
        ActiveProblem.find({
            patient: patientId,
            $or: [{ createdAt: { $gt: sinceDate } }, { "resolutionInfo.resolvedAt": { $gt: sinceDate } }],
        })
            .populate("createdBy", "userId name")
            .lean(),
        Task.find({ patient: patientId, completedAt: { $gt: sinceDate } })
            .populate("completedBy", "userId name")
            .lean(),
    ]);

    const changes = [];
    let hasCriticalChange = false;

    // 1. Status changes since last visit
    if (patient && patient.statusHistory) {
        const recentStatusChanges = patient.statusHistory.filter(
            (sh) => new Date(sh.updatedAt) > new Date(sinceDate)
        );
        recentStatusChanges.forEach((sc) => {
            if (sc.status === "Critical") hasCriticalChange = true;
            changes.push({
                type: "Status Change",
                title: `Status changed to ${sc.status}`,
                details: sc.reason ? `Reason: ${sc.reason}` : "",
                timestamp: sc.updatedAt,
                severity: sc.status === "Critical" ? "Critical" : "Urgent",
            });
        });
    }

    // 2. Clinical updates & deteriorations
    newUpdates.forEach((u) => {
        if (u.isDeterioration || u.severity === "Emergency") hasCriticalChange = true;
        changes.push({
            type: u.isDeterioration ? "Deterioration" : "Clinical Update",
            title: u.isDeterioration ? "Rapid Deterioration Recorded" : u.type,
            details: u.details,
            timestamp: u.recordedAt,
            author: u.recordedBy ? `${u.recordedBy.name} (${u.recordedBy.userId})` : "Clinician",
            severity: u.isDeterioration ? "Critical" : u.severity || "Routine",
        });
    });

    // 3. New investigation results
    newResults.forEach((inv) => {
        if (inv.isAbnormal) hasCriticalChange = true;
        changes.push({
            type: "Investigation Result",
            title: `New Result: ${inv.name} ${inv.isAbnormal ? "[ABNORMAL]" : ""}`,
            details: `Result: ${inv.result} (${inv.status === "Reviewed" ? "Reviewed" : "Unreviewed"})`,
            timestamp: inv.resultAt,
            severity: inv.isAbnormal ? "Urgent" : "Routine",
        });
    });

    // 4. New Management Plans
    newPlans.forEach((plan) => {
        changes.push({
            type: "Management Plan",
            title: `New Management Plan (v${plan.version}) by ${plan.authorRole}`,
            details: plan.plan,
            timestamp: plan.createdAt,
            author: plan.createdBy ? `${plan.createdBy.name} (${plan.createdBy.userId})` : "Senior Doctor",
            severity: "Urgent",
        });
    });

    // 5. Problems
    newProblems.forEach((prob) => {
        if (prob.status === "Resolved" && new Date(prob.resolutionInfo?.resolvedAt) > new Date(sinceDate)) {
            changes.push({
                type: "Problem Resolved",
                title: `Resolved: ${prob.title}`,
                details: prob.resolutionInfo?.resolutionNote || "",
                timestamp: prob.resolutionInfo.resolvedAt,
                severity: "Routine",
            });
        } else if (new Date(prob.createdAt) > new Date(sinceDate)) {
            changes.push({
                type: "New Problem",
                title: `Active Problem: ${prob.title}`,
                details: prob.description || "",
                timestamp: prob.createdAt,
                severity: "Urgent",
            });
        }
    });

    // 6. Completed Tasks
    completedTasks.forEach((task) => {
        changes.push({
            type: "Task Completed",
            title: `Completed: ${task.description}`,
            details: task.completionNotes || "",
            timestamp: task.completedAt,
            author: task.completedBy ? `${task.completedBy.name} (${task.completedBy.userId})` : "",
            severity: "Routine",
        });
    });

    // Sort by timestamp descending
    changes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
        isFirstVisit: false,
        lastViewedAt: sinceDate,
        changeCount: changes.length,
        hasCriticalChange,
        changes,
    };
};

module.exports = {
    getChangesSinceLastView,
};
