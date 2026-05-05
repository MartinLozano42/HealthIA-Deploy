import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import {
  loadAdminSummary,
  logoutCurrentUser,
} from "../../controllers/adminController";
import {
  changeUserStatus,
  getActivationMonthYear,
  getActiveTime,
  loadUsers,
} from "../../controllers/userController";
import User from "../../models/User";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "inactive", label: "Inactivos" },
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-");
  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return period;

  return `${monthNames[monthIndex]} ${year}`;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    registeredMeals: 0,
    trend: [] as { label: string; meals: number }[],
  });

  useEffect(() => {
    fetchUsers();
    fetchSummary();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await loadUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo cargar la lista de usuarios",
      );
    }
  };

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await loadAdminSummary();

      setSummary({
        totalUsers: Number(data?.totalUsers || 0),
        activeUsers: Number(data?.activeUsers || 0),
        inactiveUsers: Number(data?.inactiveUsers || 0),
        registeredMeals: Number(data?.registeredMeals || 0),
        trend: Array.isArray(data?.trend) ? data.trend : [],
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las estadísticas",
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleChangeStatus = async (user: User) => {
    try {
      const updatedUser = await changeUserStatus(user);
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
      );
      fetchSummary();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del usuario",
      );
    }
  };

  const handleLogout = async () => {
    await logoutCurrentUser();
    router.replace("/login");
  };

  const activeCount = summary.activeUsers;
  const inactiveCount = summary.inactiveUsers;
  const registeredMeals = summary.registeredMeals;

  const filteredUsers = users.filter((u) => {
    const matchesFilter =
      filter === "active"
        ? u.status === "active"
        : filter === "inactive"
          ? u.status === "inactive"
          : true;

    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const chartData = useMemo(() => {
    if (summary.trend.length > 0) {
      return summary.trend.map((item) => ({
        label: formatPeriodLabel(item.label),
        value: item.meals,
      }));
    }

    return [
      { label: "Activos", value: activeCount },
      { label: "Comidas", value: registeredMeals },
    ];
  }, [summary.trend, activeCount, registeredMeals]);

  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Panel de administración</Text>
            <Text style={styles.headerSub}>
              {summary.totalUsers || users.length} usuarios en total
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons
              name="logout"
              size={18}
              color={Colors.light.primary}
            />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={Colors.light.icon}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o correo"
            placeholderTextColor={Colors.light.icon}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={Colors.light.icon}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardActive]}>
            <View style={styles.statIconBox}>
              <MaterialCommunityIcons
                name="account-check"
                size={20}
                color="#2e7d32"
              />
            </View>
            <Text style={styles.statNumber}>{activeCount}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>

          <View style={[styles.statCard, styles.statCardInactive]}>
            <View style={[styles.statIconBox, styles.statIconBoxInactive]}>
              <MaterialCommunityIcons
                name="account-off"
                size={20}
                color="#b71c1c"
              />
            </View>
            <Text style={[styles.statNumber, styles.statNumberInactive]}>
              {inactiveCount}
            </Text>
            <Text style={styles.statLabel}>Inactivos</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Resumen administrativo</Text>
              <Text style={styles.chartSubtitle}>
                Usuarios activos y comidas registradas
              </Text>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={fetchSummary}>
              <MaterialCommunityIcons
                name="refresh"
                size={18}
                color={Colors.light.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryMiniCard}>
              <Text style={styles.summaryMiniValue}>{activeCount}</Text>
              <Text style={styles.summaryMiniLabel}>Usuarios activos</Text>
            </View>

            <View style={styles.summaryMiniCard}>
              <Text style={styles.summaryMiniValue}>{registeredMeals}</Text>
              <Text style={styles.summaryMiniLabel}>Comidas registradas</Text>
            </View>
          </View>

          <View style={styles.barChartBox}>
            {loadingSummary ? (
              <Text style={styles.chartLoading}>Cargando estadísticas...</Text>
            ) : (
              <View style={styles.barChartRow}>
                {chartData.map((item, index) => {
                  const barHeight = Math.max(
                    24,
                    (item.value / maxChartValue) * 150,
                  );

                  return (
                    <View key={`${item.label}-${index}`} style={styles.barItem}>
                      <Text style={styles.barValue}>{item.value}</Text>
                      <View
                        style={[
                          styles.bar,
                          index % 2 === 0
                            ? styles.barPrimary
                            : styles.barSecondary,
                          { height: barHeight },
                        ]}
                      />
                      <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                filter === f.key && styles.filterBtnActive,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredUsers.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="account-search"
              size={40}
              color={Colors.light.icon}
            />
            <Text style={styles.emptyText}>Sin resultados</Text>
          </View>
        ) : (
          filteredUsers.map((user) => {
            const activeTime = getActiveTime(user.activationDate);
            const activationMonthYear = getActivationMonthYear(
              user.activationDate,
            );
            const isActive = user.status === "active";

            return (
              <View key={user.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.avatar,
                      isActive ? styles.avatarActive : styles.avatarInactive,
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(user.name)}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      isActive ? styles.badgeActive : styles.badgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isActive
                          ? styles.badgeTextActive
                          : styles.badgeTextInactive,
                      ]}
                    >
                      {isActive ? "Activo" : "Inactivo"}
                    </Text>
                  </View>
                </View>

                {isActive && (activationMonthYear || activeTime) && (
                  <View style={styles.metaBox}>
                    {activationMonthYear && (
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons
                          name="calendar-check"
                          size={13}
                          color={Colors.light.icon}
                        />
                        <Text style={styles.metaText}>
                          Aceptado en {activationMonthYear}
                        </Text>
                      </View>
                    )}

                    {activeTime && (
                      <View style={styles.metaRow}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={13}
                          color={Colors.light.icon}
                        />
                        <Text style={styles.metaText}>{activeTime}</Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isActive
                      ? styles.actionBtnDeactivate
                      : styles.actionBtnActivate,
                  ]}
                  onPress={() => handleChangeStatus(user)}
                >
                  <MaterialCommunityIcons
                    name={
                      isActive ? "account-off-outline" : "account-check-outline"
                    }
                    size={16}
                    color={isActive ? "#b71c1c" : "#fff"}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      isActive
                        ? styles.actionBtnTextDeactivate
                        : styles.actionBtnTextActivate,
                    ]}
                  >
                    {isActive ? "Desactivar" : "Activar"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.text,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.light.inputBackground,
  },
  logoutText: {
    color: Colors.light.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.inputBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statCardActive: {
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  statCardInactive: {
    backgroundColor: "#fce4e4",
    borderWidth: 1,
    borderColor: "#ef9a9a",
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#c8e6c9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statIconBoxInactive: {
    backgroundColor: "#ffcdd2",
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2e7d32",
  },
  statNumberInactive: {
    color: "#b71c1c",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.icon,
  },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E9EEF2",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  chartSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryMiniCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryMiniValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryMiniLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  barChartBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chartLoading: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },
  barChartRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    minHeight: 190,
  },
  barItem: {
    alignItems: "center",
    flex: 1,
  },
  barValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  bar: {
    width: 42,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  barPrimary: {
    backgroundColor: "#4D9E8F",
  },
  barSecondary: {
    backgroundColor: "#7C3AED",
  },
  barLabel: {
    marginTop: 8,
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
  },
  filterBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.icon,
  },
  filterTextActive: {
    color: "#fff",
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    color: Colors.light.icon,
    fontSize: 15,
  },

  card: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    backgroundColor: "#c8e6c9",
  },
  avatarInactive: {
    backgroundColor: "#f5f5f5",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.text,
  },
  cardInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#a5d6a7",
  },
  badgeInactive: {
    backgroundColor: "#fce4e4",
    borderColor: "#ef9a9a",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: "#2e7d32",
  },
  badgeTextInactive: {
    color: "#b71c1c",
  },

  metaBox: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 10,
    gap: 5,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.icon,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionBtnActivate: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  actionBtnDeactivate: {
    backgroundColor: "#fce4e4",
    borderColor: "#ef9a9a",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionBtnTextActivate: {
    color: "#fff",
  },
  actionBtnTextDeactivate: {
    color: "#b71c1c",
  },
});
