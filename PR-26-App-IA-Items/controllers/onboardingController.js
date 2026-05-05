import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveOnboarding } from "../services/services/api";
import { getActivityLevels, getDiets, getFoods, getOnboarding } from "../services/services/api";

export const TOTAL_ONBOARDING_STEPS = 5;

export const SEX_OPTIONS = [
  { label: "Masculino", value: "M" },
  { label: "Femenino", value: "F" },
  { label: "Otro", value: "O" },
];

export const validatePositiveNumber = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0;
};

export const formatBirthDateForApi = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDefaultBirthDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

export const formatBirthDate = (date) =>
  date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatDateForWebInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseWebInputDate = (value) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

export const loadActivityLevelOptions = async () => {
  const levels = await getActivityLevels();

  return levels.map((level) => ({
    id: level.idActivityLevel,
    label: level.levelName,
    subtitle: level.description,
  }));
};

export const loadDietOptions = async () => {
  const diets = await getDiets();

  return diets
    .map((diet) => String(diet).trim())
    .filter((diet) => diet.length > 0);
};

export const loadFoodGroups = async (dietType) => {
  const foods = await getFoods(dietType);
  const groupedFoods = {};

  for (const food of foods) {
    if (!groupedFoods[food.category]) {
      groupedFoods[food.category] = [];
    }

    groupedFoods[food.category].push(food.name);
  }

  return Object.entries(groupedFoods).map(([title, items]) => ({
    title,
    items,
  }));
};

export const getActivityLevelLabel = (options, activityLevelId) =>
  options.find((option) => option.id === activityLevelId)?.label ||
  "Sin definir";

export const validateOnboardingStep = (step, data) => {
  switch (step) {
    case 1:
      if (data.username.trim().length < 3)
        return "El nombre de usuario debe tener al menos 3 caracteres";
      if (!data.birthDate) return "Selecciona tu fecha de nacimiento";
      if (!validatePositiveNumber(data.currentWeight))
        return "Ingresa un peso actual valido (mayor a 0)";
      if (!validatePositiveNumber(data.height))
        return "Ingresa una altura valida (mayor a 0)";
      return null;
    case 2:
      if (!validatePositiveNumber(data.targetWeight))
        return "Ingresa un peso objetivo valido (mayor a 0)";
      if (!data.activityLevelId) return "Selecciona tu nivel de actividad";
      return null;
    case 3:
      if (!data.dietType) return "Selecciona un tipo de dieta";
      return null;
    case 4:
      if (!data.ingredients || data.ingredients.length === 0)
        return "Selecciona al menos un ingrediente";
      return null;
    default:
      return null;
  }
};

export const validateOnboardingData = (data) => {
  if (data.username.trim().length < 3)
    return "Nombre de usuario invalido (min 3 caracteres)";
  if (!data.birthDate) return "Fecha de nacimiento requerida";
  if (!validatePositiveNumber(data.currentWeight))
    return "Peso actual invalido";
  if (!validatePositiveNumber(data.height)) return "Altura invalida";
  if (!validatePositiveNumber(data.targetWeight))
    return "Peso objetivo invalido";
  if (!data.activityLevelId) return "Nivel de actividad requerido";
  if (!data.dietType) return "Tipo de dieta requerido";
  if (!data.ingredients || data.ingredients.length === 0)
    return "Selecciona al menos un ingrediente";
  return null;
};

export const saveOnboardingAndResolveRoute = async ({
  paramsIdUser,
  cameFromRegister,
  registerData,
  data,
}) => {
  let storedUser = null;
  let idUser = Number(paramsIdUser || 0);

  try {
    const userData = await AsyncStorage.getItem("user");
    if (userData) {
      storedUser = JSON.parse(userData);
    }
  } catch {
    // Fallback silencioso cuando AsyncStorage no esta disponible en runtime.
  }

  if (!idUser) {
    idUser = Number(storedUser?.id || 0);
  }

  const payload = {
    idUser: idUser || null,
    username: data.username.trim(),
    birthDate: formatBirthDateForApi(data.birthDate),
    currentWeight: parseFloat(data.currentWeight),
    height: parseFloat(data.height),
    targetWeight: parseFloat(data.targetWeight),
    sex: data.sex || null,
    activityLevel: data.activityLevelId,
    doesWeightTraining: data.doesWeightTraining,
    dietType: data.dietType,
    ingredients: data.ingredients,
  };

  if (!idUser && cameFromRegister) {
    const registerName = String(registerData?.name || "").trim();
    const registerEmail = String(registerData?.email || "")
      .trim()
      .toLowerCase();
    const registerPassword = String(registerData?.password || "").trim();

    if (!registerName || !registerEmail || !registerPassword) {
      throw new Error(
        "No se encontraron los datos del registro. Vuelve a crear la cuenta.",
      );
    }

    payload.registerName = registerName;
    payload.registerEmail = registerEmail;
    payload.registerPassword = registerPassword;
  }

  if (!idUser && !cameFromRegister) {
    throw new Error("No se encontro el usuario. Vuelve a iniciar sesion.");
  }

  const response = await saveOnboarding(payload);
  const createdUserId = Number(response?.data?.idUser || idUser || 0);

  if (cameFromRegister) {
    try {
      await AsyncStorage.removeItem("user");
    } catch {
      // Si falla almacenamiento local, igual continuamos porque el onboarding ya se guardo en backend.
    }

    return {
      shouldShowRegisterSuccess: true,
      nextRoute: "/login",
      createdUserId,
    };
  }

  if (storedUser) {
    try {
      const updatedUser = {
        ...storedUser,
        id: createdUserId || storedUser.id,
        onboardingComplete: true,
      };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    } catch {
      // Si falla almacenamiento local, igual continuamos porque el onboarding ya se guardo en backend.
    }
  }

  return {
    shouldShowRegisterSuccess: false,
    nextRoute: {
      pathname: "/(tabs)",
      params: { idUser: String(createdUserId || idUser) },
    },
  };
};

