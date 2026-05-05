import { Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { getUserProgressStats } from "../../services/services/api";

type RangeType = "week" | "month";

type CalorieChartItem = {
  date: string;
  label: string;
  consumed: number;
  goal: number;
  burned: number;
  net: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

type WeightItem = {
  label: string;
  date: string;
  weight: number;
  height?: number;
  targetWeight?: number;
};

type StatsResponse = {
  user?: {
    id: number;
    name: string;
    status?: string;
  };
  period: RangeType;
  range: {
    startDate: string;
    endDate: string;
    todayDate: string;
  };
  goal: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
    targetWeight?: number;
  };
  summary: {
    avgCalories: number;
    adherence: number;
    weightChange: number;
    streakDays: number;
    totalConsumed: number;
    totalBurned: number;
    daysWithFood: number;
  };
  calorieChart: CalorieChartItem[];
  weightEvolution: WeightItem[];
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    percentages: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
};

type DonutChartProps = {
  protein: number;
  carbs: number;
  fat: number;
};

const fallbackStats: StatsResponse = {
  period: "week",
  range: {
    startDate: "",
    endDate: "",
    todayDate: "",
  },
  goal: {
    dailyCalories: 2000,
    protein: 130,
    carbs: 250,
    fat: 65,
    targetWeight: 0,
  },
  summary: {
    avgCalories: 0,
    adherence: 0,
    weightChange: 0,
    streakDays: 0,
    totalConsumed: 0,
    totalBurned: 0,
    daysWithFood: 0,
  },
  calorieChart: [],
  weightEvolution: [],
  macros: {
    protein: 0,
    carbs: 0,
    fat: 0,
    percentages: {
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  },
};

const resolveCurrentUserId = async () => {
  const possibleKeys = ["user", "authUser", "currentUser"];

  for (const key of possibleKeys) {
    const raw = await AsyncStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const id = Number(parsed?.id || parsed?.idUser || parsed?.userId || 0);

      if (id > 0) return id;
    } catch {
      continue;
    }
  }

  return 0;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado";
};

const formatWeightChange = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return "0.0";
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
};

const getBarHeight = (value: number, maxValue: number, maxHeight = 105) => {
  if (!maxValue || maxValue <= 0) return 8;

  const height = (value / maxValue) * maxHeight;

  return Math.max(8, Math.min(maxHeight, height));
};

const getWeightBarHeight = (
  value: number,
  minValue: number,
  maxValue: number,
) => {
  if (!value) return 8;

  if (maxValue === minValue) return 65;

  const range = Math.max(1, maxValue - minValue);
  const height = 25 + ((value - minValue) / range) * 85;

  return Math.max(25, Math.min(110, height));
};

const getRangeText = (stats: StatsResponse) => {
  if (!stats.range?.startDate || !stats.range?.endDate) return "";
  return `${stats.range.startDate} al ${stats.range.endDate}`;
};

const mergeStats = (response: Partial<StatsResponse>): StatsResponse => ({
  ...fallbackStats,
  ...response,
  summary: {
    ...fallbackStats.summary,
    ...(response?.summary || {}),
  },
  goal: {
    ...fallbackStats.goal,
    ...(response?.goal || {}),
  },
  macros: {
    ...fallbackStats.macros,
    ...(response?.macros || {}),
    percentages: {
      ...fallbackStats.macros.percentages,
      ...(response?.macros?.percentages || {}),
    },
  },
  calorieChart: Array.isArray(response?.calorieChart)
    ? response.calorieChart
    : [],
  weightEvolution: Array.isArray(response?.weightEvolution)
    ? response.weightEvolution
    : [],
});

