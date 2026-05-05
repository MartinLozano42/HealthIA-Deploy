import pool from "../db/connection.js";
import { generateDietPlanWithGemini } from "../services/geminiService.js";
import { createNotification } from "./notificationController.js";

const DEFAULT_DIET_TYPE = "Balanceada";

const parseJsonArray = (rawValue) => {
  if (!rawValue) return [];

  if (Array.isArray(rawValue)) {
    return rawValue.map(String).map((v) => v.trim()).filter(Boolean);
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed)
        ? parsed.map(String).map((v) => v.trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  }

  return [];
};

const uniqueStrings = (values = []) => {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const clean = String(value || "").trim();
    if (!clean) continue;

    const key = clean.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(clean);
  }

  return output;
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMacro = (value) => Math.round(normalizeNumber(value, 0));

const normalizeFoodRow = (row) => ({
  idFood: Number(row.idFood),
  idUser: row.idUser === null || row.idUser === undefined ? null : Number(row.idUser),
  name: String(row.name || "").trim(),
  category: String(row.category || "Otros").trim(),
  unitMeasure: String(row.unitMeasure || "g").trim(),
  calories: normalizeNumber(row.calories, 0),
  proteins: normalizeNumber(row.proteins, 0),
  fats: normalizeNumber(row.fats, 0),
  carbs: normalizeNumber(row.carbs, 0),
  dietCompatibility: String(row.dietCompatibility || "all").trim(),
});

const estimateNutritionByFood = ({ name, category }) => {
  const foodName = String(name || "").toLowerCase();
  const foodCategory = String(category || "").toLowerCase();

  if (foodName.includes("pollo") || foodName.includes("pechuga")) {
    return { calories: 165, proteins: 31, carbs: 0, fats: 4 };
  }

  if (foodName.includes("atun") || foodName.includes("atún")) {
    return { calories: 132, proteins: 29, carbs: 0, fats: 1 };
  }

  if (foodName.includes("huevo")) {
    return { calories: 155, proteins: 13, carbs: 1, fats: 11 };
  }

  if (foodName.includes("res") || foodName.includes("carne")) {
    return { calories: 250, proteins: 26, carbs: 0, fats: 15 };
  }

  if (foodName.includes("cerdo")) {
    return { calories: 242, proteins: 27, carbs: 0, fats: 14 };
  }

  if (foodName.includes("salmon") || foodName.includes("salmón")) {
    return { calories: 208, proteins: 20, carbs: 0, fats: 13 };
  }

  if (foodName.includes("tofu")) {
    return { calories: 76, proteins: 8, carbs: 2, fats: 5 };
  }

  if (foodName.includes("arroz")) {
    return { calories: 130, proteins: 3, carbs: 28, fats: 0 };
  }

  if (foodName.includes("papa")) {
    return { calories: 77, proteins: 2, carbs: 17, fats: 0 };
  }

  if (foodName.includes("avena")) {
    return { calories: 389, proteins: 17, carbs: 66, fats: 7 };
  }

  if (foodName.includes("pan")) {
    return { calories: 265, proteins: 9, carbs: 49, fats: 3 };
  }

  if (foodName.includes("pasta")) {
    return { calories: 131, proteins: 5, carbs: 25, fats: 1 };
  }

  if (foodName.includes("quinoa")) {
    return { calories: 120, proteins: 4, carbs: 21, fats: 2 };
  }

  if (
    foodName.includes("platano") ||
    foodName.includes("plátano") ||
    foodName.includes("banana")
  ) {
    return { calories: 89, proteins: 1, carbs: 23, fats: 0 };
  }

  if (foodName.includes("manzana")) {
    return { calories: 52, proteins: 0, carbs: 14, fats: 0 };
  }

  if (foodName.includes("naranja")) {
    return { calories: 47, proteins: 1, carbs: 12, fats: 0 };
  }

  if (foodName.includes("mango")) {
    return { calories: 60, proteins: 1, carbs: 15, fats: 0 };
  }

  if (foodName.includes("berries") || foodName.includes("fresa")) {
    return { calories: 50, proteins: 1, carbs: 12, fats: 0 };
  }

  if (foodName.includes("leche")) {
    return { calories: 60, proteins: 3, carbs: 5, fats: 3 };
  }

  if (foodName.includes("yogur") || foodName.includes("yogurt")) {
    return { calories: 61, proteins: 4, carbs: 5, fats: 3 };
  }

  if (foodName.includes("queso")) {
    return { calories: 350, proteins: 25, carbs: 2, fats: 27 };
  }

  if (foodName.includes("kefir") || foodName.includes("kéfir")) {
    return { calories: 55, proteins: 4, carbs: 5, fats: 2 };
  }

  if (foodName.includes("aceite")) {
    return { calories: 884, proteins: 0, carbs: 0, fats: 100 };
  }

  if (foodName.includes("aguacate") || foodName.includes("palta")) {
    return { calories: 160, proteins: 2, carbs: 9, fats: 15 };
  }

  if (foodName.includes("almendra")) {
    return { calories: 579, proteins: 21, carbs: 22, fats: 50 };
  }

  if (foodName.includes("nuez") || foodName.includes("nueces")) {
    return { calories: 654, proteins: 15, carbs: 14, fats: 65 };
  }

  if (foodName.includes("semilla")) {
    return { calories: 534, proteins: 18, carbs: 29, fats: 42 };
  }

  if (foodName.includes("brocoli") || foodName.includes("brócoli")) {
    return { calories: 34, proteins: 3, carbs: 7, fats: 0 };
  }

  if (foodName.includes("espinaca")) {
    return { calories: 23, proteins: 3, carbs: 4, fats: 0 };
  }

  if (foodName.includes("pepino")) {
    return { calories: 15, proteins: 1, carbs: 4, fats: 0 };
  }

  if (foodName.includes("tomate")) {
    return { calories: 18, proteins: 1, carbs: 4, fats: 0 };
  }

  if (foodName.includes("zanahoria")) {
    return { calories: 41, proteins: 1, carbs: 10, fats: 0 };
  }

  if (foodCategory.includes("prote")) {
    return { calories: 160, proteins: 25, carbs: 0, fats: 5 };
  }

  if (foodCategory.includes("carbo")) {
    return { calories: 130, proteins: 3, carbs: 28, fats: 1 };
  }

  if (foodCategory.includes("fruta")) {
    return { calories: 60, proteins: 1, carbs: 15, fats: 0 };
  }

  if (foodCategory.includes("grasa")) {
    return { calories: 600, proteins: 5, carbs: 10, fats: 55 };
  }

  if (foodCategory.includes("lact")) {
    return { calories: 70, proteins: 4, carbs: 6, fats: 3 };
  }

  if (foodCategory.includes("verd")) {
    return { calories: 35, proteins: 2, carbs: 7, fats: 0 };
  }

  return { calories: 80, proteins: 3, carbs: 12, fats: 2 };
};

