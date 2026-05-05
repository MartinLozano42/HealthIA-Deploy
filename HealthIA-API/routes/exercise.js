import express from "express";
import {
  addExercise,
  getExercisesByUser,
  getLastExerciseUpdate,
  getRoutineByUser,
  saveExerciseRoutine,
} from "../controllers/exerciseController.js";

const router = express.Router();

router.post("/", addExercise);
router.post("/routine", saveExerciseRoutine);
router.put("/routine/:idUser", saveExerciseRoutine);
router.get("/routine/:idUser", getRoutineByUser);
router.get("/last-update/:idUser", getLastExerciseUpdate);
router.get("/:userId", getExercisesByUser);

export default router;
