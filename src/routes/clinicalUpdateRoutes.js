const express = require("express");
const clinicalUpdateController = require("../controllers/clinicalUpdateController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const {
    createClinicalUpdateSchema,
    recordDeteriorationSchema,
} = require("../validations/patientValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.post("/", validate(createClinicalUpdateSchema), clinicalUpdateController.createClinicalUpdate);
router.post("/deterioration", validate(recordDeteriorationSchema), clinicalUpdateController.recordDeterioration);
router.get("/patient/:patientId", clinicalUpdateController.getPatientUpdates);

module.exports = router;
