const AuditLog = require("../models/AuditLog");
const catchAsync = require("../utils/catchAsync");

const getAuditLogs = catchAsync(async (req, res, next) => {
    const { entity, action, userId, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (entity) filter.entity = entity;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [logs, total] = await Promise.all([
        AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit, 10)),
        AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
        success: true,
        count: logs.length,
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
        data: { logs },
    });
});

module.exports = {
    getAuditLogs,
};
