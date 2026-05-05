import pool from "../db/connection.js";
import { createNotification } from "./notificationController.js";


const normalizeIntensity = (rawIntensity) => {
  const normalized = String(rawIntensity || "medio").trim().toLowerCase();

  if (normalized === "media") {
    return "medio";
  }

  if (["bajo", "medio", "alto"].includes(normalized)) {
    return normalized;
  }

  return "medio";
};


const estimateCalories = ({ exerciseType, durationMinutes, intensity }) => {
  const intensityFactor = {
    bajo: 0.08,
    medio: 0.1,
    alto: 0.13,
  };

  const typeFactor = {
    cardio: 1.1,
    ciclismo: 1.15,
    natacion: 1.2,
    hiit: 1.3,
    fuerza: 1.05,
    yoga: 0.75,
  };

  const base = Number(durationMinutes || 0) * 70;
  const intensityMultiplier = intensityFactor[intensity] || intensityFactor.medio;
  const typeMultiplier = typeFactor[String(exerciseType || "").toLowerCase()] || 1;

  return Math.max(0, Math.round(base * intensityMultiplier * typeMultiplier));
};

const getOrCreateDailyLog = async (connection, userId, logDate) => {
  const [existing] = await connection.query(
    "SELECT idDailyLog FROM dailylog WHERE idUser = ? AND logDate = ? LIMIT 1",
    [userId, logDate]
  );

  if (existing.length > 0) {
    return existing[0].idDailyLog;
  }

  const [created] = await connection.query(
    `INSERT INTO dailylog
     (idUser, logDate, netKcal, dailyKcalObjetive, foodKcal, burnedKcal, proteins, carbohydrates, fats, proteinObjetive, carbTarget, fatTarget, waterMl, waterTargetMl)
     VALUES (?, ?, 0, 2000, 0, 0, 0, 0, 0, 130, 250, 65, 0, 2500)`,
    [userId, logDate]
  );

  return created.insertId;
};

