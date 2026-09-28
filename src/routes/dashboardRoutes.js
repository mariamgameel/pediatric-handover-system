const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.get("/", dashboardController.getDashboardSummary);

module.exports = router;