const getFoodRowsForUser = async ({ idUser, dietType }) => {
  const safeDietType = String(dietType || DEFAULT_DIET_TYPE).trim();

  const [rows] = await pool.query(
    `
    SELECT idFood, idUser, name, category, unitMeasure, calories, proteins, fats, carbs, dietCompatibility
    FROM food
    WHERE (idUser IS NULL OR idUser = 0 OR idUser = ?)
      AND (
        dietCompatibility IS NULL
        OR TRIM(dietCompatibility) = ''
        OR LOWER(dietCompatibility) = 'all'
        OR FIND_IN_SET(?, dietCompatibility) > 0
      )
    ORDER BY category, name
    `,
    [idUser, safeDietType]
  );

  return rows.map(normalizeFoodRow).filter((food) => food.name);
};

const getUserContext = async (idUser) => {
  const [userRows] = await pool.query(
    `SELECT id, name, email, role, status, gender
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [idUser]
  );

  if (userRows.length === 0) return null;

  const [statsRows] = await pool.query(
    `SELECT weight, height, targetWeight, idActivityLevel
     FROM UserStats
     WHERE idUser = ?
     ORDER BY id DESC
     LIMIT 1`,
    [idUser]
  );

  const [activityRows] = await pool.query(
    `SELECT idActivityLevel, trainingType, trainingDaysPerWeek, estimatedMinutesPerDay, intensity
     FROM useractivityprofile
     WHERE idUser = ?
     ORDER BY id DESC
     LIMIT 1`,
    [idUser]
  );

  const [prefRows] = await pool.query(
    `SELECT birthDate, sex, dietType, ingredientsJson
     FROM user_onboarding_preferences
     WHERE idUser = ?
     LIMIT 1`,
    [idUser]
  );

  const preferences = prefRows[0] || null;

  return {
    user: userRows[0],
    stats: statsRows[0] || null,
    activity: activityRows[0] || null,
    preferences: preferences
      ? {
          ...preferences,
          ingredients: parseJsonArray(preferences.ingredientsJson),
        }
      : null,
  };
};

const ensureUserPreferences = async ({ idUser, dietType, ingredients }) => {
  await pool.query(
    `INSERT INTO user_onboarding_preferences (idUser, dietType, ingredientsJson)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       dietType = COALESCE(VALUES(dietType), dietType),
       ingredientsJson = VALUES(ingredientsJson),
       updatedAt = NOW()`,
    [idUser, dietType || null, JSON.stringify(uniqueStrings(ingredients))]
  );
};

const findFood = (foods, categoryIncludes = [], usedNames = new Set()) => {
  const normalizedCategories = categoryIncludes.map((item) => item.toLowerCase());

  const byCategory = foods.find((food) => {
    const category = food.category.toLowerCase();

    return (
      !usedNames.has(food.name.toLowerCase()) &&
      normalizedCategories.some((item) => category.includes(item))
    );
  });

  if (byCategory) {
    usedNames.add(byCategory.name.toLowerCase());
    return byCategory;
  }

  const fallback =
    foods.find((food) => !usedNames.has(food.name.toLowerCase())) ||
    foods[0] ||
    null;

  if (fallback) usedNames.add(fallback.name.toLowerCase());

  return fallback;
};

const quantityForFood = (food, mealType) => {
  const category = food.category.toLowerCase();
  const unit = food.unitMeasure.toLowerCase();

  if (unit === "unidad" || unit === "unidades") return mealType === "snack" ? 1 : 2;
  if (category.includes("prote")) return mealType === "cena" ? 120 : 140;
  if (category.includes("carbo")) return mealType === "desayuno" ? 80 : 120;
  if (category.includes("grasa")) return unit === "ml" ? 10 : 25;
  if (category.includes("lact")) return 180;
  if (category.includes("fruta")) return 140;
  if (category.includes("verd")) return 120;

  return 100;
};

const nutritionFor = (food, quantity) => {
  const unit = food.unitMeasure.toLowerCase();
  const factor = unit === "unidad" || unit === "unidades" ? quantity : quantity / 100;

  return {
    calories: food.calories * factor,
    protein: food.proteins * factor,
    carbs: food.carbs * factor,
    fat: food.fats * factor,
  };
};

const buildMeal = ({ id, time, mealType, foods, title }) => {
  const ingredients = foods.filter(Boolean).map((food) => {
    const quantity = quantityForFood(food, mealType);
    const nutrition = nutritionFor(food, quantity);

    return {
      label: `${quantity} ${food.unitMeasure} ${food.name}`,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
    };
  });

  const totals = ingredients.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    id,
    time,
    mealType,
    name: title,
    calories: roundMacro(totals.calories),
    protein: roundMacro(totals.protein),
    carbs: roundMacro(totals.carbs),
    fat: roundMacro(totals.fat),
    ingredients: ingredients.map((item) => item.label),
  };
};

const buildLocalDietPlan = ({ availableFoods, dietType }) => {
  const foods = Array.isArray(availableFoods) ? availableFoods : [];

  if (foods.length === 0) {
    return {
      summary: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      meals: [],
      notes: "Agrega ingredientes disponibles para generar un plan.",
      generatedBy: "local",
    };
  }

  const usedBreakfast = new Set();
  const usedLunch = new Set();
  const usedSnack = new Set();
  const usedDinner = new Set();

  const meals = [
    buildMeal({
      id: 1,
      time: "Desayuno",
      mealType: "desayuno",
      title: "Desayuno simple con ingredientes disponibles",
      foods: [
        findFood(foods, ["carbo"], usedBreakfast),
        findFood(foods, ["prote", "lact"], usedBreakfast),
        findFood(foods, ["fruta"], usedBreakfast),
      ],
    }),
    buildMeal({
      id: 2,
      time: "Almuerzo",
      mealType: "almuerzo",
      title: "Plato fuerte equilibrado",
      foods: [
        findFood(foods, ["prote"], usedLunch),
        findFood(foods, ["carbo"], usedLunch),
        findFood(foods, ["verd"], usedLunch),
        findFood(foods, ["grasa"], usedLunch),
      ],
    }),
    buildMeal({
      id: 3,
      time: "Snack",
      mealType: "snack",
      title: "Snack rápido de casa",
      foods: [
        findFood(foods, ["fruta"], usedSnack),
        findFood(foods, ["grasa", "lact", "prote"], usedSnack),
      ],
    }),
    buildMeal({
      id: 4,
      time: "Cena",
      mealType: "cena",
      title: "Cena ligera y fácil",
      foods: [
        findFood(foods, ["prote"], usedDinner),
        findFood(foods, ["verd"], usedDinner),
        findFood(foods, ["carbo"], usedDinner),
      ],
    }),
  ].filter((meal) => meal.ingredients.length > 0);

  const summary = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    summary,
    meals,
    notes: `Plan generado usando tus ingredientes disponibles y dieta ${
      dietType || DEFAULT_DIET_TYPE
    }.`,
    generatedBy: "local",
  };
};

const normalizeGeneratedPlan = (plan, fallback) => {
  const meals = Array.isArray(plan?.meals)
    ? plan.meals
        .map((meal, index) => ({
          id: Number(meal.id || index + 1),
          time: String(meal.time || meal.mealType || `Comida ${index + 1}`).trim(),
          mealType: String(meal.mealType || meal.time || "comida").toLowerCase(),
          name: String(meal.name || meal.mealName || "Comida sugerida").trim(),
          calories: roundMacro(meal.calories),
          protein: roundMacro(meal.protein ?? meal.proteins),
          carbs: roundMacro(meal.carbs ?? meal.carbohydrates),
          fat: roundMacro(meal.fat ?? meal.fats),
          ingredients: Array.isArray(meal.ingredients)
            ? meal.ingredients.map((item) => String(item || "").trim()).filter(Boolean)
            : [],
        }))
        .filter((meal) => meal.name && meal.ingredients.length > 0)
    : [];

  if (meals.length === 0) return fallback;

  const summary = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    summary,
    meals,
    notes: String(plan?.notes || fallback.notes || "Plan generado correctamente.").trim(),
    generatedBy: "gemini",
  };
};

export const getAvailableIngredients = async (req, res) => {
  try {
    const idUser = Number(req.params.idUser || 0);

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }

    const userContext = await getUserContext(idUser);

    if (!userContext) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const dietType = String(userContext.preferences?.dietType || DEFAULT_DIET_TYPE).trim();
    const foods = await getFoodRowsForUser({ idUser, dietType });
    const selectedIngredients = uniqueStrings(userContext.preferences?.ingredients || []);

    return res.json({
      dietType,
      selectedIngredients,
      foods,
    });
  } catch (error) {
    console.error("getAvailableIngredients error:", error);
    return res.status(500).json({ message: "No se pudieron obtener los ingredientes" });
  }
};

export const updateAvailableIngredients = async (req, res) => {
  try {
    const idUser = Number(req.params.idUser || 0);
    const ingredients = uniqueStrings(req.body?.ingredients || []);
    const dietType = String(req.body?.dietType || DEFAULT_DIET_TYPE).trim();

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }

    await ensureUserPreferences({ idUser, dietType, ingredients });

    return res.json({
      message: "Ingredientes guardados",
      dietType,
      selectedIngredients: ingredients,
    });
  } catch (error) {
    console.error("updateAvailableIngredients error:", error);
    return res.status(500).json({ message: "No se pudieron guardar los ingredientes" });
  }
};

export const createUserFood = async (req, res) => {
  try {
    const idUser = Number(req.body?.idUser || 0);
    const name = String(req.body?.name || "").trim();
    const category = String(req.body?.category || "Otros").trim();
    const unitMeasure = String(req.body?.unitMeasure || "g").trim();
    const dietCompatibility = String(req.body?.dietCompatibility || "all").trim();

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }

    if (!name) {
      return res.status(400).json({ message: "El nombre del alimento es obligatorio" });
    }

    const estimated = estimateNutritionByFood({ name, category });

    const calories =
      req.body?.calories !== undefined && req.body?.calories !== ""
        ? normalizeNumber(req.body.calories, estimated.calories)
        : estimated.calories;

    const proteins =
      req.body?.proteins !== undefined && req.body?.proteins !== ""
        ? normalizeNumber(req.body.proteins, estimated.proteins)
        : estimated.proteins;

    const fats =
      req.body?.fats !== undefined && req.body?.fats !== ""
        ? normalizeNumber(req.body.fats, estimated.fats)
        : estimated.fats;

    const carbs =
      req.body?.carbs !== undefined && req.body?.carbs !== ""
        ? normalizeNumber(req.body.carbs, estimated.carbs)
        : estimated.carbs;

    const [existingRows] = await pool.query(
      `SELECT idFood, idUser, name, category, unitMeasure, calories, proteins, fats, carbs, dietCompatibility
       FROM food
       WHERE (idUser = ? OR idUser IS NULL OR idUser = 0)
         AND LOWER(name) = LOWER(?)
       LIMIT 1`,
      [idUser, name]
    );

    if (existingRows.length > 0) {
      const existingFood = normalizeFoodRow(existingRows[0]);

      return res.json({
        message: "El alimento ya existía",
        food: existingFood,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO food (idUser, name, category, unitMeasure, calories, proteins, fats, carbs, dietCompatibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUser,
        name,
        category,
        unitMeasure,
        calories,
        proteins,
        fats,
        carbs,
        dietCompatibility,
      ]
    );

    return res.status(201).json({
      message: "Alimento agregado",
      food: {
        idFood: Number(result.insertId),
        idUser,
        name,
        category,
        unitMeasure,
        calories,
        proteins,
        fats,
        carbs,
        dietCompatibility,
      },
    });
  } catch (error) {
    console.error("createUserFood error:", error);
    return res.status(500).json({ message: "No se pudo agregar el alimento" });
  }
};

export const deleteUserFood = async (req, res) => {
  try {
    const idFood = Number(req.params.idFood || 0);
    const idUser = Number(req.query?.idUser || req.body?.idUser || 0);

    if (!Number.isInteger(idFood) || idFood <= 0 || !Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    const [result] = await pool.query("DELETE FROM food WHERE idFood = ? AND idUser = ?", [
      idFood,
      idUser,
    ]);

    return res.json({
      message: result.affectedRows > 0 ? "Ingrediente eliminado" : "No se eliminó ningún ingrediente",
      deleted: result.affectedRows > 0,
    });
  } catch (error) {
    console.error("deleteUserFood error:", error);
    return res.status(500).json({ message: "No se pudo eliminar el ingrediente" });
  }
};

export const generateDietPlan = async (req, res) => {
  try {
    const idUser = Number(req.body?.idUser || 0);
    const selectedIngredients = uniqueStrings(
      req.body?.selectedIngredients || req.body?.ingredients || []
    );

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }

    if (selectedIngredients.length === 0) {
      return res.status(400).json({ message: "Selecciona al menos un ingrediente disponible" });
    }

    const userContext = await getUserContext(idUser);

    if (!userContext) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const dietType = String(
      req.body?.dietType || userContext.preferences?.dietType || DEFAULT_DIET_TYPE
    ).trim();

    await ensureUserPreferences({
      idUser,
      dietType,
      ingredients: selectedIngredients,
    });

    const allFoods = await getFoodRowsForUser({ idUser, dietType });
    const selectedSet = new Set(selectedIngredients.map((item) => item.toLowerCase()));

    let availableFoods = allFoods.filter((food) => selectedSet.has(food.name.toLowerCase()));

    if (availableFoods.length === 0) {
      availableFoods = selectedIngredients.map((name, index) => ({
        idFood: index + 1,
        idUser,
        name,
        category: "Otros",
        unitMeasure: "g",
        calories: 0,
        proteins: 0,
        fats: 0,
        carbs: 0,
        dietCompatibility: dietType,
      }));
    }

    const localFallback = buildLocalDietPlan({ availableFoods, dietType });

    try {
      const geminiPlan = await generateDietPlanWithGemini({
        userContext,
        availableFoods,
        dietType,
      });

      const normalizedPlan = normalizeGeneratedPlan(geminiPlan, localFallback);

      createNotification(
        idUser,
        "system",
        "Plan de dieta listo",
        "Tu plan de dieta semanal está listo"
      ).catch(() => {});

      return res.json(normalizedPlan);
    } catch (geminiError) {
      console.error("generateDietPlanWithGemini error:", geminiError);

      return res.json({
        ...localFallback,
        generatedBy: "local-fallback",
        notes:
          "Gemini no respondió correctamente. Se generó un plan local usando tus ingredientes disponibles.",
      });
    }
  } catch (error) {
    console.error("generateDietPlan error:", error);
    return res.status(500).json({ message: "No se pudo generar el plan de alimentación" });
  }
};