export const addExercise = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const {
      idUser,
      exerciseName,
      exerciseType,
      durationMinutes,
      burnedCalories,
      caloriesBurned,
      intensity,
      registeredDate,
      dateModification,
      doesWeightTraining,
      trainingDays,
    } = req.body;

    const userId = Number(idUser);
    const duration = Number(durationMinutes);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "idUser es requerido y debe ser valido" });
    }

    const safeExerciseName = String(exerciseName || exerciseType || "").trim();
    if (!safeExerciseName) {
      return res.status(400).json({ message: "exerciseName es requerido" });
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({ message: "durationMinutes debe ser mayor a 0" });
    }

    const normalizedIntensity = normalizeIntensity(intensity);
    const rawCalories = burnedCalories ?? caloriesBurned;
    const effectiveBurnedCalories = Number.isFinite(Number(rawCalories))
      ? Math.max(0, Math.round(Number(rawCalories)))
      : estimateCalories({
          exerciseType: exerciseType || exerciseName,
          durationMinutes: duration,
          intensity: normalizedIntensity,
        });

    const eventDate = registeredDate ? new Date(registeredDate) : new Date();
    if (Number.isNaN(eventDate.getTime())) {
      return res.status(400).json({ message: "registeredDate invalido" });
    }

    const modificationDate = dateModification ? new Date(dateModification) : null;
    if (dateModification && Number.isNaN(modificationDate.getTime())) {
      return res.status(400).json({ message: "dateModification invalido" });
    }

    const logDate = eventDate.toISOString().slice(0, 10);
    const eventDateTime = eventDate.toISOString().slice(0, 19).replace("T", " ");

    await connection.beginTransaction();
    transactionStarted = true;

    const dailyLogId = await getOrCreateDailyLog(connection, userId, logDate);

    const doesWeightTrainingBool = doesWeightTraining ? 1 : 0;
    const trainingDaysJson = Array.isArray(trainingDays) ? JSON.stringify(trainingDays) : null;

    const [result] = await connection.query(
      `INSERT INTO exerciselog
       (idUser, exerciseName, durationMinutes, burnedCalories, intensity, registeredDate, dateModification, doesWeightTraining, trainingDays)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        safeExerciseName,
        Math.round(duration),
        effectiveBurnedCalories,
        normalizedIntensity,
        eventDateTime,
        modificationDate ? modificationDate.toISOString().slice(0, 19).replace("T", " ") : null,
        doesWeightTrainingBool,
        trainingDaysJson,
      ]
    );

    await connection.query(
      "UPDATE dailylog SET burnedKcal = burnedKcal + ? WHERE idDailyLog = ?",
      [effectiveBurnedCalories, dailyLogId]
    );

    await connection.commit();
    transactionStarted = false;

    createNotification(
      userId,
      "exercise",
      "Ejercicio registrado",
      `${safeExerciseName} · ${Math.round(duration)} min`
    ).catch(() => {});

    return res.status(201).json({
      message: "Ejercicio guardado",
      idExercise: result.insertId,
      burnedCalories: effectiveBurnedCalories,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("addExercise error:", error);
    return res.status(500).json({
      message: "No se pudo guardar el ejercicio",
      error: String(error && error.message ? error.message : error),
    });
  } finally {
    connection.release();
  }
};

export const saveExerciseRoutine = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const {
      idUser,
      exerciseType,
      intensity,
      durationMinutes,
      doesWeightTraining,
      trainingDays,
      caloriesBurned,
      burnedCalories,
    } = req.body;

    const userId = Number(idUser);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "idUser es requerido y debe ser valido" });
    }

    const normalizedIntensity = normalizeIntensity(intensity);
    const safeDuration = Math.max(5, Number(durationMinutes || 30) || 30);
    const daysArray = Array.isArray(trainingDays)
      ? trainingDays.filter((day) => typeof day === "string" && day.trim() !== "")
      : [];
    const safeExerciseName = String(exerciseType || "").trim();
    const doesWeightTrainingBool = doesWeightTraining ? 1 : 0;
    const trainingDaysJson = JSON.stringify(daysArray);
    const rawCalories = burnedCalories ?? caloriesBurned;
    const effectiveBurnedCalories = Number.isFinite(Number(rawCalories))
      ? Math.max(0, Math.round(Number(rawCalories)))
      : estimateCalories({ exerciseType, durationMinutes: safeDuration, intensity: normalizedIntensity });

    await connection.beginTransaction();
    transactionStarted = true;

    const [existing] = await connection.query(
      "SELECT idExercise FROM exerciselog WHERE idUser = ? ORDER BY idExercise DESC LIMIT 1",
      [userId]
    );

    if (existing.length === 0) {
      await connection.query(
        `INSERT INTO exerciselog
         (idUser, exerciseName, durationMinutes, burnedCalories, intensity, registeredDate, doesWeightTraining, trainingDays)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [userId, safeExerciseName, Math.round(safeDuration), effectiveBurnedCalories, normalizedIntensity, doesWeightTrainingBool, trainingDaysJson]
      );
    } else {
      await connection.query(
        `UPDATE exerciselog
         SET exerciseName = ?, durationMinutes = ?, burnedCalories = ?, intensity = ?, doesWeightTraining = ?, trainingDays = ?, dateModification = NOW()
         WHERE idExercise = ?`,
        [safeExerciseName, Math.round(safeDuration), effectiveBurnedCalories, normalizedIntensity, doesWeightTrainingBool, trainingDaysJson, existing[0].idExercise]
      );
    }

    await connection.commit();
    transactionStarted = false;

    createNotification(
      userId,
      "exercise",
      "Rutina guardada",
      `Rutina de ${safeExerciseName} guardada · ${Math.round(safeDuration)} min`
    ).catch(() => {});

    return res.status(200).json({
      message: "Rutina guardada",
      data: {
        idUser: userId,
        exerciseType: safeExerciseName,
        intensity: normalizedIntensity,
        durationMinutes: Math.round(safeDuration),
        doesWeightTraining: Boolean(doesWeightTraining),
        trainingDays: daysArray,
        burnedCalories: effectiveBurnedCalories,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("saveExerciseRoutine error:", error);
    return res.status(500).json({
      message: "No se pudo guardar la rutina",
      error: String(error && error.message ? error.message : error),
    });
  } finally {
    connection.release();
  }
};

export const getRoutineByUser = async (req, res) => {
  try {
    const userId = Number(req.params.idUser);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "idUser invalido" });
    }

    const [rows] = await pool.query(
      `SELECT idExercise, idUser, exerciseName, durationMinutes, burnedCalories, intensity,
              doesWeightTraining, trainingDays, registeredDate, dateModification
       FROM exerciselog
       WHERE idUser = ?
       ORDER BY idExercise DESC
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No se encontro rutina para este usuario" });
    }

    const row = rows[0];
    return res.status(200).json({
      ...row,
      doesWeightTraining: Boolean(row.doesWeightTraining),
      trainingDays: typeof row.trainingDays === "string" ? JSON.parse(row.trainingDays) : (row.trainingDays ?? []),
    });
  } catch (error) {
    console.error("getRoutineByUser error:", error);
    return res.status(500).json({
      message: "No se pudo obtener la rutina",
      error: String(error && error.message ? error.message : error),
    });
  }
};

export const getLastExerciseUpdate = async (req, res) => {
  try {
    const userId = Number(req.params.idUser);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "idUser invalido" });
    }

    const [rows] = await pool.query(
      "SELECT MAX(dateModification) AS lastModification FROM exerciselog WHERE idUser = ?",
      [userId]
    );

    const raw = rows[0].lastModification;
    return res.status(200).json({
      lastModification: raw ? raw.toISOString().slice(0, 19) : null,
    });
  } catch (error) {
    console.error("getLastExerciseUpdate error:", error);
    return res.status(500).json({
      message: "No se pudo obtener la ultima actualizacion",
      error: String(error && error.message ? error.message : error),
    });
  }
};

export const getExercisesByUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId invalido" });
    }

    const [rows] = await pool.query(
      `SELECT idExercise, idUser, exerciseName, durationMinutes, burnedCalories, intensity,
              doesWeightTraining, trainingDays, registeredDate, dateModification
       FROM exerciselog
       WHERE idUser = ?
       ORDER BY registeredDate ASC
       LIMIT 100`,
      [userId]
    );

    const parsed = rows.map((row) => ({
      ...row,
      doesWeightTraining: Boolean(row.doesWeightTraining),
      trainingDays: typeof row.trainingDays === "string" ? JSON.parse(row.trainingDays) : (row.trainingDays ?? []),
    }));

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("getExercisesByUser error:", error);
    return res.status(500).json({
      message: "No se pudieron obtener los ejercicios",
      error: String(error && error.message ? error.message : error),
    });
  }
};