export const updateProfileBasics = async ({
  idUser,
  username,
  currentWeight,
  height,
  targetWeight,
}) => {
  const resolvedUserId = Number(idUser || 0);

  if (!resolvedUserId) {
    throw new Error("No se encontro el usuario. Inicia sesion nuevamente.");
  }

  const trimmedUsername = String(username || "").trim();
  if (trimmedUsername.length < 3) {
    throw new Error("El nombre debe tener al menos 3 caracteres");
  }

  const parsedWeight = parseFloat(String(currentWeight || "").replace(",", "."));
  const parsedHeightM = parseFloat(String(height || "").replace(",", "."));

  if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
    throw new Error("Ingresa un peso valido mayor a 0");
  }

  if (parsedWeight < 20 || parsedWeight > 400) {
    throw new Error("El peso debe estar entre 20 y 400 kg");
  }

  if (!Number.isFinite(parsedHeightM) || parsedHeightM <= 0) {
    throw new Error("Ingresa una altura valida mayor a 0");
  }

  if (parsedHeightM < 0.8 || parsedHeightM > 2.5) {
    throw new Error("La altura debe estar entre 80 y 250 cm");
  }

  const onboardingRaw = await getOnboarding(resolvedUserId);
  const onboarding = onboardingRaw?.data ?? onboardingRaw;

  if (!onboarding) {
    throw new Error("No se encontro el perfil actual para actualizar");
  }

  const rawBirthDate =
    onboarding.birthDate ?? onboarding.fechaNacimiento ?? onboarding.preferences?.birthDate;
  const resolvedBirthDate = rawBirthDate
    ? String(rawBirthDate).slice(0, 10)
    : null;
  const resolvedTargetWeight = parseFloat(
    String(targetWeight ?? onboarding.targetWeight ?? onboarding.pesoObjetivo ?? onboarding.goalWeight ?? currentWeight),
  );
  const resolvedActivityLevel =
    Number(
      onboarding.activityLevel ??
        onboarding.activityLevelId ??
        onboarding.idActivityLevel ??
        onboarding.preferences?.activityLevel ??
        onboarding.preferences?.activityLevelId ??
        1,
    ) || 1;
  const resolvedDietType =
    onboarding.dietType ?? onboarding.tipoDieta ?? onboarding.preferences?.dietType ?? "Balanceada";
  const resolvedIngredients = Array.isArray(onboarding.ingredients)
    ? onboarding.ingredients
    : Array.isArray(onboarding.ingredientes)
      ? onboarding.ingredientes
      : Array.isArray(onboarding.preferences?.ingredients)
        ? onboarding.preferences.ingredients
        : Array.isArray(onboarding.preferences?.ingredientes)
          ? onboarding.preferences.ingredientes
          : [];

  const payload = {
    idUser: resolvedUserId,
    username: trimmedUsername,
    birthDate: resolvedBirthDate,
    currentWeight: parsedWeight,
    height: parsedHeightM,
    targetWeight: resolvedTargetWeight,
    sex: onboarding.sex ?? onboarding.sexo ?? onboarding.preferences?.sex ?? null,
    activityLevel: resolvedActivityLevel,
    doesWeightTraining: Boolean(
      onboarding.doesWeightTraining ??
      onboarding.useWeight ??
      onboarding.preferences?.doesWeightTraining ??
      onboarding.preferences?.useWeight,
    ),
    dietType: resolvedDietType,
    ingredients: resolvedIngredients,
  };

  if (!payload.birthDate) {
    throw new Error("No se encontro la fecha de nacimiento del perfil. Completa tu onboarding.");
  }

  const response = await saveOnboarding(payload);

  try {
    const userData = await AsyncStorage.getItem("user");
    if (userData) {
      const storedUser = JSON.parse(userData);
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          id: resolvedUserId,
          name: trimmedUsername,
          username: trimmedUsername,
        }),
      );
    }
  } catch {
    // Si falla AsyncStorage, el backend ya quedo actualizado.
  }

  return response;
};
