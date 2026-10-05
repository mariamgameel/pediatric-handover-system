const express = require("express");
const multer = require("multer");
const shiftController = require("../controllers/shiftController");
const { protect, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
    createShiftSchema,
    updateShiftSchema,
    overrideShiftSchema,
    toggleExemptionSchema,
    requestSwapSchema,
    reviewSwapSchema,
} = require("../validations/shiftValidation");

// Configure multer memory storage for Excel sheets (up to 10MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

router.use(protect);

// Clinicians can view their own schedule
router.get("/my", shiftController.getMyShifts);

// Ward shift roster (visible to all clinicians for situational awareness)
router.get("/roster", shiftController.getAllShifts);

// Shift check-in & check-out
router.post("/check-in/:id", shiftController.checkInShift);
router.post("/check-out/:id", shiftController.checkOutShift);

// Shift Swaps
router.get("/swaps", shiftController.listShiftSwaps);
router.post("/swaps", validate(requestSwapSchema), shiftController.requestShiftSwap);

// Admin-only shift management & Excel roster import
router.get("/excel-template", authorize("Admin"), shiftController.downloadExcelTemplate);
router.post("/upload-excel", authorize("Admin"), upload.single("file"), shiftController.uploadExcelShifts);
router.post("/commit-excel", authorize("Admin"), shiftController.commitValidatedShifts);
router.patch("/swaps/:id", authorize("Admin"), validate(reviewSwapSchema), shiftController.reviewShiftSwap);

router.route("/")
    .get(shiftController.getAllShifts)
    .post(authorize("Admin"), validate(createShiftSchema), shiftController.createShift);

router.route("/:id")
    .patch(authorize("Admin"), validate(updateShiftSchema), shiftController.updateShift)
    .delete(authorize("Admin"), shiftController.deleteShift);

router.post("/override/:userId", authorize("Admin"), validate(overrideShiftSchema), shiftController.grantShiftOverride);
router.patch("/exempt/:userId", authorize("Admin"), validate(toggleExemptionSchema), shiftController.toggleShiftExemption);

module.exports = router;
