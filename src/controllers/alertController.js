const { Alert } = require("../models/Alert");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const getAlerts = catchAsync(async (req, res, next) => {
    const { unreadOnly = "false", limit = 50 } = req.query;
    const filter = {};

    if (unreadOnly === "true") {
        filter.isRead = false;
    }

    const alerts = await Alert.find(filter)
        .populate("patient", "patientId fileNumber name bedNumber status")
        .sort({ isRead: 1, createdAt: -1 })
        .limit(parseInt(limit, 10));

    const unreadCount = await Alert.countDocuments({ isRead: false });

    res.status(200).json({
        success: true,
        count: alerts.length,
        unreadCount,
        data: { alerts },
    });
});

const markAlertAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const alert = await Alert.findById(id);
    if (!alert) {
        return next(new AppError("Alert not found", 404));
    }

    alert.isRead = true;
    alert.readBy = req.user._id;
    alert.readAt = new Date();
    await alert.save();

    res.status(200).json({
        success: true,
        message: "Alert marked as read",
        data: { alert },
    });
});

module.exports = {
    getAlerts,
    markAlertAsRead,
};
