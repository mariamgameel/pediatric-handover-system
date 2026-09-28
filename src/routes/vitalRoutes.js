const express = require("express");
const vitalSignController = require("../controllers/vitalSignController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const { createVitalSignSchema } = require("../validations/patientValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.post("/", validate(createVitalSignSchema), vitalSignController.createVitalSign);
router.get("/patient/:patientId", vitalSignController.getPatientVitals);

module.exports = router;
