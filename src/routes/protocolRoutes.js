const express = require("express");
const protocolController = require("../controllers/protocolController");
const { protect, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
    createProtocolSchema,
    updateProtocolSchema,
    executeProtocolSchema,
} = require("../validations/protocolValidation");

const router = express.Router();

router.use(protect);

// All clinicians can read protocols
router.get("/", protocolController.getProtocols);
router.get("/:id", protocolController.getProtocolById);

// Clinicians can log protocol execution on a patient
router.post("/:id/execute", validate(executeProtocolSchema), protocolController.executeProtocol);

// Admin can create, update, and delete protocols
router.post(
    "/",
    authorize("Admin"),
    validate(createProtocolSchema),
    protocolController.createProtocol
);

router.patch(
    "/:id",
    authorize("Admin"),
    validate(updateProtocolSchema),
    protocolController.updateProtocol
);

router.delete("/:id", authorize("Admin"), protocolController.deleteProtocol);

module.exports = router;