const DonutChart = ({ protein, carbs, fat }: DonutChartProps) => {
  const size = 150;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const safeProtein = Number(protein || 0);
  const safeCarbs = Number(carbs || 0);
  const safeFat = Number(fat || 0);

  const total = safeProtein + safeCarbs + safeFat;

  const values =
    total > 0
      ? [
          {
            key: "protein",
            value: safeProtein,
            color: "#4D9E8F",
          },
          {
            key: "carbs",
            value: safeCarbs,
            color: "#7BBFB2",
          },
          {
            key: "fat",
            value: safeFat,
            color: "#C8E6E0",
          },
        ]
      : [];

  let accumulated = 0;

  return (
    <View style={styles.donutWrapper}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E8F5F0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        <G rotation="-90" originX={center} originY={center}>
          {values.map((item) => {
            const arc = (item.value / total) * circumference;
            const dashOffset = -accumulated;

            accumulated += arc;

            return (
              <Circle
                key={item.key}
                cx={center}
                cy={center}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>

      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterValue}>{total > 0 ? "100%" : "0%"}</Text>
        <Text style={styles.donutCenterLabel}>Macros</Text>
      </View>
    </View>
  );
};

export default function StatsScreen() {
  const [activeTab, setActiveTab] = React.useState<RangeType>("week");
  const [idUser, setIdUser] = React.useState(0);
  const [stats, setStats] = React.useState<StatsResponse>(fallbackStats);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadStats = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const currentIdUser = await resolveCurrentUserId();

        if (!currentIdUser) {
          setStats(fallbackStats);
          Alert.alert(
            "Sesión no encontrada",
            "Vuelve a iniciar sesión para ver tus estadísticas.",
          );
          return;
        }

        setIdUser(currentIdUser);

        const response = await getUserProgressStats(currentIdUser, activeTab);

        if (!response || !response.summary) {
          setStats(fallbackStats);
          return;
        }

        setStats(mergeStats(response));
      } catch (error) {
        console.log("ERROR STATS FRONT:", error);
        Alert.alert("Error stats", getErrorMessage(error));
        setStats(fallbackStats);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const maxCalories = React.useMemo(() => {
    const values = stats.calorieChart.flatMap((item) => [
      Number(item.consumed || 0),
      Number(item.goal || 0),
    ]);

    return Math.max(1, ...values);
  }, [stats.calorieChart]);

  const weightValues = React.useMemo(
    () =>
      stats.weightEvolution
        .map((item) => Number(item.weight || 0))
        .filter((item) => item > 0),
    [stats.weightEvolution],
  );

  const maxWeight = weightValues.length ? Math.max(...weightValues) : 0;
  const minWeight = weightValues.length ? Math.min(...weightValues) : 0;

  const macroPercentages = stats.macros?.percentages || {
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const hasStatsData =
    stats.summary.daysWithFood > 0 ||
    stats.summary.totalBurned > 0 ||
    stats.weightEvolution.length > 0 ||
    stats.macros.protein > 0 ||
    stats.macros.carbs > 0 ||
    stats.macros.fat > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4D9E8F" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStats("refresh")}
            tintColor="#4D9E8F"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>Tu progreso y tendencias</Text>

          {!!getRangeText(stats) && (
            <Text style={styles.rangeText}>{getRangeText(stats)}</Text>
          )}
        </View>

        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === "week" && styles.tabActive]}
            onPress={() => setActiveTab("week")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "week" && styles.tabTextActive,
              ]}
            >
              Esta semana
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "month" && styles.tabActive]}
            onPress={() => setActiveTab("month")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "month" && styles.tabTextActive,
              ]}
            >
              Este mes
            </Text>
          </Pressable>
        </View>

        {!hasStatsData && (
          <View style={styles.emptyCard}>
            <MaterialIcons name="insights" size={30} color="#4D9E8F" />
            <Text style={styles.emptyTitle}>Aún no hay suficientes datos</Text>
            <Text style={styles.emptyText}>
              Registra comidas con IA, ejercicios o actualiza tu peso para ver
              estadísticas reales.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <MaterialIcons
                  name="local-fire-department"
                  size={20}
                  color="#4D9E8F"
                />
              </View>
              <Text style={styles.statValue}>{stats.summary.avgCalories}</Text>
              <Text style={styles.statLabel}>kcal/día</Text>
              <Text style={styles.statHint}>Prom. calorías</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <MaterialIcons name="check-circle" size={20} color="#4D9E8F" />
              </View>
              <Text style={styles.statValue}>{stats.summary.adherence}%</Text>
              <Text style={styles.statLabel}>Adherencia</Text>
              <Text style={styles.statHint}>Según meta diaria</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Feather
                  name={
                    stats.summary.weightChange <= 0
                      ? "trending-down"
                      : "trending-up"
                  }
                  size={20}
                  color="#4D9E8F"
                />
              </View>
              <Text style={styles.statValue}>
                {formatWeightChange(stats.summary.weightChange)}
              </Text>
              <Text style={styles.statLabel}>kg</Text>
              <Text style={styles.statHint}>Cambio registrado</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <MaterialIcons name="emoji-events" size={20} color="#4D9E8F" />
              </View>
              <Text style={styles.statValue}>{stats.summary.streakDays}</Text>
              <Text style={styles.statLabel}>días seguidos</Text>
              <Text style={styles.statHint}>Racha actual</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Calorías diarias vs meta</Text>

          {stats.calorieChart.length === 0 ? (
            <Text style={styles.noDataText}>
              No hay datos de calorías para este periodo.
            </Text>
          ) : (
            <>
              <View style={styles.barsContainer}>
                {stats.calorieChart.map((item, idx) => (
                  <View key={`${item.label}-${idx}`} style={styles.barWrapper}>
                    <View style={styles.doubleBar}>
                      <View style={styles.barSecondary} />

                      <View
                        style={[
                          styles.bar,
                          {
                            height: getBarHeight(
                              item.consumed,
                              item.goal || maxCalories,
                            ),
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.barLabel}>{item.label}</Text>
                    <Text style={styles.barSmallText}>{item.consumed}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendConsumed]} />
                  <Text style={styles.legendText}>Consumido</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendGoal]} />
                  <Text style={styles.legendText}>
                    Meta ({stats.goal.dailyCalories})
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Evolución del peso</Text>

          {stats.weightEvolution.length === 0 ? (
            <Text style={styles.noDataText}>
              No hay registros de peso todavía.
            </Text>
          ) : (
            <>
              <View style={styles.weightChart}>
                {stats.weightEvolution.map((item, idx) => (
                  <View key={`${item.date}-${idx}`} style={styles.weightItem}>
                    <View
                      style={[
                        styles.weightBar,
                        {
                          height: getWeightBarHeight(
                            item.weight,
                            minWeight,
                            maxWeight,
                          ),
                        },
                      ]}
                    />
                    <Text style={styles.weightValue}>{item.weight}kg</Text>
                  </View>
                ))}
              </View>

              <View style={styles.weightLabels}>
                {stats.weightEvolution.map((item, idx) => (
                  <Text key={`${item.label}-${idx}`} style={styles.barLabel}>
                    {item.label}
                  </Text>
                ))}
              </View>

              {!!stats.goal.targetWeight && (
                <Text style={styles.goalText}>
                  Peso objetivo: {stats.goal.targetWeight} kg
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Distribución de macros</Text>

          <View style={styles.pieContainer}>
            <DonutChart
              protein={macroPercentages.protein}
              carbs={macroPercentages.carbs}
              fat={macroPercentages.fat}
            />

            <Text style={styles.macroTotalText}>
              Proteínas: {stats.macros.protein}g | Carbos: {stats.macros.carbs}g
              | Grasas: {stats.macros.fat}g
            </Text>

            <View style={styles.pieLegend}>
              <View style={styles.pieLegendItem}>
                <View style={styles.pieLegendLabel}>
                  <View style={[styles.pieLegendDot, styles.proteinDot]} />
                  <Text style={styles.pieLegendText}>Proteínas</Text>
                </View>
                <Text style={styles.pieLegendValue}>
                  {macroPercentages.protein}%
                </Text>
              </View>

              <View style={styles.pieLegendItem}>
                <View style={styles.pieLegendLabel}>
                  <View style={[styles.pieLegendDot, styles.carbsDot]} />
                  <Text style={styles.pieLegendText}>Carbos</Text>
                </View>
                <Text style={styles.pieLegendValue}>
                  {macroPercentages.carbs}%
                </Text>
              </View>

              <View style={styles.pieLegendItem}>
                <View style={styles.pieLegendLabel}>
                  <View style={[styles.pieLegendDot, styles.fatDot]} />
                  <Text style={styles.pieLegendText}>Grasas</Text>
                </View>
                <Text style={styles.pieLegendValue}>
                  {macroPercentages.fat}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.chartTitle}>Resumen del periodo</Text>

          <View style={styles.resumeRow}>
            <Text style={styles.resumeLabel}>Total consumido</Text>
            <Text style={styles.resumeValue}>
              {stats.summary.totalConsumed} kcal
            </Text>
          </View>

          <View style={styles.resumeRow}>
            <Text style={styles.resumeLabel}>Total quemado</Text>
            <Text style={styles.resumeValue}>
              {stats.summary.totalBurned} kcal
            </Text>
          </View>

          <View style={styles.resumeRow}>
            <Text style={styles.resumeLabel}>Días con comidas registradas</Text>
            <Text style={styles.resumeValue}>{stats.summary.daysWithFood}</Text>
          </View>

          <View style={styles.resumeRow}>
            <Text style={styles.resumeLabel}>Usuario</Text>
            <Text style={styles.resumeValue}>
              {stats.user?.name || `ID ${idUser}`}
            </Text>
          </View>

          {!!stats.user?.status && (
            <View style={styles.resumeRow}>
              <Text style={styles.resumeLabel}>Estado</Text>
              <Text style={styles.resumeValue}>{stats.user.status}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#777",
    marginTop: 12,
    fontWeight: "600",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#999",
  },
  rangeText: {
    marginTop: 6,
    fontSize: 11,
    color: "#4D9E8F",
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#E8F5F0",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#4D9E8F",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4D9E8F",
  },
  tabTextActive: {
    color: "#FFF",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCard: {
    backgroundColor: "#E8F5F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  statHint: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
    textAlign: "center",
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  noDataText: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    minHeight: 145,
    marginBottom: 12,
  },
  barWrapper: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  doubleBar: {
    height: 115,
    width: 28,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },
  barSecondary: {
    position: "absolute",
    bottom: 0,
    width: 26,
    height: 105,
    backgroundColor: "#D4D4D4",
    borderRadius: 7,
  },
  bar: {
    position: "absolute",
    bottom: 0,
    width: 26,
    backgroundColor: "#4D9E8F",
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  barSmallText: {
    fontSize: 9,
    color: "#999",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendConsumed: {
    backgroundColor: "#4D9E8F",
  },
  legendGoal: {
    backgroundColor: "#D4D4D4",
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  weightChart: {
    height: 145,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  weightItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  weightBar: {
    width: 28,
    backgroundColor: "#4D9E8F",
    borderRadius: 5,
  },
  weightValue: {
    marginTop: 4,
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
  },
  weightLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 6,
  },
  goalText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    color: "#4D9E8F",
    fontWeight: "700",
  },
  pieContainer: {
    alignItems: "center",
  },
  donutWrapper: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  donutCenter: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  donutCenterValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4D9E8F",
  },
  donutCenterLabel: {
    fontSize: 10,
    color: "#777",
    marginTop: 2,
  },
  macroTotalText: {
    fontSize: 11,
    color: "#777",
    textAlign: "center",
    marginBottom: 12,
  },
  pieLegend: {
    width: "100%",
  },
  pieLegendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: 8,
  },
  pieLegendLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pieLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  proteinDot: {
    backgroundColor: "#4D9E8F",
  },
  carbsDot: {
    backgroundColor: "#7BBFB2",
  },
  fatDot: {
    backgroundColor: "#C8E6E0",
  },
  pieLegendText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  pieLegendValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  resumeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  resumeLabel: {
    color: "#777",
    fontSize: 13,
  },
  resumeValue: {
    color: "#333",
    fontSize: 13,
    fontWeight: "700",
  },
});
