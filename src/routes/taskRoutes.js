const express = require("express");
const taskController = require("../controllers/taskController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const { createTaskSchema, updateTaskStatusSchema } = require("../validations/taskValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.get("/my", taskController.getMyTasks);
router.get("/overdue", taskController.getOverdueTasks);
router.post("/", validate(createTaskSchema), taskController.createTask);
router.patch("/:id/status", validate(updateTaskStatusSchema), taskController.updateTaskStatus);
router.get("/patient/:patientId", taskController.getPatientTasks);

module.exports = router;
