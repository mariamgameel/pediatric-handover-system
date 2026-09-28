const VitalSign = require("../models/VitalSign");
const { Patient } = require("../models/Patient");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");

const createVitalSign = catchAsync(async (req, res, next) => {
    const {
        patient: patientId,
        temperature,
        heartRate,
        respiratoryRate,
        bloodPressure,
        spO2,
        gcs,
        weight,
        oxygenSupport,
        ivFluids,
        devices,
    } = req.body;

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return next(new AppError("Patient not found", 404));
    }

    if (patient.dischargeStatus && patient.dischargeStatus.isDischarged) {
        return next(new AppError("Cannot record vitals for a discharged patient", 400));
    }

    const vitalSign = await VitalSign.create({
        patient: patientId,
        temperature,
        heartRate,
        respiratoryRate,
        bloodPressure,
        spO2,
        gcs,
        weight,
        oxygenSupport,
        ivFluids,
        devices,
        recordedBy: req.user._id,
        recordedAt: new Date(),
    });

    // Update patient's lastUpdatedBy and weight if updated
    patient.lastUpdatedBy = req.user._id;
    if (weight) patient.weight = weight;
    await patient.save();

    await logAudit({
        req,
        action: "RECORD_VITALS",
        entity: "VitalSign",
        entityId: vitalSign._id,
        newValue: {
            temp: temperature,
            hr: heartRate,
            rr: respiratoryRate,
            bp: bloodPressure,
            spO2,
            gcs,
        },
    });

    const populatedVital = await VitalSign.findById(vitalSign._id).populate("recordedBy", "userId name role");

    res.status(201).json({
        success: true,
        message: "Vital signs recorded successfully",
        data: { vitalSign: populatedVital },
    });
});

const getPatientVitals = catchAsync(async (req, res, next) => {
    const { patientId } = req.params;
    const { limit = 50 } = req.query;

    const vitals = await VitalSign.find({ patient: patientId })
        .populate("recordedBy", "userId name role")
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit, 10));

    res.status(200).json({
        success: true,
        count: vitals.length,
        data: { vitals },
    });
});

module.exports = {
    createVitalSign,
    getPatientVitals,
};
