const express = require("express");
const manpowerController = require("../controllers/manpowerController");
const { protect, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
    createStaffProfileSchema,
    updateStaffProfileSchema,
    requestLeaveSchema,
    reviewLeaveSchema,
} = require("../validations/manpowerValidation");

const router = express.Router();

router.use(protect);

// Live ward coverage & staffing ratios (available to all clinicians)
router.get("/live-coverage", manpowerController.getLiveWardCoverage);

// Staff directory
router.get("/staff", manpowerController.getStaffProfiles);
router.get("/staff/:id", manpowerController.getStaffProfileById);

// Staff leaves
router.get("/leaves", manpowerController.getLeaves);
router.post("/leaves", validate(requestLeaveSchema), manpowerController.requestLeave);

// Admin-only staff profile and leave management
router.post(
    "/staff",
    authorize("Admin"),
    validate(createStaffProfileSchema),
    manpowerController.createStaffProfile
);

router.patch(
    "/staff/:id",
    authorize("Admin"),
    validate(updateStaffProfileSchema),
    manpowerController.updateStaffProfile
);

router.delete("/staff/:id", authorize("Admin"), manpowerController.deleteStaffProfile);

router.patch(
    "/leaves/:id",
    authorize("Admin"),
    validate(reviewLeaveSchema),
    manpowerController.approveRejectLeave
);

module.exports = router;
