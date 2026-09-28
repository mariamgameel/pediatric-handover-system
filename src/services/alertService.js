const { Alert } = require("../models/Alert");

/**
 * Creates an alert for clinical teams.
 * @param {Object} params
 * @param {string|ObjectId} params.patientId
 * @param {string} params.type - One of ALERT_TYPES
 * @param {string} params.message
 * @param {string} [params.priority='Medium'] - 'Low'|'Medium'|'High'|'Critical'
 * @param {Object} [params.relatedEvent] - { entityType, entityId }
 */
const createAlert = async ({ patientId, type, message, priority = "Medium", relatedEvent = null }) => {
    try {
        const alert = await Alert.create({
            patient: patientId,
            type,
            message,
            priority,
            relatedEvent,
            createdAt: new Date(),
        });
        return alert;
    } catch (error) {
        console.error("Failed to generate clinical alert:", error.message);
        return null;
    }
};

module.exports = {
    createAlert,
};
