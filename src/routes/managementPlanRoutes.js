const express = require("express");
const managementPlanController = require("../controllers/managementPlanController");
const { protect, authorize } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const { createManagementPlanSchema } = require("../validations/patientValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.post(
    "/",
    authorize("Specialist", "Consultant"), // Admin is automatically bypassed inside authorize()
    validate(createManagementPlanSchema),
    managementPlanController.createManagementPlan
);

router.get("/patient/:patientId", managementPlanController.getPatientPlans);

module.exports = router;
