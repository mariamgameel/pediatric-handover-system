const express = require("express");
const activeProblemController = require("../controllers/activeProblemController");
const { protect } = require("../middlewares/auth");
const verifyShiftAccess = require("../middlewares/verifyShiftAccess");
const validate = require("../middlewares/validate");
const { createProblemSchema, resolveProblemSchema } = require("../validations/patientValidation");

const router = express.Router();

router.use(protect);
router.use(verifyShiftAccess);

router.post("/", validate(createProblemSchema), activeProblemController.createProblem);
router.patch("/:id/resolve", validate(resolveProblemSchema), activeProblemController.resolveProblem);
router.patch("/:id/update", activeProblemController.addProblemUpdate);
router.get("/patient/:patientId", activeProblemController.getPatientProblems);

module.exports = router;
