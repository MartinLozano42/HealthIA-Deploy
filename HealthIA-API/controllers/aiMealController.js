import fs from "fs/promises";
import pool from "../db/connection.js";
import { analyzeMealImageWithGemini } from "../services/geminiService.js";
import { createNotification } from "./notificationController.js";

const ALLOWED_MEAL_TYPES = ["desayuno", "almuerzo", "cena", "snack"];

const pad = (value) => String(value).padStart(2, "0");

const toMysqlDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toMysqlDateTime = (date) =>
  `${toMysqlDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const parseRequestDate = (rawValue) => {
  const date = rawValue ? new Date(rawValue) : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
};

const parseJsonField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildImageUrl = (req, file) =>
  `${req.protocol}://${req.get("host")}/uploads/meal-images/${file.filename}`;

const getSingleRow = async (query, params = []) => {
  const [rows] = await pool.query(query, params);
  return rows[0] || null;
};

const getOrCreateDailyLog = async (idUser, logDate) => {
  const [result] = await pool.query(
    `
    INSERT INTO dailylog (idUser, logDate)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE idDailyLog = LAST_INSERT_ID(idDailyLog)
    `,
    [idUser, logDate]
  );

  return Number(result.insertId);
};

const loadUserContext = async (idUser) => {
  const user = await getSingleRow(
    `SELECT id, name, email, gender, status FROM users WHERE id = ? LIMIT 1`,
    [idUser]
  );

  const onboarding = await getSingleRow(
    `
    SELECT idUser, birthDate, sex, dietType, ingredientsJson
    FROM user_onboarding_preferences
    WHERE idUser = ?
    LIMIT 1
    `,
    [idUser]
  );

  const stats = await getSingleRow(
    `
    SELECT id, idUser, weight, height, targetWeight, recordDate, idActivityLevel
    FROM UserStats
    WHERE idUser = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [idUser]
  );

  const objective = await getSingleRow(
    `
    SELECT id, idUser, goalType, goalValue, startDate, endDate, completed
    FROM objective
    WHERE idUser = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [idUser]
  );

  const activity = await getSingleRow(
    `
    SELECT id, idUser, idActivityLevel, trainingType, trainingDaysPerWeek, estimatedMinutesPerDay, intensity, estimatedBurnedKcal, updatedAt
    FROM useractivityprofile
    WHERE idUser = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [idUser]
  );

  const [foods] = await pool.query(
    `
    SELECT idFood, idUser, name, category, unitMeasure, calories, proteins, fats, carbs, dietCompatibility
    FROM food
    WHERE idUser IS NULL OR idUser = ?
    ORDER BY idFood ASC
    `,
    [idUser]
  );

  return {
    user: user || {},
    onboarding: {
      ...(onboarding || {}),
      ingredients: parseJsonField(onboarding?.ingredientsJson),
    },
    stats: stats || {},
    objective: objective || {},
    activity: activity || {},
    foods: Array.isArray(foods) ? foods : [],
  };
};

const matchFoodsToIngredients = (ingredients = [], foods = []) => {
  if (!Array.isArray(ingredients) || !Array.isArray(foods)) return [];

  return ingredients
    .map((ingredient) => {
      const ingredientName = String(ingredient?.name || "").trim();
      const normalizedIngredient = normalizeText(ingredientName);

      if (!normalizedIngredient) return null;

      const matches = foods
        .filter((food) => {
          const normalizedFood = normalizeText(food.name);
          return (
            normalizedFood === normalizedIngredient ||
            normalizedFood.includes(normalizedIngredient) ||
            normalizedIngredient.includes(normalizedFood)
          );
        })
        .slice(0, 3)
        .map((food) => ({
          idFood: food.idFood,
          name: food.name,
          category: food.category,
          unitMeasure: food.unitMeasure,
          calories: Number(food.calories),
          proteins: Number(food.proteins),
          carbs: Number(food.carbs),
          fats: Number(food.fats),
          dietCompatibility: food.dietCompatibility,
        }));

      if (matches.length === 0) return null;

      return {
        ingredient: ingredientName,
        matches,
      };
    })
    .filter(Boolean);
};

export const analyzeMealWithGemini = async (req, res) => {
  let idPhotoMeal = null;

  try {
    const idUser = Number(req.body.idUser || 0);
    const mealType = String(req.body.mealType || "").trim().toLowerCase();
    const userDescription = String(req.body.userDescription || "").trim();
    const requestedDate = parseRequestDate(req.body.dateTime);

    if (!idUser) {
      return res.status(400).json({ message: "idUser es requerido" });
    }

    if (!ALLOWED_MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({
        message: `mealType invalido. Usa: ${ALLOWED_MEAL_TYPES.join(", ")}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Debes enviar una imagen en el campo image",
      });
    }

    const userContext = await loadUserContext(idUser);

    if (!userContext.user?.id) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    const logDate = toMysqlDate(requestedDate);
    const dateTime = toMysqlDateTime(requestedDate);
    const imageUrl = buildImageUrl(req, req.file);
    const imageMimeType = req.file.mimetype;

    const idDailyLog = await getOrCreateDailyLog(idUser, logDate);

    const [photoInsertResult] = await pool.query(
      `
      INSERT INTO photomeallog (
        idUser,
        idDailyLog,
        mealType,
        dateTime,
        aiDescription,
        userDescription,
        estimatedCalories,
        estimatedProteins,
        estimatedCarbs,
        estimatedFats,
        finalCalories,
        finalProteins,
        finalCarbs,
        finalFats,
        confidenceScore,
        userConfirmed,
        imageUrl,
        imageStorageProvider,
        imageMimeType,
        analysisStatus,
        geminiModel,
        aiRawJson,
        analysisError
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        idUser,
        idDailyLog,
        mealType,
        dateTime,
        null,
        userDescription || null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        0,
        imageUrl,
        "local",
        imageMimeType,
        "pending",
        null,
        null,
        null,
      ]
    );

    idPhotoMeal = Number(photoInsertResult.insertId);

    const imageBuffer = await fs.readFile(req.file.path);

    const geminiResult = await analyzeMealImageWithGemini({
      imageBuffer,
      mimeType: imageMimeType,
      mealType,
      userDescription,
      userContext,
    });

    const matchedFoods = matchFoodsToIngredients(geminiResult.ingredients, userContext.foods);

    await pool.query(
      `
      UPDATE photomeallog
      SET
        aiDescription = ?,
        estimatedCalories = ?,
        estimatedProteins = ?,
        estimatedCarbs = ?,
        estimatedFats = ?,
        confidenceScore = ?,
        analysisStatus = 'processed',
        geminiModel = ?,
        aiRawJson = ?,
        analysisError = NULL
      WHERE idPhotoMeal = ?
      `,
      [
        geminiResult.detectedMealName,
        geminiResult.estimatedCalories,
        geminiResult.estimatedProteins,
        geminiResult.estimatedCarbs,
        geminiResult.estimatedFats,
        geminiResult.confidenceScore,
        geminiResult.model,
        JSON.stringify(geminiResult.rawResponse),
        idPhotoMeal,
      ]
    );

    await pool.query(
      `
      INSERT INTO aimealanalysis (
        idPhotoMeal,
        detectedPortion,
        estimatedCalories,
        estimatedProteins,
        estimatedCarbs,
        estimatedFats,
        confidenceScore,
        detectedMealName,
        detectedIngredientsJson,
        matchedFoodsJson,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        idPhotoMeal,
        geminiResult.detectedPortion,
        geminiResult.estimatedCalories,
        geminiResult.estimatedProteins,
        geminiResult.estimatedCarbs,
        geminiResult.estimatedFats,
        geminiResult.confidenceScore,
        geminiResult.detectedMealName,
        JSON.stringify(geminiResult.ingredients),
        JSON.stringify(matchedFoods),
        geminiResult.notes || null,
      ]
    );

    const mealName = geminiResult.detectedMealName || "Comida";
    const mealKcal = Math.round(geminiResult.estimatedCalories || 0);

    createNotification(
      idUser,
      "meal",
      "Comida registrada",
      `Registraste ${mealName} · ${mealKcal} kcal`
    ).catch(() => {});

    pool.query(
      `SELECT dl.dailyKcalObjetive,
              COALESCE(SUM(p.estimatedCalories), 0) AS totalKcal
       FROM dailylog dl
       LEFT JOIN photomeallog p
         ON p.idDailyLog = dl.idDailyLog AND p.analysisStatus = 'processed'
       WHERE dl.idDailyLog = ?
       GROUP BY dl.idDailyLog, dl.dailyKcalObjetive`,
      [idDailyLog]
    ).then(([[row]]) => {
      if (row && Number(row.totalKcal) > Number(row.dailyKcalObjetive)) {
        createNotification(
          idUser,
          "goal",
          "Meta calórica superada",
          `Superaste tu meta diaria de ${Math.round(row.dailyKcalObjetive)} kcal`
        ).catch(() => {});
      }
    }).catch(() => {});

    return res.status(201).json({
      message: "Analisis de comida generado correctamente",
      data: {
        idPhotoMeal,
        idDailyLog,
        imageUrl,
        mealType,
        detectedMealName: geminiResult.detectedMealName,
        detectedPortion: geminiResult.detectedPortion,
        estimatedCalories: geminiResult.estimatedCalories,
        estimatedProteins: geminiResult.estimatedProteins,
        estimatedCarbs: geminiResult.estimatedCarbs,
        estimatedFats: geminiResult.estimatedFats,
        confidenceScore: geminiResult.confidenceScore,
        ingredients: geminiResult.ingredients,
        matchedFoods,
        notes: geminiResult.notes,
        model: geminiResult.model,
      },
    });
  } catch (error) {
    console.error("Error en analyzeMealWithGemini:", error);

    if (idPhotoMeal) {
      try {
        await pool.query(
          `
          UPDATE photomeallog
          SET
            analysisStatus = 'failed',
            analysisError = ?
          WHERE idPhotoMeal = ?
          `,
          [String(error.message || error), idPhotoMeal]
        );
      } catch (updateError) {
        console.error("No se pudo actualizar el estado failed:", updateError);
      }
    }

    return res.status(500).json({
      message: "No se pudo analizar la comida con Gemini",
      error: error.message,
    });
    

    if (error?.status === 503) {
  return res.status(503).json({
    success: false,
    message: "Gemini está con alta demanda en este momento. Intenta nuevamente en unos minutos.",
  });
}
  }
};