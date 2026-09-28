const express = require("express");
const handoverController = require("../controllers/handoverController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const {
    createHandoverSchema,
    acknowledgeHandoverSchema,
} = require("../validations/handoverValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.get("/preview/:patientId", handoverController.getHandoverPreview);
router.post("/", validate(createHandoverSchema), handoverController.createHandoverRecord);
router.patch("/:id/acknowledge", validate(acknowledgeHandoverSchema), handoverController.acknowledgeHandover);
router.get("/patient/:patientId", handoverController.getHandoverHistory);
router.get("/ward-sheet", handoverController.getWardHandoverSheet);

module.exports = router;
