import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getExerciseHistory,
  getOnboarding,
  saveExerciseRoutine,
  saveExerciseSession,
} from "../services/services/api";

export const EXERCISE_TYPES = [
  { key: "cardio", label: "Cardio", iconName: "run", backendValue: "cardio" },
  { key: "strength", label: "Fuerza", iconName: "weight-lifter", backendValue: "fuerza" },
  { key: "yoga", label: "Yoga", iconName: "yoga", backendValue: "yoga" },
  { key: "cycling", label: "Ciclismo", iconName: "bike", backendValue: "ciclismo" },
  { key: "swim", label: "Natacion", iconName: "swim", backendValue: "natacion" },
  { key: "hiit", label: "HIIT", iconName: "flash", backendValue: "hiit" },
];

export const WEEK_DAYS = [
  { key: "L", label: "L" },
  { key: "M", label: "M" },
  { key: "X", label: "X" },
  { key: "J", label: "J" },
  { key: "V", label: "V" },
  { key: "S", label: "S" },
  { key: "D", label: "D" },
];

export const INTENSITY_LEVELS = ["Baja", "Media", "Alta"];

export const MET_BY_TYPE_AND_INTENSITY = {
  cardio: { Baja: 4.3, Media: 7.0, Alta: 11.0 },
  strength: { Baja: 3.5, Media: 6.0, Alta: 8.0 },
  yoga: { Baja: 2.5, Media: 3.0, Alta: 4.0 },
  cycling: { Baja: 4.0, Media: 8.0, Alta: 12.0 },
  swim: { Baja: 6.0, Media: 8.3, Alta: 10.0 },
  hiit: { Baja: 8.0, Media: 10.5, Alta: 12.5 },
};

export const INTENSITY_MAP = {
  Baja: "bajo",
  Media: "medio",
  Alta: "alto",
};

export const INTENSITY_REVERSE_MAP = {
  bajo: "Baja",
  medio: "Media",
  alto: "Alta",
};

export const DAYS_BACKEND_MAP = {
  L: "lunes",
  M: "martes",
  X: "miercoles",
  J: "jueves",
  V: "viernes",
  S: "sabado",
  D: "domingo",
};

export const parsePositiveNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const getAgeFromDate = (birthDateRaw) => {
  if (!birthDateRaw) return null;

  const birthDate = new Date(String(birthDateRaw));

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  if (age <= 0 || age > 120) {
    return null;
  }

  return age;
};

export const loadExerciseProfile = async (idUser) => {
  if (!idUser) {
    return {
      profileWeight: null,
      profileAge: null,
      profileSex: "O",
      activityLevelId: null,
    };
  }

  const onboardingRaw = await getOnboarding(idUser);
  const onboarding = onboardingRaw?.data ?? onboardingRaw;

  const weight =
    parsePositiveNumber(onboarding?.currentWeight) ??
    parsePositiveNumber(onboarding?.weight) ??
    parsePositiveNumber(onboarding?.pesoActual);

  const age = getAgeFromDate(
    onboarding?.birthDate ?? onboarding?.fechaNacimiento,
  );

  const rawSex = String(onboarding?.sex || "O").trim().toUpperCase();
  const sex = rawSex === "M" || rawSex === "F" ? rawSex : "O";
  const activityLevelId = Number(
    onboarding?.activityLevelId ?? onboarding?.activityLevel ?? onboarding?.idActivityLevel ?? 0,
  ) || null;

  return {
    profileWeight: weight,
    profileAge: age,
    profileSex: sex,
    activityLevelId,
  };
};

export const loadExistingRoutine = async (idUser) => {
  const resolvedId = await resolveExerciseUserId(idUser);

  if (!resolvedId) return null;

  const history = await getExerciseHistory(resolvedId);

  if (!history || history.length === 0) return null;

  const last = history[history.length - 1];

  const exerciseType =
    EXERCISE_TYPES.find((t) => t.backendValue === (last.exerciseName ?? last.exerciseType ?? last.trainingType))?.key ??
    EXERCISE_TYPES[0].key;

  const intensity = INTENSITY_REVERSE_MAP[last.intensity] ?? "Media";
  const duration = Number(last.durationMinutes) || 30;
  const activityLevelId = Number(last.activityLevelId || last.idActivityLevel) || null;
  const useWeight = Boolean(last.doesWeightTraining);

  const rawDays = Array.isArray(last.trainingDays)
    ? last.trainingDays
    : typeof last.trainingDays === "string"
      ? JSON.parse(last.trainingDays)
      : [];

  const DAYS_REVERSE = Object.fromEntries(
    Object.entries(DAYS_BACKEND_MAP).map(([k, v]) => [v, k])
  );
  const days = rawDays.map((d) => DAYS_REVERSE[d] ?? d);

  const routine = { exerciseType, intensity, duration, activityLevelId, useWeight, days, trainingDays: rawDays };

  await AsyncStorage.setItem("exerciseRoutineCache", JSON.stringify(routine));

  return routine;
};

