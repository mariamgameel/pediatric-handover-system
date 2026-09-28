const express = require("express");
const investigationController = require("../controllers/investigationController");
const { protect, authorize } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const {
    requestInvestigationSchema,
    recordResultSchema,
    reviewResultSchema,
} = require("../validations/investigationValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.post("/", validate(requestInvestigationSchema), investigationController.requestInvestigation);
router.patch("/:id/result", validate(recordResultSchema), investigationController.recordResult);
router.patch(
    "/:id/review",
    authorize("Specialist", "Consultant"), // Admin is automatically bypassed
    validate(reviewResultSchema),
    investigationController.reviewResult
);
router.get("/patient/:patientId", investigationController.getPatientInvestigations);
router.get("/unreviewed", investigationController.getUnreviewedResults);

module.exports = router;
