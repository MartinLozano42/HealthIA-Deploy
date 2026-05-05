/**
 * Web Notification Handler - Maneja notificaciones nativas en navegadores
 * Usa Web Notifications API cuando expo-notifications no está disponible
 */

interface ScheduledWebNotification {
  id: string;
  timer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;
  mode: "timeout" | "interval";
}

const webNotifications = new Map<string, ScheduledWebNotification>();

export async function requestWebNotificationPermission(): Promise<boolean> {
  // En web, verificar si está disponible
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("[Web Notifications] Notification API no disponible");
    return false;
  }

  // Si ya tiene permiso
  if (window.Notification.permission === "granted") {
    console.log("[Web Notifications] Permiso ya otorgado");
    return true;
  }

  // Si fue denegado antes
  if (window.Notification.permission === "denied") {
    console.log("[Web Notifications] Permiso fue denegado anteriormente");
    return false;
  }

  // Si no se ha preguntado, solicitar
  console.log("[Web Notifications] Solicitando permiso...");
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    console.log("[Web Notifications] Permiso resultado:", permission, "- Otorgado:", granted);
    return granted;
  } catch (error) {
    console.error("[Web Notifications] Error solicitando permiso:", error);
    return false;
  }
}

export function scheduleWebNotification(
  id: string,
  title: string,
  options: NotificationOptions,
  delayMs: number,
  repeatEveryMs?: number
): void {
  console.log("[Web Notifications] Agendando notificación", id, "en", delayMs, "ms");

  // Cancelar si ya existe
  if (webNotifications.has(id)) {
    const existing = webNotifications.get(id)!;
    if (existing.mode === "interval") {
      clearInterval(existing.timer as ReturnType<typeof setInterval>);
    } else {
      clearTimeout(existing.timer as ReturnType<typeof setTimeout>);
    }
    webNotifications.delete(id);
  }

  const show = () => {
    console.log("[Web Notifications] Mostrando notificación", id);
    try {
      if ("Notification" in window && window.Notification.permission === "granted") {
        new window.Notification(title, options);
      } else {
        console.warn("[Web Notifications] Permiso no otorgado, no se puede mostrar");
      }
    } catch (error) {
      console.error("[Web Notifications] Error mostrando:", error);
    }
  };

  // Agendar nueva
  const timeout = setTimeout(() => {
    show();

    if (repeatEveryMs && repeatEveryMs > 0) {
      const interval = setInterval(show, repeatEveryMs);
      webNotifications.set(id, { id, timer: interval, mode: "interval" });
      return;
    }

    webNotifications.delete(id);
  }, delayMs);

  webNotifications.set(id, { id, timer: timeout, mode: "timeout" });
}

export function cancelWebNotification(id: string): void {
  console.log("[Web Notifications] Cancelando notificación", id);
  const notification = webNotifications.get(id);
  if (notification) {
    if (notification.mode === "interval") {
      clearInterval(notification.timer as ReturnType<typeof setInterval>);
    } else {
      clearTimeout(notification.timer as ReturnType<typeof setTimeout>);
    }
    webNotifications.delete(id);
  }
}

export function cancelAllWebNotifications(): void {
  console.log("[Web Notifications] Cancelando todas las notificaciones");
  for (const [id] of webNotifications) {
    cancelWebNotification(id);
  }
}

export function getWebNotificationCount(): number {
  return webNotifications.size;
}
