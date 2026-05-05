import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";

import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Colors } from "../../constants/theme";
import { logoutCurrentUser } from "../../controllers/adminController";
import {
  getExerciseHistory,
  getNotifications,
  getUserProgressStats,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/services/api";

const { width } = Dimensions.get("window");
const TODAY_MEALS_KEY = "todayMeals";

type HomeStats = {
  dailyGoal: number;
  consumed: number;
  burned: number;
  net: number;
  remaining: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterLiters: number;
  waterGoal: number;
  exerciseValue: string;
};

const DEFAULT_HOME_STATS: HomeStats = {
  dailyGoal: 2000,
  consumed: 0,
  burned: 0,
  net: 0,
  remaining: 2000,
  protein: 0,
  carbs: 0,
  fat: 0,
  proteinGoal: 130,
  carbsGoal: 250,
  fatGoal: 65,
  waterLiters: 0,
  waterGoal: 2.5,
  exerciseValue: "0min",
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const normalizeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getProgressWidth = (value: number, goal: number): DimensionValue => {
  const safeValue = Number(value || 0);
  const safeGoal = Number(goal || 0);

  if (!safeGoal || safeGoal <= 0) {
    return "0%" as DimensionValue;
  }

  const percent = Math.min(100, Math.max(0, (safeValue / safeGoal) * 100));

  return `${percent}%` as DimensionValue;
};
const getDateKeyFromValue = (value: unknown) => {
  if (!value) return "";

  const raw = String(value);

  if (raw.length >= 10) {
    return raw.slice(0, 10);
  }

  return "";
};

const resolveCurrentUserId = async (paramId?: string) => {
  const idFromParams = Number(paramId || 0);

  if (Number.isInteger(idFromParams) && idFromParams > 0) {
    return idFromParams;
  }

  const possibleKeys = ["user", "authUser", "currentUser"];

  for (const key of possibleKeys) {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const id = Number(parsed?.id || parsed?.idUser || parsed?.userId || 0);

      if (Number.isInteger(id) && id > 0) {
        return id;
      }
    } catch {
      continue;
    }
  }

  return 0;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingTop: 50,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4D9E8F",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mainCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 8,
    borderColor: "#4D9E8F",
  },
  calorieText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  calorieLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  macroHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4D9E8F",
    marginBottom: 8,
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 10,
  },
  macroItem: {
    flex: 1,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  macroLabel: {
    fontSize: 9,
    color: "#999",
    marginTop: 2,
  },
  macroBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    backgroundColor: "#4D9E8F",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 9,
    color: "#999",
    marginTop: 2,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#4D9E8F",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#4D9E8F",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#FFF",
  },
  secondaryButtonText: {
    color: "#4D9E8F",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealImage: {
    width: 45,
    height: 45,
    borderRadius: 8,
  },
  mealInfo: {
    flex: 1,
  },
  mealTime: {
    fontSize: 10,
    color: "#999",
  },
  mealName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
  },
  mealCals: {
    fontSize: 10,
    color: "#4D9E8F",
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e53935",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  mealDetailPanel: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "80%",
  },
  mealDetailImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 12,
  },
  mealDetailTime: {
    fontSize: 12,
    color: Colors.light.icon,
    marginBottom: 12,
  },
  mealDetailMacrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  mealDetailMacroCard: {
    flex: 1,
    backgroundColor: "#F0F9F7",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  mealDetailMacroValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  mealDetailMacroLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    marginTop: 2,
  },
  mealDetailPortion: {
    fontSize: 13,
    color: Colors.light.icon,
    marginBottom: 12,
  },
  mealDetailSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    marginTop: 4,
  },
  mealDetailIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  mealDetailIngredientName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  mealDetailIngredientQty: {
    fontSize: 11,
    color: Colors.light.icon,
    marginTop: 2,
  },
  mealDetailIngredientConf: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  mealDetailNotes: {
    fontSize: 13,
    color: Colors.light.icon,
    lineHeight: 18,
  },
  notifPanel: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  notifHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD",
    alignSelf: "center",
    marginBottom: 16,
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  notifItemUnread: {
    backgroundColor: "#F0F9F7",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: "#999",
    marginTop: 3,
  },
  notifEmpty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 14,
  },
});

