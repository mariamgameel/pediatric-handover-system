const AuditLog = require("../models/AuditLog");

/**
 * Creates an immutable audit log entry.
 * @param {Object} params
 * @param {Object} params.req - Express request object containing req.user and ip
 * @param {string} params.action - e.g. 'CREATE_PATIENT', 'UPDATE_STATUS', 'RECORD_DETERIORATION'
 * @param {string} params.entity - e.g. 'Patient', 'VitalSign', 'ManagementPlan'
 * @param {string|ObjectId} params.entityId - ID of the target record
 * @param {Object} [params.previousValue] - State before mutation
 * @param {Object} [params.newValue] - State after mutation
 */
const logAudit = async ({ req, action, entity, entityId, previousValue = null, newValue = null }) => {
    try {
        if (!req || !req.user) return;

        await AuditLog.create({
            user: req.user._id,
            userId: req.user.userId || "UNKNOWN",
            userName: req.user.name || "Unknown User",
            action,
            entity,
            entityId,
            previousValue,
            newValue,
            ipAddress: req.ip || req.connection?.remoteAddress,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error("Audit log failed to write:", error.message);
        // We do not reject the main transaction if audit log fails, but we log the error.
    }
};

module.exports = logAudit;
