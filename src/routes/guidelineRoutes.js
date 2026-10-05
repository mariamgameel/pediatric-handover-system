const express = require("express");
const guidelineController = require("../controllers/guidelineController");
const { protect, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
    createGuidelineSchema,
    updateGuidelineSchema,
} = require("../validations/guidelineValidation");

const router = express.Router();

router.use(protect);

// All authenticated staff can read guidelines
router.get("/", guidelineController.getGuidelines);
router.get("/:id", guidelineController.getGuidelineById);

// Admin & Consultants can create and update guidelines
router.post(
    "/",
    authorize("Admin", "Consultant"),
    validate(createGuidelineSchema),
    guidelineController.createGuideline
);

router.patch(
    "/:id",
    authorize("Admin", "Consultant"),
    validate(updateGuidelineSchema),
    guidelineController.updateGuideline
);

// Admin only can delete guidelines
router.delete("/:id", authorize("Admin"), guidelineController.deleteGuideline);

module.exports = router;
