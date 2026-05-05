import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  requestWebNotificationPermission,
  scheduleWebNotification,
  cancelWebNotification,
  cancelAllWebNotifications,
} from "./webNotificationHandler";

const PREFS_KEY = "notifications_enabled";
const SCHEDULED_IDS_KEY = "monthly_notifications_ids";
const EXERCISE_REMINDER_IDS_KEY = "exercise_reminders_ids";
const REMINDER_DAYS = [3, 8, 14, 20, 26];
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;
const EXERCISE_REMINDER_DAYS_THRESHOLD = 7;
const WEB_TIMER_PREFIX = "web_notification_";
const TEST_INTERVAL_SECONDS = 60;
const TEST_INTERVAL_MS = TEST_INTERVAL_SECONDS * 1000;

let isHandlerConfigured = false;

// Las notificaciones push nativas solo están disponibles en un build de producción/desarrollo.
// En Expo Go (Android/iOS) están deshabilitadas porque el SDK 53 las removió de Expo Go.
// Se mantiene el array para uso informativo en la UI.
export const MONTHLY_REMINDERS = [
  {
    title: "Actualización mensual · Peso actual",
    body: "¿Cuánto pesas hoy? Registra tu peso actual para seguir tu progreso.",
  },
  {
    title: "Actualización mensual · Altura",
    body: "Revisa que tu altura esté correcta en tu perfil.",
  },
  {
    title: "Actualización mensual · Peso objetivo",
    body: "¿Sigue siendo el mismo tu peso objetivo? Revísalo en tu perfil.",
  },
  {
    title: "Actualización mensual · Actividad física",
    body: "Tu nivel de actividad puede haber cambiado. ¡Mantenlo actualizado!",
  },
  {
    title: "Resumen de tu progreso",
    body: "¡Un mes más! Entra a tu perfil y celebra tus logros del mes.",
  },
];

const isSupported = (): boolean => {
  return Platform.OS === "web" || Platform.OS === "android" || Platform.OS === "ios";
};

function ensureNotificationHandler(): void {
  if (isHandlerConfigured || Platform.OS === "web") return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  isHandlerConfigured = true;
}

function clampDayForMonth(year: number, month: number, day: number): number {
  const maxDay = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, day), maxDay);
}

function getNextReminderDate(day: number): Date {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let targetDay = clampDayForMonth(year, month, day);

  let candidate = new Date(year, month, targetDay, REMINDER_HOUR, REMINDER_MINUTE, 0, 0);

  if (candidate <= now) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    targetDay = clampDayForMonth(year, month, day);
    candidate = new Date(year, month, targetDay, REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  }

  return candidate;
}

async function setAndroidChannelIfNeeded(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("monthly-reminders", {
    name: "Recordatorios mensuales",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function saveScheduledIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignorar error de storage
  }
}

async function getStoredScheduledIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    console.log("[Notifications] Usando Web Notifications API");
    return await requestWebNotificationPermission();
  }

  if (!isSupported()) {
    console.log("[Notifications] requestNotificationPermissions: No soportado en esta plataforma");
    return false;
  }

  ensureNotificationHandler();

  try {
    const current = await Notifications.getPermissionsAsync();
    console.log("[Notifications] getPermissionsAsync resultado:", current);
    
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      console.log("[Notifications] Permisos ya otorgados");
      await setAndroidChannelIfNeeded();
      return true;
    }

    console.log("[Notifications] Solicitando permisos...");
    const requested = await Notifications.requestPermissionsAsync();
    console.log("[Notifications] requestPermissionsAsync resultado:", requested);
    
    const granted =
      requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (granted) {
      console.log("[Notifications] Permisos otorgados");
      await setAndroidChannelIfNeeded();
      return true;
    }

    console.log("[Notifications] Permisos otorgados:", granted);
    return granted;
  } catch (error) {
    console.error("[Notifications] Error en requestNotificationPermissions:", error);
    return false;
  }
}

