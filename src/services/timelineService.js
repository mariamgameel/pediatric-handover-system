const { Patient } = require("../models/Patient");
const VitalSign = require("../models/VitalSign");
const ActiveProblem = require("../models/ActiveProblem");
const { ClinicalUpdate } = require("../models/ClinicalUpdate");
const Investigation = require("../models/Investigation");
const Task = require("../models/Task");
const ManagementPlan = require("../models/ManagementPlan");

/**
 * Aggregates clinical history on-the-fly without a separate Timeline collection.
 * @param {string|ObjectId} patientId
 * @param {number} [limit=100]
 */
const getPatientTimeline = async (patientId, limit = 100) => {
    const [
        patient,
        vitals,
        problems,
        updates,
        investigations,
        tasks,
        managementPlans,
    ] = await Promise.all([
        Patient.findById(patientId).populate("statusHistory.updatedBy", "userId name role"),
        VitalSign.find({ patient: patientId }).populate("recordedBy", "userId name role").lean(),
        ActiveProblem.find({ patient: patientId })
            .populate("createdBy", "userId name role")
            .populate("resolutionInfo.resolvedBy", "userId name role")
            .lean(),
        ClinicalUpdate.find({ patient: patientId }).populate("recordedBy", "userId name role").lean(),
        Investigation.find({ patient: patientId })
            .populate("requestedBy", "userId name role")
            .populate("reviewedBy", "userId name role")
            .lean(),
        Task.find({ patient: patientId })
            .populate("createdBy", "userId name role")
            .populate("completedBy", "userId name role")
            .lean(),
        ManagementPlan.find({ patient: patientId }).populate("createdBy", "userId name role").lean(),
    ]);

    if (!patient) return [];

    const timelineEvents = [];

    // 1. Patient status history changes
    if (patient.statusHistory && patient.statusHistory.length > 0) {
        patient.statusHistory.forEach((sh) => {
            timelineEvents.push({
                id: `status-${sh._id || sh.updatedAt}`,
                timestamp: sh.updatedAt,
                category: "Status Change",
                title: `Status set to ${sh.status}`,
                details: sh.reason ? `Reason: ${sh.reason}${sh.reasonOther ? ` (${sh.reasonOther})` : ""}` : "Routine status update",
                actor: sh.updatedBy ? `${sh.updatedBy.name} (${sh.updatedBy.userId})` : "System",
                severity: sh.status === "Critical" ? "Critical" : sh.status === "Close Monitoring" ? "Urgent" : "Routine",
            });
        });
    }

    // 2. Vital Signs
    vitals.forEach((v) => {
        const bpStr = v.bloodPressure && v.bloodPressure.systolic ? ` BP: ${v.bloodPressure.systolic}/${v.bloodPressure.diastolic} mmHg` : "";
        const hrStr = v.heartRate ? ` HR: ${v.heartRate} bpm` : "";
        const rrStr = v.respiratoryRate ? ` RR: ${v.respiratoryRate} bpm` : "";
        const o2Str = v.spO2 ? ` SpO2: ${v.spO2}%` : "";
        const tempStr = v.temperature ? ` Temp: ${v.temperature}°C` : "";

        timelineEvents.push({
            id: `vitals-${v._id}`,
            timestamp: v.recordedAt,
            category: "Vital Signs",
            title: "Bedside Vitals Recorded",
            details: `${tempStr}${hrStr}${rrStr}${bpStr}${o2Str}. O2 Mode: ${v.oxygenSupport?.mode || "Room Air"}`,
            actor: v.recordedBy ? `${v.recordedBy.name} (${v.recordedBy.userId})` : "Clinician",
            severity: "Routine",
        });
    });

    // 3. Active Problems & Resolutions
    problems.forEach((p) => {
        timelineEvents.push({
            id: `problem-created-${p._id}`,
            timestamp: p.createdAt || p.startDate,
            category: "Active Problem",
            title: `New Problem: ${p.title}`,
            details: p.description || "Problem identified",
            actor: p.createdBy ? `${p.createdBy.name} (${p.createdBy.userId})` : "Doctor",
            severity: "Urgent",
        });

        if (p.status === "Resolved" && p.resolutionInfo && p.resolutionInfo.resolvedAt) {
            timelineEvents.push({
                id: `problem-resolved-${p._id}`,
                timestamp: p.resolutionInfo.resolvedAt,
                category: "Active Problem",
                title: `Problem Resolved: ${p.title}`,
                details: p.resolutionInfo.resolutionNote || "Resolved",
                actor: p.resolutionInfo.resolvedBy ? `${p.resolutionInfo.resolvedBy.name} (${p.resolutionInfo.resolvedBy.userId})` : "Doctor",
                severity: "Routine",
            });
        }
    });

    // 4. Clinical Updates & Deteriorations
    updates.forEach((u) => {
        timelineEvents.push({
            id: `update-${u._id}`,
            timestamp: u.recordedAt,
            category: u.isDeterioration ? "Clinical Deterioration" : "Clinical Update",
            title: u.isDeterioration ? "RAPID CLINICAL DETERIORATION" : u.type,
            details: u.details,
            actor: u.recordedBy ? `${u.recordedBy.name} (${u.recordedBy.userId})` : "Doctor",
            severity: u.severity || (u.isDeterioration ? "Critical" : "Routine"),
        });
    });

    // 5. Investigations (Request, Result, Review)
    investigations.forEach((inv) => {
        timelineEvents.push({
            id: `inv-req-${inv._id}`,
            timestamp: inv.requestedAt || inv.createdAt,
            category: "Investigation",
            title: `Investigation Requested: ${inv.name}`,
            details: `Type: ${inv.type}. Notes: ${inv.notes || "None"}`,
            actor: inv.requestedBy ? `${inv.requestedBy.name} (${inv.requestedBy.userId})` : "Doctor",
            severity: "Routine",
        });

        if (inv.resultAt && inv.result) {
            timelineEvents.push({
                id: `inv-res-${inv._id}`,
                timestamp: inv.resultAt,
                category: "Investigation Result",
                title: `Result Available: ${inv.name} ${inv.isAbnormal ? "[ABNORMAL]" : ""}`,
                details: `Result: ${inv.result}`,
                actor: "Diagnostic Laboratory",
                severity: inv.isAbnormal ? "Urgent" : "Routine",
            });
        }

        if (inv.reviewedAt && inv.reviewedBy) {
            timelineEvents.push({
                id: `inv-rev-${inv._id}`,
                timestamp: inv.reviewedAt,
                category: "Investigation Review",
                title: `Result Formally Reviewed: ${inv.name}`,
                details: inv.notes ? `Review Note: ${inv.notes}` : "Verified by senior clinical staff",
                actor: `${inv.reviewedBy.name} (${inv.reviewedBy.userId})`,
                severity: "Routine",
            });
        }
    });

    // 6. Tasks
    tasks.forEach((t) => {
        if (t.completedAt) {
            timelineEvents.push({
                id: `task-comp-${t._id}`,
                timestamp: t.completedAt,
                category: "Task Completed",
                title: `Task Completed: ${t.description}`,
                details: t.completionNotes || "Completed",
                actor: t.completedBy ? `${t.completedBy.name} (${t.completedBy.userId})` : "Clinician",
                severity: "Routine",
            });
        }
    });

    // 7. Management Plans
    managementPlans.forEach((mp) => {
        timelineEvents.push({
            id: `plan-${mp._id}`,
            timestamp: mp.createdAt,
            category: "Management Plan",
            title: `Management Plan v${mp.version} authored by ${mp.authorRole}`,
            details: `Plan: ${mp.plan}. ${mp.recommendations ? `Recommendations: ${mp.recommendations}` : ""}`,
            actor: mp.createdBy ? `${mp.createdBy.name} (${mp.createdBy.userId})` : "Senior Doctor",
            severity: mp.authorRole === "Consultant" ? "Urgent" : "Routine",
        });
    });

    // Sort all events strictly by timestamp descending
    timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return timelineEvents.slice(0, limit);
};

module.exports = {
    getPatientTimeline,
};
