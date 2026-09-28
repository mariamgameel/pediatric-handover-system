const express = require("express");
const alertController = require("../controllers/alertController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.use(protect);

router.get("/", alertController.getAlerts);
router.patch("/:id/read", alertController.markAlertAsRead);

module.exports = router;
