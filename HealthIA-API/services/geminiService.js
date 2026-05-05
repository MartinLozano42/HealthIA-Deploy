import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1beta" },
});

const MEAL_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    detectedMealName: { type: "string" },
    detectedPortion: { type: "string" },
    estimatedCalories: { type: "number" },
    estimatedProteins: { type: "number" },
    estimatedCarbs: { type: "number" },
    estimatedFats: { type: "number" },
    confidenceScore: { type: "number" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          estimatedQuantity: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name"],
      },
    },
    notes: { type: "string" },
  },
  required: [
    "detectedMealName",
    "detectedPortion",
    "estimatedCalories",
    "estimatedProteins",
    "estimatedCarbs",
    "estimatedFats",
    "confidenceScore",
    "ingredients",
    "notes",
  ],
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampConfidence = (value) => {
  const parsed = normalizeNumber(value, 0);
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return Number(parsed.toFixed(2));
};

const extractJsonFromText = (text) => {
  if (!text || typeof text !== "string") {
    throw new Error("Gemini no devolvió texto válido");
  }

  const clean = text.trim();

  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = clean.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }

    throw new Error("No se pudo parsear el JSON devuelto por Gemini");
  }
};

const buildFoodsCatalogText = (foods = []) => {
  if (!Array.isArray(foods) || foods.length === 0) {
    return "No hay alimentos base registrados.";
  }

  return foods
    .slice(0, 80)
    .map(
      (food) =>
        `${food.name} | categoria: ${food.category} | unidad: ${food.unitMeasure} | kcal: ${food.calories} | prot: ${food.proteins} | carb: ${food.carbs} | grasa: ${food.fats}`
    )
    .join("\n");
};

const buildPrompt = ({ mealType, userDescription, userContext }) => {
  const { user, onboarding, stats, objective, activity, foods } = userContext;

  const ingredientsPreference = Array.isArray(onboarding.ingredients)
    ? onboarding.ingredients.join(", ")
    : "sin preferencias registradas";

  const foodsCatalogText = buildFoodsCatalogText(foods);

  return `
Analiza la imagen de una comida y responde SOLO con JSON valido.

Objetivo:
- Detectar el plato principal o nombre general de la comida.
- Detectar ingredientes visibles.
- Estimar porcion.
- Estimar calorias, proteinas, carbohidratos y grasas.
- Dar un confidenceScore entre 0 y 100.
- Si la imagen no es clara, reflejalo en notes y baja confidenceScore.

Reglas:
- No pongas markdown.
- No pongas texto extra fuera del JSON.
- Usa estimaciones realistas para una sola porcion visible en la foto.
- Si no puedes identificar un ingrediente con seguridad, puedes omitirlo o poner una confianza baja.
- El nombre del plato debe ser corto y claro.
- Las cantidades estimadas pueden ser como "120 g", "1 taza", "2 unidades", etc.

Contexto del usuario:
- idUser: ${user.id ?? "N/A"}
- nombre: ${user.name ?? "N/A"}
- sexo: ${onboarding.sex ?? user.gender ?? "N/A"}
- dieta preferida: ${onboarding.dietType ?? "N/A"}
- ingredientes preferidos: ${ingredientsPreference}
- peso actual: ${stats.weight ?? "N/A"}
- altura: ${stats.height ?? "N/A"}
- peso objetivo: ${stats.targetWeight ?? "N/A"}
- objetivo actual: ${objective.goalType ?? "N/A"} (${objective.goalValue ?? "N/A"})
- nivel de actividad: ${activity.idActivityLevel ?? stats.idActivityLevel ?? "N/A"}
- tipo de entrenamiento: ${activity.trainingType ?? "N/A"}

Datos de la comida:
- tipo de comida: ${mealType}
- descripcion del usuario: ${userDescription || "sin descripcion"}

Catalogo base de alimentos del sistema:
${foodsCatalogText}

Devuelve exactamente este JSON:
{
  "detectedMealName": "string",
  "detectedPortion": "string",
  "estimatedCalories": 0,
  "estimatedProteins": 0,
  "estimatedCarbs": 0,
  "estimatedFats": 0,
  "confidenceScore": 0,
  "ingredients": [
    {
      "name": "string",
      "estimatedQuantity": "string",
      "confidence": 0
    }
  ],
  "notes": "string"
}
`.trim();
};