export async function scheduleMonthlyReminders(): Promise<void> {
  if (Platform.OS === "web") {
    console.log("[Monthly Reminders] Configurando recordatorios en web...");
    try {
      const granted = await requestWebNotificationPermission();
      if (!granted) {
        console.log("[Monthly Reminders] Web: Permisos no otorgados");
        return;
      }

      const testDelayMs = TEST_INTERVAL_MS;

      MONTHLY_REMINDERS.forEach((reminder, i) => {
        const notifId = WEB_TIMER_PREFIX + "monthly_" + i;
        scheduleWebNotification(
          notifId,
          reminder.title,
          { body: reminder.body, icon: "/icon.png" },
          testDelayMs,
          testDelayMs
        );
      });

      console.log("[Monthly Reminders] ✅ Web: Agendados", MONTHLY_REMINDERS.length, "recordatorios cada", TEST_INTERVAL_SECONDS, "segundos");
      return;
    } catch (error) {
      console.error("[Monthly Reminders] Web: Error:", error);
      return;
    }
  }

  if (!isSupported()) {

    console.log("[Monthly Reminders] No soportado en esta plataforma");
    return;
  }

  try {
    console.log("[Monthly Reminders] Iniciando agendado...");

    const granted = await requestNotificationPermissions();
    console.log("[Monthly Reminders] Resultado de permisos:", granted);
    if (!granted) {
      console.log("[Monthly Reminders] Permisos no otorgados; se omite agendado");
      return;
    }

    console.log("[Monthly Reminders] Cancelando recordatorios previos...");
    await cancelMonthlyReminders();

    const ids: string[] = [];

    for (let i = 0; i < MONTHLY_REMINDERS.length; i += 1) {
      const reminder = MONTHLY_REMINDERS[i];
      const day = REMINDER_DAYS[i % REMINDER_DAYS.length];

      console.log("[Monthly Reminders] Agendando recordatorio", i + 1, "-", reminder.title);

      let trigger: Notifications.SchedulableNotificationTriggerInput;

      if (Platform.OS === "ios") {
        // iOS soporta calendar trigger
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          day,
          hour: REMINDER_HOUR,
          minute: REMINDER_MINUTE,
        } as Notifications.CalendarTriggerInput;
      } else if (Platform.OS === "android") {
        // Android usa monthly trigger
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          channelId: "monthly-reminders",
          day,
          hour: REMINDER_HOUR,
          minute: REMINDER_MINUTE,
        };
      } else {
        // Fallback seguro
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: TEST_INTERVAL_SECONDS,
          repeats: true,
        };
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: false,
          data: {
            source: "monthly-reminder",
            index: i,
          },
        },
        trigger,
      });

      console.log("[Monthly Reminders] Agendado con ID:", identifier);
      ids.push(identifier);
    }

    await saveScheduledIds(ids);
    console.log("[Monthly Reminders] ✅ Completado, agendados", ids.length, "recordatorios");
  } catch (error) {
    console.error("[Monthly Reminders] Error durante agendado:", error instanceof Error ? error.message : error);
    console.log("[Monthly Reminders] ⚠️ Error capturado pero continuando...");
  }
}

export async function cancelMonthlyReminders(): Promise<void> {
  if (!isSupported()) return;

  if (Platform.OS === "web") {
    console.log("[Monthly Reminders] Cancelando recordatorios web...");
    for (let i = 0; i < MONTHLY_REMINDERS.length; i++) {
      cancelWebNotification(WEB_TIMER_PREFIX + "monthly_" + i);
    }
    return;
  }

  const storedIds = await getStoredScheduledIds();

  for (const id of storedIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignorar ids viejos o inexistentes
    }
  }

  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const monthlyIds = allScheduled
      .filter((item) => item.content?.data?.source === "monthly-reminder")
      .map((item) => item.identifier);

    for (const id of monthlyIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch {
    // ignorar fallo de lectura global
  }

  await saveScheduledIds([]);
}

export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw === "true";
  } catch {
    return false;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, String(enabled));
  } catch {
    // ignorar error de storage
  }
}

export async function getMonthlyReminderOverview(): Promise<{
  enabled: boolean;
  pendingCount: number;
  scheduledDates: (Date | null)[];
}> {
  const enabled = await getNotificationsEnabled();
  console.log("[Monthly Overview] Notificaciones habilitadas en AsyncStorage:", enabled);

  if (!enabled) {
    console.log("[Monthly Overview] Retornando overview vacío (deshabilitadas)");
    return {
      enabled: false,
      pendingCount: 0,
      scheduledDates: [],
    };
  }

  const dates = MONTHLY_REMINDERS.map((_, i) => {
    const day = REMINDER_DAYS[i % REMINDER_DAYS.length];
    return getNextReminderDate(day);
  });

  console.log("[Monthly Overview] ✅ Retornando overview con", dates.length, "recordatorios");

  return {
    enabled: true,
    pendingCount: dates.length,
    scheduledDates: dates,
  };
}

async function getStoredExerciseReminderIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(EXERCISE_REMINDER_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

async function saveExerciseReminderIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EXERCISE_REMINDER_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignorar error
  }
}

