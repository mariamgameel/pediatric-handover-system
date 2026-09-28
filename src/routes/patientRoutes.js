const express = require("express");
const patientController = require("../controllers/patientController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const {
    createPatientSchema,
    updatePatientStatusSchema,
    dischargePatientSchema,
} = require("../validations/patientValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.route("/")
    .get(patientController.getAllPatients)
    .post(validate(createPatientSchema), patientController.createPatient);

router.route("/:id")
    .get(patientController.getPatientById);

router.patch("/:id/status", validate(updatePatientStatusSchema), patientController.updatePatientStatus);
router.post("/:id/discharge", validate(dischargePatientSchema), patientController.dischargePatient);
router.get("/:id/timeline", patientController.getTimeline);
router.get("/:id/what-changed", patientController.getWhatChanged);

module.exports = router;
