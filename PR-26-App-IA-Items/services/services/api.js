import { Platform } from "react-native";

const getDefaultApiUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.254.19.77:3000";
  }

  return "http://localhost:3000";
};

export const API_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultApiUrl();

export const parseJsonSafe = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const buildUrl = (path) => `${API_URL}${path}`;

const getJson = async (path) => {
  const response = await fetch(buildUrl(path));
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.message || `Error GET ${path}`);
  }

  return data;
};

const patchJson = async (path, body = {}) => {
  const response = await fetch(buildUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await parseJsonSafe(response);
};

const postJson = async (path, body) => {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.message || `Error POST ${path}`);
  }

  return data;
};

const putJson = async (path, body) => {
  const response = await fetch(buildUrl(path), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.message || `Error PUT ${path}`);
  }

  return data;
};

const postFormData = async (path, formData) => {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    body: formData,
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Error POST ${path}`);
  }

  return data;
};

export const loginUser = async (email, password) => {
  return await postJson("/auth/login", { email, password });
};

export const requestPasswordReset = async (email) => {
  return await postJson("/auth/forgot-password", { email });
};

export const resetPasswordWithToken = async (token, password) => {
  return await postJson("/auth/reset-password", { token, password });
};

export const getUsers = async () => {
  return await getJson("/users");
};

export const updateUserStatus = async (idUser, status) => {
  return await putJson(`/users/${idUser}/status`, { status });
};

export const getOnboarding = async (idUser) => {
  return await getJson(`/users/onboarding/${idUser}`);
};

export const saveOnboarding = async (payload) => {
  return await postJson("/users/onboarding", payload);
};

export const getActivityLevels = async () => {
  return await getJson("/activitylevels");
};

export const getDiets = async () => {
  return await getJson("/diets");
};

export const getFoods = async (dietType) => {
  const query = encodeURIComponent(dietType);
  return await getJson(`/foods?dietType=${query}`);
};

export const saveExerciseSession = async (payload) => {
  return await postJson("/exercise", payload);
};

export const saveExerciseRoutine = async (payload) => {
  return await postJson("/exercise/routine", payload);
};

export const getExerciseHistory = async (idUser) => {
  return await getJson(`/exercise/${idUser}`);
};

export const getLastExerciseUpdate = async (idUser) => {
  return await getJson(`/exercise/last-update/${idUser}`);
};

export const getAdminSummary = async () => {
  return await getJson("/stats/admin-summary");
};

export const analyzeMealPhoto = async ({
  idUser,
  mealType,
  userDescription,
  imageUri,
  mimeType,
  fileName,
}) => {
  const formData = new FormData();

  formData.append("idUser", String(idUser));
  formData.append("mealType", String(mealType || "almuerzo"));

  if (userDescription?.trim()) {
    formData.append("userDescription", userDescription.trim());
  }

  if (Platform.OS === "web") {
    const imageResponse = await fetch(imageUri);
    const imageBlob = await imageResponse.blob();

    formData.append("image", imageBlob, fileName || `meal-${Date.now()}.jpg`);
  } else {
    formData.append("image", {
      uri: imageUri,
      name: fileName || `meal-${Date.now()}.jpg`,
      type: mimeType || "image/jpeg",
    });
  }

  return await postFormData("/ai/meal/analyze", formData);
};
export const getAvailableIngredients = async (idUser) => {
  return await getJson(`/diet-plan/available/${idUser}`);
};

export const saveAvailableIngredients = async ({
  idUser,
  ingredients,
  dietType,
}) => {
  return await putJson(`/diet-plan/available/${idUser}`, {
    ingredients,
    dietType,
  });
};

export const generateDietPlan = async ({
  idUser,
  selectedIngredients,
  dietType,
}) => {
  return await postJson("/diet-plan/generate", {
    idUser,
    selectedIngredients,
    dietType,
  });
};

export const addCustomIngredient = async (payload) => {
  return await postJson("/diet-plan/foods", payload);
};

export const getUserProgressStats = async (idUser, range = "week") => {
  const safeRange = encodeURIComponent(range || "week");
  const path = `/stats/user/${idUser}?range=${safeRange}&_t=${Date.now()}`;

  console.log("STATS API URL:", `${API_URL}${path}`);

  return await getJson(path);
};

export const getNotifications = async (idUser) => {
  return await getJson(`/notifications/${idUser}`);
};

export const markNotificationRead = async (id) => {
  return await patchJson(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (idUser) => {
  return await patchJson(`/notifications/${idUser}/read-all`);
};