export const analyzeMealImageWithGemini = async ({
  imageBuffer,
  mimeType,
  mealType,
  userDescription,
  userContext,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY en el .env");
  }

  const prompt = buildPrompt({
    mealType,
    userDescription,
    userContext,
  });

  const base64ImageData = imageBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64ImageData,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
  responseMimeType: "application/json",
  responseJsonSchema: MEAL_ANALYSIS_SCHEMA,
  temperature: 0.2,
},
  });

  const parsed = extractJsonFromText(response.text);

  return {
    detectedMealName: String(parsed.detectedMealName || "Comida no identificada").trim(),
    detectedPortion: String(parsed.detectedPortion || "1 porcion").trim(),
    estimatedCalories: Math.round(normalizeNumber(parsed.estimatedCalories, 0)),
    estimatedProteins: Math.round(normalizeNumber(parsed.estimatedProteins, 0)),
    estimatedCarbs: Math.round(normalizeNumber(parsed.estimatedCarbs, 0)),
    estimatedFats: Math.round(normalizeNumber(parsed.estimatedFats, 0)),
    confidenceScore: clampConfidence(parsed.confidenceScore),
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients
          .map((item) => ({
            name: String(item?.name || "").trim(),
            estimatedQuantity: String(item?.estimatedQuantity || "").trim(),
            confidence: clampConfidence(item?.confidence),
          }))
          .filter((item) => item.name)
      : [],
    notes: String(parsed.notes || "").trim(),
    rawResponse: parsed,
    model: GEMINI_MODEL,
  };
};
const DAILY_DIET_PLAN_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          time: { type: "string" },
          mealType: { type: "string" },
          name: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          ingredients: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "id",
          "time",
          "mealType",
          "name",
          "calories",
          "protein",
          "carbs",
          "fat",
          "ingredients",
        ],
      },
    },
    notes: { type: "string" },
  },
  required: ["meals", "notes"],
};

const buildDietPlanFoodsText = (foods = []) => {
  if (!Array.isArray(foods) || foods.length === 0) {
    return "No hay ingredientes disponibles.";
  }

  return foods
    .slice(0, 60)
    .map(
      (food) =>
        `${food.name} | categoria: ${food.category} | unidad: ${food.unitMeasure} | kcal: ${food.calories} | prot: ${food.proteins} | carb: ${food.carbs} | grasa: ${food.fats}`
    )
    .join("\n");
};

const buildDietPlanPrompt = ({ userContext, availableFoods, dietType }) => {
  const user = userContext?.user || {};
  const stats = userContext?.stats || {};
  const activity = userContext?.activity || {};
  const preferences = userContext?.preferences || {};

  return `
Genera un plan de alimentacion diario facil de seguir usando SOLO los ingredientes disponibles del usuario.
Responde SOLO con JSON valido, sin markdown y sin texto extra.

Reglas:
- Genera 4 comidas: Desayuno, Almuerzo, Snack y Cena.
- Usa solamente ingredientes del listado disponible.
- El plan debe ser simple, realista y casero.
- Respeta la dieta preferida: ${dietType || preferences.dietType || "Balanceada"}.
- Si hay pocos ingredientes, reutiliza algunos pero no inventes ingredientes nuevos.
- Las cantidades deben ir dentro del array ingredients, por ejemplo: "120 g Arroz".
- Usa valores aproximados de calorias y macros para cada comida.
- No recomiendes suplementos.
- No recomiendes medicamentos.
- No agregues explicaciones fuera del JSON.

Contexto del usuario:
- idUser: ${user.id ?? "N/A"}
- nombre: ${user.name ?? "N/A"}
- sexo: ${preferences.sex ?? user.gender ?? "N/A"}
- peso actual: ${stats.weight ?? "N/A"}
- altura: ${stats.height ?? "N/A"}
- peso objetivo: ${stats.targetWeight ?? "N/A"}
- nivel de actividad: ${activity.idActivityLevel ?? stats.idActivityLevel ?? "N/A"}
- entrenamiento: ${activity.trainingType ?? "N/A"}

Ingredientes disponibles:
${buildDietPlanFoodsText(availableFoods)}

Devuelve exactamente esta estructura:
{
  "meals": [
    {
      "id": 1,
      "time": "Desayuno",
      "mealType": "desayuno",
      "name": "string",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "ingredients": ["string"]
    }
  ],
  "notes": "string"
}
`.trim();
};

export const generateDietPlanWithGemini = async ({ userContext, availableFoods, dietType }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta configurar GEMINI_API_KEY en el .env");
  }

  const prompt = buildDietPlanPrompt({
    userContext,
    availableFoods,
    dietType,
  });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: DAILY_DIET_PLAN_SCHEMA,
      temperature: 0.35,
    },
  });

  const parsed = extractJsonFromText(response.text);

  return {
    meals: Array.isArray(parsed.meals)
      ? parsed.meals.map((meal, index) => ({
          id: Number(meal.id || index + 1),
          time: String(meal.time || `Comida ${index + 1}`).trim(),
          mealType: String(meal.mealType || "comida").trim().toLowerCase(),
          name: String(meal.name || "Comida sugerida").trim(),
          calories: Math.round(normalizeNumber(meal.calories, 0)),
          protein: Math.round(normalizeNumber(meal.protein, 0)),
          carbs: Math.round(normalizeNumber(meal.carbs, 0)),
          fat: Math.round(normalizeNumber(meal.fat, 0)),
          ingredients: Array.isArray(meal.ingredients)
            ? meal.ingredients.map((item) => String(item || "").trim()).filter(Boolean)
            : [],
        }))
      : [],
    notes: String(parsed.notes || "").trim(),
    rawResponse: parsed,
    model: GEMINI_MODEL,
  };
};