function parseDateSafe(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysSinceDate(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function scheduleExerciseReminders(): Promise<void> {
  if (!isSupported()) return;

  if (Platform.OS === "web") {
    console.log("[Exercise Reminders] Configurando en web...");
    try {
      const granted = await requestWebNotificationPermission();
      if (!granted) {
        console.log("[Exercise Reminders] Web: Permisos no otorgados");
        return;
      }

      const userRaw = await AsyncStorage.getItem("user");
      if (!userRaw) {
        console.log("[Exercise Reminders] Web: No hay usuario");
        return;
      }

      const user = JSON.parse(userRaw);
      const idUser = Number(user?.id || user?.idUser || 0);

      if (!idUser) {
        console.log("[Exercise Reminders] Web: No hay idUser válido");
        return;
      }

      const { getExerciseHistory } = await import("../services/services/api");
      console.log("[Exercise Reminders] Web: Obteniendo histórico...");

      const exerciseHistory = await getExerciseHistory(idUser);
      console.log("[Exercise Reminders] Web: Histórico obtenido:", exerciseHistory?.length || 0);

      if (!Array.isArray(exerciseHistory) || exerciseHistory.length === 0) {
        return;
      }

      let count = 0;
      for (const exercise of exerciseHistory) {
        const registeredDate = parseDateSafe(
          exercise?.registeredDate || exercise?.dateRegistered || exercise?.createdAt
        );

        if (!registeredDate) continue;

        const daysSince = getDaysSinceDate(registeredDate);
        console.log("[Exercise Reminders] Web:", exercise?.exerciseName, "- días:", daysSince);

        if (daysSince >= EXERCISE_REMINDER_DAYS_THRESHOLD) {
          const exerciseName = String(exercise?.exerciseName || exercise?.name || "Ejercicio").trim();
          const daysAgo = daysSince === 1 ? "día" : "días";

          const notifId = WEB_TIMER_PREFIX + "exercise_" + count;
          scheduleWebNotification(
            notifId,
            "Actualiza tu " + exerciseName,
            {
              body: "Hace " + daysSince + " " + daysAgo + " que no registras esta actividad",
              icon: "/icon.png",
            },
            TEST_INTERVAL_MS,
            TEST_INTERVAL_MS
          );

          count++;
        }
      }

      console.log("[Exercise Reminders] ✅ Web: Agendados", count, "recordatorios");
    } catch (error) {
      console.error("[Exercise Reminders] Web: Error:", error);
    }
    return;
  }

  try {
    const granted = await requestNotificationPermissions();
    console.log("[Exercise Reminders] Permisos:", granted);
    if (!granted) {
      console.log("[Exercise Reminders] Permisos no otorgados; se omite agendado");
      return;
    }

    await cancelExerciseReminders();

    try {
      const userRaw = await AsyncStorage.getItem("user");
      if (!userRaw) {
        console.log("[Exercise Reminders] No hay usuario en AsyncStorage");
        return;
      }

      const user = JSON.parse(userRaw);
      const idUser = Number(user?.id || user?.idUser || 0);

      if (!idUser) {
        console.log("[Exercise Reminders] No hay idUser válido");
        return;
      }

      // Lazy import para evitar circular dependencies
      const { getExerciseHistory } = await import("../services/services/api");

      console.log("[Exercise Reminders] Obteniendo histórico de ejercicios para user", idUser);
      const exerciseHistory = await getExerciseHistory(idUser);
      console.log("[Exercise Reminders] Histórico obtenido:", exerciseHistory?.length || 0, "ejercicios");
      
      if (!Array.isArray(exerciseHistory) || exerciseHistory.length === 0) {
        console.log("[Exercise Reminders] Sin ejercicios para agendar");
        return;
      }

      const ids: string[] = [];

      for (const exercise of exerciseHistory) {
        const registeredDate = parseDateSafe(
          exercise?.registeredDate || exercise?.dateRegistered || exercise?.createdAt
        );

        if (!registeredDate) continue;

        const daysSince = getDaysSinceDate(registeredDate);
        console.log("[Exercise Reminders] Ejercicio:", exercise?.exerciseName, "- días sin actualizar:", daysSince);

        if (daysSince >= EXERCISE_REMINDER_DAYS_THRESHOLD) {
          const exerciseName = String(exercise?.exerciseName || exercise?.name || "Ejercicio").trim();
          const daysAgo = daysSince === 1 ? "día" : "días";

          console.log("[Exercise Reminders] Agendando recordatorio para", exerciseName);

          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Actualiza tu " + exerciseName,
              body: "Hace " + daysSince + " " + daysAgo + " que no registras esta actividad. Deseas actualizar o mantenerla?",
              sound: false,
              data: {
                source: "exercise-reminder",
                exerciseId: exercise?.idExercise || exercise?.id || 0,
                exerciseName,
                daysSince,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: TEST_INTERVAL_SECONDS,
              repeats: true,
            },
          });

          console.log("[Exercise Reminders] Agendado con ID:", identifier);
          ids.push(identifier);
        }
      }

      await saveExerciseReminderIds(ids);
      console.log("[Exercise Reminders] ✅ Completado, agendados", ids.length, "recordatorios de ejercicio");
    } catch (error) {
      console.error("[Exercise Reminders] Error:", error instanceof Error ? error.message : error);
    }
  } catch (error) {
    console.error("[Exercise Reminders] Error general:", error instanceof Error ? error.message : error);
  }
}

export async function cancelExerciseReminders(): Promise<void> {
  if (!isSupported()) return;

  if (Platform.OS === "web") {
    console.log("[Exercise Reminders] Cancelando recordatorios web...");
    cancelAllWebNotifications();
    return;
  }

  const storedIds = await getStoredExerciseReminderIds();

  for (const id of storedIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignorar ids viejos o inexistentes
    }
  }

  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const exerciseIds = allScheduled
      .filter((item) => item.content?.data?.source === "exercise-reminder")
      .map((item) => item.identifier);

    for (const id of exerciseIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch {
    // ignorar fallo de lectura global
  }

  await saveExerciseReminderIds([]);
}
