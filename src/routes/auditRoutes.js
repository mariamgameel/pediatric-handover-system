const express = require("express");
const auditController = require("../controllers/auditController");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);
router.use(authorize("Admin"));

router.get("/", auditController.getAuditLogs);

module.exports = router;
