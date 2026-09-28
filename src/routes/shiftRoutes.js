const express = require("express");
const shiftController = require("../controllers/shiftController");
const { protect, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
    createShiftSchema,
    updateShiftSchema,
    overrideShiftSchema,
    toggleExemptionSchema,
} = require("../validations/shiftValidation");

const router = express.Router();

router.use(protect);

// Clinicians can view their own schedule
router.get("/my", shiftController.getMyShifts);

// Admin-only shift management routes
router.use(authorize("Admin"));

router.route("/")
    .get(shiftController.getAllShifts)
    .post(validate(createShiftSchema), shiftController.createShift);

router.route("/:id")
    .patch(validate(updateShiftSchema), shiftController.updateShift);

router.post("/override/:userId", validate(overrideShiftSchema), shiftController.grantShiftOverride);
router.patch("/exempt/:userId", validate(toggleExemptionSchema), shiftController.toggleShiftExemption);

module.exports = router;