const formatNotifTime = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  return `Hace ${Math.floor(diffH / 24)}d`;
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ idUser?: string }>();

  const [headerName, setHeaderName] = React.useState("Usuario");
  const [meals, setMeals] = React.useState<any[]>([]);
  const [homeStats, setHomeStats] =
    React.useState<HomeStats>(DEFAULT_HOME_STATS);
  const [selectedMeal, setSelectedMeal] = React.useState<any | null>(null);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = React.useState(false);

  const currentDateLabel = React.useMemo(() => {
    const rawDate = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  }, []);

  const initialLetter = React.useMemo(() => {
    const first = String(headerName || "")
      .trim()
      .charAt(0)
      .toUpperCase();
    return first || "U";
  }, [headerName]);

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => n.isRead === 0).length,
    [notifications],
  );

  const handleLogout = async () => {
    await logoutCurrentUser();
    router.replace("/login");
  };

  const handleGoToProfile = () => {
    router.push("/(tabs)/profile");
  };

  const loadTodayMeals = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TODAY_MEALS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setMeals(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("[Home] Error cargando comidas:", error);
      setMeals([]);
    }
  }, []);

  const loadDashboardStats = React.useCallback(async () => {
    try {
      const idUser = await resolveCurrentUserId(params.idUser);

      if (!idUser) {
        setHomeStats(DEFAULT_HOME_STATS);
        return;
      }

      const [statsResponse, exerciseHistory] = await Promise.all([
        getUserProgressStats(idUser, "week"),
        getExerciseHistory(idUser).catch(() => []),
      ]);

      const todayDate = statsResponse?.range?.todayDate || getTodayKey();

      const todayRow = Array.isArray(statsResponse?.calorieChart)
        ? statsResponse.calorieChart.find(
            (item: any) => String(item.date) === String(todayDate),
          )
        : null;

      const consumed = Math.round(normalizeNumber(todayRow?.consumed, 0));
      const burned = Math.round(normalizeNumber(todayRow?.burned, 0));
      const net = Math.max(0, consumed - burned);

      const dailyGoal = Math.round(
        normalizeNumber(statsResponse?.goal?.dailyCalories, 2000),
      );

      const remaining = dailyGoal - net;

      const protein = Math.round(normalizeNumber(todayRow?.protein, 0));
      const carbs = Math.round(normalizeNumber(todayRow?.carbs, 0));
      const fat = Math.round(normalizeNumber(todayRow?.fat, 0));

      const proteinGoal = Math.round(
        normalizeNumber(statsResponse?.goal?.protein, 130),
      );
      const carbsGoal = Math.round(
        normalizeNumber(statsResponse?.goal?.carbs, 250),
      );
      const fatGoal = Math.round(normalizeNumber(statsResponse?.goal?.fat, 65));

      const waterRaw =
        (await AsyncStorage.getItem(`water-${todayDate}`)) ||
        (await AsyncStorage.getItem("todayWaterLiters"));

      const waterLiters = normalizeNumber(waterRaw, 0);
      const waterGoal = 2.5;

      const DAYS_BACKEND_TO_KEY: Record<string, string> = {
        lunes: "L", martes: "M", miercoles: "X",
        jueves: "J", viernes: "V", sabado: "S", domingo: "D",
      };
      const DAY_KEYS = ["D", "L", "M", "X", "J", "V", "S"];
      const todayDayKey = DAY_KEYS[new Date().getDay()];

      const routineCacheRaw = await AsyncStorage.getItem("exerciseRoutineCache");
      let routineMinutes = 0;
      if (routineCacheRaw) {
        const cache = JSON.parse(routineCacheRaw);
        const routineDays = (cache.trainingDays || []).map(
          (d: string) => DAYS_BACKEND_TO_KEY[d] ?? d,
        );
        if (routineDays.includes(todayDayKey)) {
          routineMinutes = normalizeNumber(cache.duration, 0);
        }
      }

      const todayExercises = Array.isArray(exerciseHistory)
        ? exerciseHistory.filter((exercise: any) => {
            const dateKey = getDateKeyFromValue(
              exercise?.registeredDate || exercise?.dateModification,
            );
            return dateKey === todayDate;
          })
        : [];

      const apiExerciseMinutes = todayExercises.reduce(
        (sum: number, exercise: any) =>
          sum + normalizeNumber(exercise?.durationMinutes, 0),
        0,
      );

      const exerciseMinutes =
        apiExerciseMinutes > 0 ? apiExerciseMinutes : routineMinutes;

      const exerciseValue =
        exerciseMinutes > 0 ? `${Math.round(exerciseMinutes)}min` : "0min";

      setHomeStats({
        dailyGoal,
        consumed,
        burned,
        net,
        remaining,
        protein,
        carbs,
        fat,
        proteinGoal,
        carbsGoal,
        fatGoal,
        waterLiters,
        waterGoal,
        exerciseValue,
      });
    } catch (error) {
      console.error("[Home] Error cargando estadísticas:", error);
      setHomeStats(DEFAULT_HOME_STATS);
    }
  }, [params.idUser]);

  const loadNotifications = React.useCallback(async () => {
    try {
      const idUser = await resolveCurrentUserId(params.idUser);
      if (!idUser) return;
      const data = await getNotifications(idUser);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, [params.idUser]);

  const handleOpenNotifications = async () => {
    setShowNotifPanel(true);
    const unread = notifications.filter((n) => n.isRead === 0);
    if (unread.length > 0) {
      try {
        const idUser = await resolveCurrentUserId(params.idUser);
        if (idUser) {
          await markAllNotificationsRead(idUser);
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
        }
      } catch {}
    }
  };

  const removeMeal = React.useCallback(
    async (id: number) => {
      try {
        const updatedMeals = meals.filter((meal) => meal.id !== id);
        setMeals(updatedMeals);
        await AsyncStorage.setItem(
          TODAY_MEALS_KEY,
          JSON.stringify(updatedMeals),
        );
        await loadDashboardStats();
      } catch (error) {
        console.error("[Home] Error eliminando comida:", error);
      }
    },
    [meals, loadDashboardStats],
  );

  React.useEffect(() => {
    let mounted = true;

    const loadHeaderUser = async () => {
      try {
        const userRaw = await AsyncStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        const resolvedName = String(
          user?.username || user?.name || user?.fullName || "Usuario",
        ).trim();

        if (!mounted) return;
        setHeaderName(resolvedName || "Usuario");
      } catch {
        if (!mounted) return;
        setHeaderName("Usuario");
      }
    };

    loadHeaderUser();
    loadTodayMeals();
    loadDashboardStats();
    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [loadTodayMeals, loadDashboardStats, loadNotifications]);

  useFocusEffect(
    React.useCallback(() => {
      loadTodayMeals();
      loadDashboardStats();
      loadNotifications();
    }, [loadTodayMeals, loadDashboardStats, loadNotifications]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 10, color: "#999", marginBottom: 2 }}
              numberOfLines={1}
            >
              {currentDateLabel}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {`¡Hola, ${headerName}! 👋`}
            </Text>
          </View>

          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton} onPress={handleOpenNotifications}>
              <MaterialCommunityIcons name="bell" size={20} color="#FFF" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.iconButton} onPress={handleGoToProfile}>
              <Text style={{ fontSize: 12, color: "#FFF", fontWeight: "bold" }}>
                {initialLetter}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mainCard}>
          <View
            style={{
              flexDirection: "row",
              gap: 16,
              marginBottom: 16,
              alignItems: "flex-start",
            }}
          >
            <View style={styles.calorieCircle}>
              <View>
                <Text style={styles.calorieText}>{homeStats.net}</Text>
                <Text style={styles.calorieLabel}>netos</Text>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.macroHeader}>Meta diaria</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: 8,
                }}
              >
                {homeStats.dailyGoal} kcal
              </Text>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ alignItems: "center" }}>
                  <Feather name="log-in" size={14} color="#4D9E8F" />
                  <Text style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                    Comido
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#333",
                      marginTop: 2,
                    }}
                  >
                    {homeStats.consumed}
                  </Text>
                </View>

                <View style={{ alignItems: "center" }}>
                  <Feather name="log-out" size={14} color="#4D9E8F" />
                  <Text style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                    Quemado
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#333",
                      marginTop: 2,
                    }}
                  >
                    {homeStats.burned}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.macroHeader}>Macros</Text>
          <View style={styles.macrosContainer}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{homeStats.protein}g</Text>
              <Text style={styles.macroLabel}>Proteínas</Text>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: getProgressWidth(
                        homeStats.protein,
                        homeStats.proteinGoal,
                      ),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{homeStats.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbos</Text>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: getProgressWidth(
                        homeStats.carbs,
                        homeStats.carbsGoal,
                      ),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{homeStats.fat}g</Text>
              <Text style={styles.macroLabel}>Grasas</Text>
              <View style={styles.macroBar}>
                <View
                  style={[
                    styles.macroBarFill,
                    {
                      width: getProgressWidth(homeStats.fat, homeStats.fatGoal),
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <Feather name="coffee" size={16} color="#4D9E8F" />
              </View>
              <Text style={styles.statValue}>{meals.length}</Text>
              <Text style={styles.statLabel}>Comidas</Text>
              <Text style={{ fontSize: 10, color: "#999" }}>de hoy</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIcon}>
                <MaterialIcons
                  name="fitness-center"
                  size={16}
                  color="#4D9E8F"
                />
              </View>
              <Text style={styles.statValue}>{homeStats.exerciseValue}</Text>
              <Text style={styles.statLabel}>Ejercicio</Text>
              <Text style={{ fontSize: 10, color: "#999" }}>Hoy</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIcon, homeStats.remaining < 0 && { backgroundColor: "#FDECEA" }]}>
                <MaterialIcons
                  name="local-fire-department"
                  size={16}
                  color={homeStats.remaining < 0 ? "#E8595B" : "#ED6B4B"}
                />
              </View>
              <Text style={[styles.statValue, homeStats.remaining < 0 && { color: "#E8595B" }]}>
                {homeStats.remaining < 0 ? `+${Math.abs(homeStats.remaining)}` : homeStats.remaining}
              </Text>
              <Text style={[styles.statLabel, homeStats.remaining < 0 && { color: "#E8595B" }]}>
                {homeStats.remaining < 0 ? "Exceso" : "Restantes"}
              </Text>
              <Text style={{ fontSize: 10, color: homeStats.remaining < 0 ? "#E8595B" : "#999" }}>kcal</Text>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: "/meal-ai",
                  params: params.idUser
                    ? { idUser: String(params.idUser) }
                    : undefined,
                })
              }
            >
              <MaterialIcons
                name="add-a-photo"
                size={width < 380 ? 14 : 18}
                color="#FFF"
              />
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Agregar foto
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                router.push({
                  pathname: "/exercise",
                  params: params.idUser ? { idUser: params.idUser } : undefined,
                })
              }
            >
              <MaterialIcons
                name="fitness-center"
                size={width < 380 ? 14 : 18}
                color="#4D9E8F"
              />
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Ejercicio
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <View
            style={[
              styles.sectionTitle,
              {
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              },
            ]}
          >
            <Text
              style={{
                fontSize: width < 380 ? 14 : 16,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Comidas de hoy
            </Text>

            <Pressable
              style={styles.iconButton}
              onPress={() =>
                router.push({
                  pathname: "/meal-ai",
                  params: params.idUser
                    ? { idUser: String(params.idUser) }
                    : undefined,
                })
              }
            >
              <Feather name="plus" size={width < 380 ? 16 : 20} color="#FFF" />
            </Pressable>
          </View>

          {meals.length === 0 ? (
            <View style={styles.mealItem}>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>
                  Aún no hay comidas registradas
                </Text>
                <Text style={styles.mealCals}>
                  Agrega una foto para empezar
                </Text>
              </View>
            </View>
          ) : (
            meals.map((meal) => (
              <Pressable
                key={meal.id}
                style={styles.mealItem}
                onPress={() => setSelectedMeal(meal)}
              >
                <Image
                  source={
                    typeof meal.image === "string" && meal.image
                      ? { uri: meal.image }
                      : require("../../assets/images/icon.png")
                  }
                  style={styles.mealImage}
                />
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealCals}>{meal.calories} kcal</Text>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => removeMeal(meal.id)}
                >
                  <MaterialIcons
                    name="delete"
                    size={width < 380 ? 16 : 20}
                    color="#E8595B"
                  />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedMeal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMeal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedMeal(null)}
        />
        {selectedMeal && (
          <View style={styles.mealDetailPanel}>
            <View style={styles.notifHandle} />
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle} numberOfLines={1}>
                {selectedMeal.name}
              </Text>
              <Pressable onPress={() => setSelectedMeal(null)}>
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={Colors.light.icon}
                />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.mealDetailTime}>{selectedMeal.time}</Text>

              <View style={styles.mealDetailMacrosGrid}>
                <View style={styles.mealDetailMacroCard}>
                  <Text style={styles.mealDetailMacroValue}>
                    {selectedMeal.calories}
                  </Text>
                  <Text style={styles.mealDetailMacroLabel}>kcal</Text>
                </View>
                <View style={styles.mealDetailMacroCard}>
                  <Text style={styles.mealDetailMacroValue}>
                    {selectedMeal.proteins ?? "—"}
                  </Text>
                  <Text style={styles.mealDetailMacroLabel}>Proteínas</Text>
                </View>
                <View style={styles.mealDetailMacroCard}>
                  <Text style={styles.mealDetailMacroValue}>
                    {selectedMeal.carbs ?? "—"}
                  </Text>
                  <Text style={styles.mealDetailMacroLabel}>Carbos</Text>
                </View>
                <View style={styles.mealDetailMacroCard}>
                  <Text style={styles.mealDetailMacroValue}>
                    {selectedMeal.fats ?? "—"}
                  </Text>
                  <Text style={styles.mealDetailMacroLabel}>Grasas</Text>
                </View>
              </View>

              {!!selectedMeal.portion && (
                <Text style={styles.mealDetailPortion}>
                  Porción: {selectedMeal.portion}
                </Text>
              )}

              {Array.isArray(selectedMeal.ingredients) &&
                selectedMeal.ingredients.length > 0 && (
                  <>
                    <Text style={styles.mealDetailSectionTitle}>
                      Ingredientes
                    </Text>
                    {selectedMeal.ingredients.map(
                      (ing: any, idx: number) => (
                        <View
                          key={`${ing.name}-${idx}`}
                          style={styles.mealDetailIngredientRow}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.mealDetailIngredientName}>
                              {ing.name}
                            </Text>
                            {!!ing.estimatedQuantity && (
                              <Text style={styles.mealDetailIngredientQty}>
                                {ing.estimatedQuantity}
                              </Text>
                            )}
                          </View>
                          {ing.confidence != null && (
                            <Text style={styles.mealDetailIngredientConf}>
                              {ing.confidence}%
                            </Text>
                          )}
                        </View>
                      ),
                    )}
                  </>
                )}

              {!!selectedMeal.notes && (
                <>
                  <Text style={styles.mealDetailSectionTitle}>Notas</Text>
                  <Text style={styles.mealDetailNotes}>
                    {selectedMeal.notes}
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      <Modal
        visible={showNotifPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifPanel(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowNotifPanel(false)}
        />
        <View style={styles.notifPanel}>
          <View style={styles.notifHandle} />
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>Notificaciones</Text>
            <Pressable onPress={() => setShowNotifPanel(false)}>
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={Colors.light.icon}
              />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <Text style={styles.notifEmpty}>Sin notificaciones por ahora</Text>
            ) : (
              notifications.map((notif) => {
                const isUnread = notif.isRead === 0;
                let iconName: any = "bell";
                let iconColor = "#888";
                let useMI = false;
                if (notif.type === "meal") {
                  iconName = "food"; iconColor = "#4D9E8F";
                } else if (notif.type === "exercise") {
                  iconName = "run-fast"; iconColor = "#5B8EE0";
                } else if (notif.type === "goal") {
                  iconName = "flag"; iconColor = "#F5A623"; useMI = true;
                } else if (notif.type === "reminder") {
                  iconName = "alarm"; iconColor = "#9B59B6"; useMI = true;
                } else if (notif.type === "system") {
                  iconName = "cog"; iconColor = "#666";
                }

                return (
                  <Pressable
                    key={notif.idNotification}
                    style={[styles.notifItem, isUnread && styles.notifItemUnread]}
                    onPress={async () => {
                      if (isUnread) {
                        try {
                          await markNotificationRead(notif.idNotification);
                          setNotifications((prev) =>
                            prev.map((n) =>
                              n.idNotification === notif.idNotification
                                ? { ...n, isRead: 1 }
                                : n,
                            ),
                          );
                        } catch {}
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.notifIconBox,
                        { backgroundColor: `${iconColor}22` },
                      ]}
                    >
                      {useMI ? (
                        <MaterialIcons name={iconName} size={18} color={iconColor} />
                      ) : (
                        <MaterialCommunityIcons
                          name={iconName}
                          size={18}
                          color={iconColor}
                        />
                      )}
                    </View>
                    <View style={styles.notifContent}>
                      <Text
                        style={[
                          styles.notifMessage,
                          isUnread && { fontWeight: "700", color: "#222" },
                        ]}
                      >
                        {notif.message}
                      </Text>
                      <Text style={styles.notifTime}>
                        {formatNotifTime(notif.createdAt)}
                      </Text>
                    </View>
                    {isUnread && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#4D9E8F",
                        }}
                      />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
