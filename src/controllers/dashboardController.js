const { Patient } = require("../models/Patient");
const Task = require("../models/Task");
const Investigation = require("../models/Investigation");
const { Alert } = require("../models/Alert");
const catchAsync = require("../utils/catchAsync");

const getDashboardSummary = catchAsync(async (req, res, next) => {
    const now = new Date();

    // 1. Sync overdue tasks for the current doctor and department
    await Task.updateMany(
        { dueAt: { $lt: now }, status: { $in: ["Pending", "In Progress"] } },
        { status: "Overdue" }
    );

    // 2. Run aggregations in parallel
    const [
        criticalCount,
        closeMonitoringCount,
        stableCount,
        dischargedCount,
        myPendingTasks,
        overdueTasks,
        importantPendingResults,
        criticalPatients,
        recentlyUpdatedPatients,
        unreadAlertsCount,
    ] = await Promise.all([
        Patient.countDocuments({ "dischargeStatus.isDischarged": false, status: "Critical" }),
        Patient.countDocuments({ "dischargeStatus.isDischarged": false, status: "Close Monitoring" }),
        Patient.countDocuments({ "dischargeStatus.isDischarged": false, status: "Stable" }),
        Patient.countDocuments({ "dischargeStatus.isDischarged": true }),
        Task.find({
            assignedTo: req.user._id,
            status: { $in: ["Pending", "In Progress"] },
        })
            .populate("patient", "patientId fileNumber name bedNumber status")
            .sort({ dueAt: 1 })
            .limit(10),
        Task.find({ status: "Overdue" })
            .populate("patient", "patientId fileNumber name bedNumber status")
            .populate("assignedTo", "userId name")
            .sort({ dueAt: 1 })
            .limit(10),
        Investigation.find({ status: "Result Available" })
            .populate("patient", "patientId fileNumber name bedNumber status")
            .sort({ isAbnormal: -1, resultAt: -1 })
            .limit(10),
        Patient.find({ "dischargeStatus.isDischarged": false, status: "Critical" })
            .populate("responsibleDoctor", "userId name")
            .populate("lastUpdatedBy", "userId name")
            .sort({ updatedAt: -1 }),
        Patient.find({ "dischargeStatus.isDischarged": false })
            .populate("responsibleDoctor", "userId name")
            .populate("lastUpdatedBy", "userId name")
            .sort({ updatedAt: -1 })
            .limit(8),
        Alert.countDocuments({ isRead: false }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            patientCounts: {
                critical: criticalCount,
                closeMonitoring: closeMonitoringCount,
                stable: stableCount,
                totalActive: criticalCount + closeMonitoringCount + stableCount,
                discharged: dischargedCount,
            },
            myPendingTasks,
            overdueTasks,
            importantPendingResults,
            criticalPatients,
            recentlyUpdatedPatients,
            unreadAlertsCount,
        },
    });
});

module.exports = {
    getDashboardSummary,
};
