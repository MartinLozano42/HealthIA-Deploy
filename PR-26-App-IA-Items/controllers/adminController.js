import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAdminSummary } from "../services/services/api";

export const resolveAdminAccess = async (roleFromParams) => {
  if (roleFromParams === "admin") {
    return { allowed: true };
  }

  try {
    const userString = await AsyncStorage.getItem("user");

    if (!userString) {
      return { allowed: false, redirectTo: "/login" };
    }

    const user = JSON.parse(userString);

    if (user.role !== "admin") {
      return { allowed: false, redirectTo: "/(tabs)" };
    }

    return { allowed: true };
  } catch {
    if (roleFromParams === "admin") {
      return { allowed: true };
    }

    return { allowed: false, redirectTo: "/login" };
  }
};

export const logoutCurrentUser = async () => {
  try {
    await AsyncStorage.removeItem("user");
  } catch {}
};

export const loadAdminSummary = async () => {
  return await getAdminSummary();
};