export const getCurrentMet = (selectedType, intensity) => {
  const metByType = MET_BY_TYPE_AND_INTENSITY[selectedType];

  if (!metByType) {
    return 6;
  }

  return metByType[intensity] ?? 6;
};

export const calculateCaloriesEstimate = ({
  selectedType,
  intensity,
  duration,
  heartRate = null,
  profileWeight,
  profileAge,
  profileSex,
  useWeight,
}) => {
  const currentMet = getCurrentMet(selectedType, intensity);
  const weightKg = profileWeight ?? 70;
  const age = profileAge ?? 30;
  const sexFactor =
    profileSex === "F" ? 0.95 : profileSex === "M" ? 1 : 0.98;

  const baseCalories = (currentMet * 3.5 * weightKg * duration) / 200;
  const estimatedMaxHr = 208 - 0.7 * age;
  const zoneByIntensity =
    intensity === "Baja" ? 0.55 : intensity === "Alta" ? 0.85 : 0.7;
  const targetHr = Math.max(estimatedMaxHr * zoneByIntensity, 90);
  const enteredHeartRate = parsePositiveNumber(heartRate);
  const effectiveHeartRate = enteredHeartRate ?? targetHr;
  const hrFactor = Math.max(0.75, Math.min(1.25, effectiveHeartRate / targetHr));
  const weightTrainingFactor = useWeight ? 1.1 : 1;

  return Math.round(baseCalories * hrFactor * sexFactor * weightTrainingFactor);
};

export const sanitizeHeartRateInput = (value) =>
  String(value || "").replace(/[^0-9]/g, "");

export const toggleTrainingDay = (days, dayKey) =>
  days.includes(dayKey)
    ? days.filter((day) => day !== dayKey)
    : [...days, dayKey];

export const getExerciseTypeLabel = (selectedType) =>
  EXERCISE_TYPES.find((type) => type.key === selectedType)?.label ?? "-";

export const getExerciseTypeBackendValue = (selectedType) =>
  EXERCISE_TYPES.find((type) => type.key === selectedType)?.backendValue ?? "cardio";

export const resolveExerciseUserId = async (idUser) => {
  const numericIdUser = Number(idUser || 0);

  if (numericIdUser) {
    return numericIdUser;
  }

  try {
    const storedUserRaw = await AsyncStorage.getItem("user");

    if (!storedUserRaw) {
      return 0;
    }

    const storedUser = JSON.parse(storedUserRaw);
    return Number(storedUser?.id || storedUser?.idUser || 0);
  } catch {
    return 0;
  }
};

export const isValidDateValue = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
};

export const formatDateForBackend = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const saveRoutine = async ({
  idUser,
  activityLevelId,
  selectedType,
  intensity,
  duration,
  useWeight,
  days,
  types,
  calories,
  registeredDate,
  dateModification,
  isEdit = false,
  isResync = false,
}) => {
  const resolvedUserId = await resolveExerciseUserId(idUser);

  if (!resolvedUserId) {
    throw new Error("No se encontro el usuario. Inicia sesion nuevamente.");
  }

  if (!days || days.length === 0) {
    throw new Error("Selecciona al menos un dia de entrenamiento.");
  }

  const resolvedActivityLevel = Number(activityLevelId || 0) || undefined;
  const resolvedExerciseType =
    types.find((t) => t.key === selectedType)?.backendValue ??
    getExerciseTypeBackendValue(selectedType);
  const resolvedIntensity = INTENSITY_MAP[intensity] ?? "medio";
  const resolvedRegisteredDate =
    isValidDateValue(registeredDate) ? registeredDate : formatDateForBackend();
  const resolvedDateModification = isValidDateValue(dateModification)
    ? dateModification
    : isEdit || isResync
      ? formatDateForBackend()
      : undefined;
  const resolvedTrainingDays = (days ?? []).map(
    (d) => DAYS_BACKEND_MAP[d] ?? d
  );

  const payload = {
    idUser: resolvedUserId,
    activityLevelId: resolvedActivityLevel,
    activityLevel: resolvedActivityLevel,
    exerciseType: resolvedExerciseType,
    type: resolvedExerciseType,
    intensity: resolvedIntensity,
    durationMinutes: duration,
    duration,
    registeredDate: resolvedRegisteredDate,
    doesWeightTraining: useWeight,
    useWeight,
    trainingDays: resolvedTrainingDays,
    days: resolvedTrainingDays,
    caloriesBurned: calories ?? undefined,
    estimatedCalories: calories ?? undefined,
  };

  if (resolvedDateModification) {
    payload.dateModification = resolvedDateModification;
  }

  // Guarda la sesion realizada para historial de ejercicios.
  await saveExerciseSession(payload);
  // Guarda perfil/rutina para que backend actualice useractivityprofile.
  await saveExerciseRoutine(payload);

  await AsyncStorage.setItem("exerciseRoutineCache", JSON.stringify({
    duration,
    trainingDays: resolvedTrainingDays,
  }));
};
