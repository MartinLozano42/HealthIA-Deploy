import { Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  addCustomIngredient,
  generateDietPlan,
  getAvailableIngredients,
  saveAvailableIngredients,
} from "../../services/services/api";

type FoodItem = {
  idFood: number;
  idUser?: number | null;
  name: string;
  category: string;
  unitMeasure: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  dietCompatibility?: string;
};

type MealPlanItem = {
  id: number;
  time: string;
  mealType?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
};

type DietPlan = {
  summary: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: MealPlanItem[];
  notes?: string;
  generatedBy?: string;
};

const DIET_PLAN_STORAGE_KEY = "generatedDietPlanToday";

const CATEGORY_ORDER = [
  "Carbohidratos",
  "Frutas",
  "Grasas",
  "Lacteos",
  "Lácteos",
  "Proteinas",
  "Proteínas",
  "Verduras",
];

const ADD_FOOD_CATEGORIES = [
  "Carbohidratos",
  "Frutas",
  "Grasas",
  "Lacteos",
  "Proteinas",
  "Verduras",
];

const fallbackPlan: DietPlan = {
  summary: {
    calories: 1540,
    protein: 123,
    carbs: 138,
    fat: 52,
  },
  generatedBy: "static",
  notes:
    "Plan base. Selecciona los alimentos que tienes en casa o agrega uno nuevo si compraste algo.",
  meals: [
    {
      id: 1,
      time: "Desayuno",
      mealType: "desayuno",
      name: "Tostadas integrales con aguacate y huevos",
      calories: 380,
      protein: 22,
      carbs: 38,
      fat: 16,
      ingredients: [
        "2 rebanadas pan integral",
        "1 aguacate mediano",
        "2 huevos",
        "Sal y pimienta",
        "Limón",
      ],
    },
    {
      id: 2,
      time: "Almuerzo",
      mealType: "almuerzo",
      name: "Bowl de pollo a la plancha con arroz y verduras",
      calories: 520,
      protein: 45,
      carbs: 52,
      fat: 12,
      ingredients: [
        "Pechuga de pollo",
        "Arroz integral",
        "Brócoli",
        "Zanahoria",
      ],
    },
    {
      id: 3,
      time: "Snack",
      mealType: "snack",
      name: "Smoothie de frutas con proteína",
      calories: 220,
      protein: 18,
      carbs: 28,
      fat: 5,
      ingredients: ["Plátano", "Fresas", "Proteína whey", "Leche desnatada"],
    },
    {
      id: 4,
      time: "Cena",
      mealType: "cena",
      name: "Salmón al horno con verduras",
      calories: 420,
      protein: 38,
      carbs: 22,
      fat: 18,
      ingredients: [
        "Filete de salmón",
        "Espárragos",
        "Papa",
        "Aceite de oliva",
      ],
    },
  ],
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const clean = String(value || "").trim();

    if (!clean) return;

    const key = normalizeText(clean);

    if (seen.has(key)) return;

    seen.add(key);
    output.push(clean);
  });

  return output;
};

const resolveCurrentUserId = async () => {
  const raw = await AsyncStorage.getItem("user");

  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    return Number(parsed?.id || parsed?.idUser || 0);
  } catch {
    return 0;
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado";
};

const getCategoryLabel = (category: string) => {
  const clean = normalizeText(category);

  if (clean.includes("carbo")) return "Carbohidratos";
  if (clean.includes("fruta")) return "Frutas";
  if (clean.includes("grasa")) return "Grasas";
  if (clean.includes("lact")) return "Lacteos";
  if (clean.includes("prote")) return "Proteinas";
  if (clean.includes("verd")) return "Verduras";

  return category || "Otros";
};

const groupFoodsByCategory = (foods: FoodItem[]) => {
  const grouped: Record<string, FoodItem[]> = {};

  foods.forEach((food) => {
    const category = getCategoryLabel(food.category);

    if (!grouped[category]) grouped[category] = [];

    grouped[category].push(food);
  });

  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const indexA = CATEGORY_ORDER.findIndex(
      (item) => normalizeText(item) === normalizeText(a),
    );
    const indexB = CATEGORY_ORDER.findIndex(
      (item) => normalizeText(item) === normalizeText(b),
    );

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  return sortedCategories.map((category) => ({
    category,
    foods: grouped[category],
  }));
};

export default function DietScreen() {
  const [idUser, setIdUser] = React.useState(0);
  const [dietType, setDietType] = React.useState("Balanceada");
  const [foods, setFoods] = React.useState<FoodItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = React.useState<
    string[]
  >([]);
  const [plan, setPlan] = React.useState<DietPlan>(fallbackPlan);
  const [showIngredients, setShowIngredients] = React.useState(false);
  const [showAddFood, setShowAddFood] = React.useState(false);
  const [newFoodName, setNewFoodName] = React.useState("");
  const [newFoodCategory, setNewFoodCategory] = React.useState("Proteinas");
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const groupedFoods = React.useMemo(
    () => groupFoodsByCategory(foods),
    [foods],
  );

  const selectedSet = React.useMemo(
    () => new Set(selectedIngredients.map((item) => normalizeText(item))),
    [selectedIngredients],
  );

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);

      const currentIdUser = await resolveCurrentUserId();

      if (!currentIdUser) {
        setPlan(fallbackPlan);
        Alert.alert(
          "Sesión no encontrada",
          "Vuelve a iniciar sesión para cargar tus alimentos.",
        );
        return;
      }

      setIdUser(currentIdUser);

      const response = await getAvailableIngredients(currentIdUser);

      const loadedFoods = Array.isArray(response?.foods) ? response.foods : [];
      const loadedSelected = Array.isArray(response?.selectedIngredients)
        ? response.selectedIngredients
        : [];

      setFoods(loadedFoods);
      setDietType(response?.dietType || "Balanceada");
      setSelectedIngredients(uniqueStrings(loadedSelected));

      const savedRaw = await AsyncStorage.getItem(DIET_PLAN_STORAGE_KEY);

      if (savedRaw) {
        const saved = JSON.parse(savedRaw);

        if (
          saved?.date === getTodayKey() &&
          Number(saved?.idUser) === currentIdUser &&
          saved?.plan
        ) {
          setPlan(saved.plan);
        }
      }
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
      setPlan(fallbackPlan);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleIngredient = (name: string) => {
    const clean = name.trim();

    if (!clean) return;

    setSelectedIngredients((prev) => {
      const exists = prev.some(
        (item) => normalizeText(item) === normalizeText(clean),
      );

      if (exists) {
        return prev.filter(
          (item) => normalizeText(item) !== normalizeText(clean),
        );
      }

      return uniqueStrings([...prev, clean]);
    });
  };

  const handleAddFood = async () => {
    const cleanName = newFoodName.trim();

    if (!cleanName) {
      Alert.alert(
        "Falta el alimento",
        "Escribe el nombre del alimento que compraste.",
      );
      return;
    }

    if (!idUser) {
      Alert.alert("Sesión no encontrada", "Vuelve a iniciar sesión.");
      return;
    }

    try {
      setSaving(true);

      const response = await addCustomIngredient({
        idUser,
        name: cleanName,
        category: newFoodCategory,
        unitMeasure: "g",
        dietCompatibility: "all",
      });

      const createdFood = response?.food;

      if (createdFood) {
        setFoods((prev) => {
          const exists = prev.some(
            (food) =>
              normalizeText(food.name) === normalizeText(createdFood.name),
          );

          if (exists) return prev;

          return [...prev, createdFood];
        });
      } else {
        setFoods((prev) => {
          const exists = prev.some(
            (food) => normalizeText(food.name) === normalizeText(cleanName),
          );

          if (exists) return prev;

          return [
            ...prev,
            {
              idFood: Date.now(),
              idUser,
              name: cleanName,
              category: newFoodCategory,
              unitMeasure: "g",
              calories: 0,
              proteins: 0,
              fats: 0,
              carbs: 0,
              dietCompatibility: "all",
            },
          ];
        });
      }

      setSelectedIngredients((prev) => uniqueStrings([...prev, cleanName]));
      setNewFoodName("");
      setShowAddFood(false);

      Alert.alert(
        "Alimento agregado",
        `${cleanName} ya puede usarse en tu dieta.`,
      );
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!idUser) {
      Alert.alert("Sesión no encontrada", "Vuelve a iniciar sesión.");
      return;
    }

    if (selectedIngredients.length === 0) {
      Alert.alert(
        "Selecciona alimentos",
        "Marca al menos un alimento que tengas en casa.",
      );
      return;
    }

    try {
      setGenerating(true);

      await saveAvailableIngredients({
        idUser,
        ingredients: selectedIngredients,
        dietType,
      });

      const generatedPlan = await generateDietPlan({
        idUser,
        selectedIngredients,
        dietType,
      });

      setPlan(generatedPlan);

      await AsyncStorage.setItem(
        DIET_PLAN_STORAGE_KEY,
        JSON.stringify({
          idUser,
          date: getTodayKey(),
          plan: generatedPlan,
        }),
      );

      Alert.alert(
        "Plan generado",
        "Se generó tu plan usando los alimentos que tienes en casa.",
      );
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!idUser) {
      Alert.alert("Sesión no encontrada", "Vuelve a iniciar sesión.");
      return;
    }

    try {
      setSaving(true);

      await saveAvailableIngredients({
        idUser,
        ingredients: selectedIngredients,
        dietType,
      });

      await AsyncStorage.setItem(
        DIET_PLAN_STORAGE_KEY,
        JSON.stringify({
          idUser,
          date: getTodayKey(),
          plan,
        }),
      );

      Alert.alert(
        "Guardado",
        "Tus alimentos seleccionados y tu plan quedaron guardados.",
      );
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4D9E8F" />
          <Text style={styles.loadingText}>Cargando plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTag}>
            <MaterialIcons name="auto-awesome" size={16} color="#4D9E8F" />
            <Text style={styles.headerTagText}>Plan generado por IA</Text>
          </View>

          <Text style={styles.title}>Tu plan de hoy</Text>
          <Text style={styles.subtitle}>
            Personalizado según tus objetivos y alimentos disponibles
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {plan.summary?.calories || 0}
              </Text>
              <Text style={styles.summaryLabel}>kcal</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {plan.summary?.protein || 0}g
              </Text>
              <Text style={styles.summaryLabel}>Proteínas</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {plan.summary?.carbs || 0}g
              </Text>
              <Text style={styles.summaryLabel}>Carbos</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{plan.summary?.fat || 0}g</Text>
              <Text style={styles.summaryLabel}>Grasas</Text>
            </View>
          </View>

          <Text style={[styles.subtitle, styles.centerText]}>
            Resumen nutricional
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comidas del plan</Text>

          {plan.meals.map((meal) => (
            <View key={`${meal.id}-${meal.time}`} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View style={styles.mealHeaderText}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  <Text style={styles.mealName}>{meal.name}</Text>
                </View>

                <Text style={styles.mealCals}>{meal.calories} kcal</Text>
              </View>

              <View style={styles.macroContainer}>
                <View style={styles.macroInfo}>
                  <Text style={styles.macroValue}>{meal.protein}g</Text>
                  <Text style={styles.macroLabel}>Proteínas</Text>
                </View>

                <View style={styles.macroInfo}>
                  <Text style={styles.macroValue}>{meal.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbos</Text>
                </View>

                <View style={styles.macroInfo}>
                  <Text style={styles.macroValue}>{meal.fat}g</Text>
                  <Text style={styles.macroLabel}>Grasas</Text>
                </View>
              </View>

              <Text style={styles.ingredientsTitle}>Ingredientes</Text>

              <View style={styles.ingredientsList}>
                {meal.ingredients.map((ing, idx) => (
                  <View key={`${meal.id}-${idx}`} style={styles.ingredientTag}>
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {!!plan.notes && <Text style={styles.notes}>{plan.notes}</Text>}
        </View>

        <Pressable
          style={styles.dottedLine}
          onPress={() => setShowIngredients((prev) => !prev)}
        >
          <Feather
            name={showIngredients ? "minus" : "plus"}
            size={20}
            color="#4D9E8F"
          />
          <Text style={styles.dottedLineText}>
            {showIngredients
              ? "Ocultar alimentos disponibles"
              : "Seleccionar alimentos disponibles"}
          </Text>
        </Pressable>

        {showIngredients && (
          <View style={styles.ingredientsPanel}>
            <Text style={styles.sectionTitle}>
              Alimentos que tienes en casa
            </Text>
            <Text style={styles.subtitle}>
              Marca los alimentos disponibles. También puedes agregar uno nuevo
              si compraste algo.
            </Text>

            <View style={styles.selectedBox}>
              <Text style={styles.selectedText}>
                Seleccionados: {selectedIngredients.length}
              </Text>
              <Text style={styles.selectedText}>Tipo de dieta: {dietType}</Text>
            </View>

            {groupedFoods.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No se encontraron alimentos preestablecidos en la base de
                  datos.
                </Text>
              </View>
            ) : (
              groupedFoods.map((group) => (
                <View key={group.category} style={styles.categoryBlock}>
                  <Text style={styles.categoryTitle}>{group.category}</Text>

                  <View style={styles.foodGrid}>
                    {group.foods.map((food) => {
                      const active = selectedSet.has(normalizeText(food.name));

                      return (
                        <Pressable
                          key={`${food.idFood}-${food.name}`}
                          style={[
                            styles.foodChip,
                            active && styles.foodChipActive,
                          ]}
                          onPress={() => toggleIngredient(food.name)}
                        >
                          <Text
                            style={[
                              styles.foodChipText,
                              active && styles.foodChipTextActive,
                            ]}
                          >
                            {food.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}

            <Pressable
              style={styles.addFoodToggle}
              onPress={() => setShowAddFood((prev) => !prev)}
            >
              <Feather
                name={showAddFood ? "minus" : "plus"}
                size={18}
                color="#4D9E8F"
              />
              <Text style={styles.addFoodToggleText}>
                {showAddFood ? "Cancelar" : "Agregar alimento comprado"}
              </Text>
            </Pressable>

            {showAddFood && (
              <View style={styles.addFoodBox}>
                <Text style={styles.addFoodTitle}>
                  Nuevo alimento disponible
                </Text>

                <TextInput
                  value={newFoodName}
                  onChangeText={setNewFoodName}
                  placeholder="Ejemplo: Pollo, arroz, queso..."
                  placeholderTextColor="#999"
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleAddFood}
                />

                <Text style={styles.categorySelectTitle}>Categoría</Text>

                <View style={styles.foodGrid}>
                  {ADD_FOOD_CATEGORIES.map((category) => {
                    const active =
                      normalizeText(newFoodCategory) ===
                      normalizeText(category);

                    return (
                      <Pressable
                        key={category}
                        style={[
                          styles.foodChip,
                          active && styles.foodChipActive,
                        ]}
                        onPress={() => setNewFoodCategory(category)}
                      >
                        <Text
                          style={[
                            styles.foodChipText,
                            active && styles.foodChipTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[
                    styles.saveFoodButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={handleAddFood}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Feather name="plus-circle" size={18} color="#FFF" />
                      <Text style={styles.saveFoodButtonText}>
                        Agregar a mis alimentos
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.buttonsContainer}>
          <Pressable
            style={[
              styles.actionButton,
              styles.primaryButton,
              styles.button50,
              generating && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={18} color="#FFF" />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Confirmar
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              styles.secondaryButton,
              styles.button50,
              saving && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#4D9E8F" />
            ) : (
              <>
                <Feather name="bookmark" size={18} color="#4D9E8F" />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Guardar
                </Text>
              </>
            )}
          </Pressable>
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
    paddingBottom: 90,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontWeight: "600",
  },
  header: {
    marginBottom: 20,
  },
  headerTag: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTagText: {
    color: "#4D9E8F",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
  },
  centerText: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  summaryItem: {
    alignItems: "center",
    minWidth: 70,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4D9E8F",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  mealCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  mealHeaderText: {
    flex: 1,
  },
  mealTime: {
    fontSize: 12,
    color: "#999",
  },
  mealName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
  },
  mealCals: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4D9E8F",
  },
  macroContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  macroInfo: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  macroLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  ingredientsTitle: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ingredientTag: {
    backgroundColor: "#E8F5F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ingredientText: {
    fontSize: 11,
    color: "#4D9E8F",
    fontWeight: "500",
  },
  notes: {
    color: "#777",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  dottedLine: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#4D9E8F",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dottedLineText: {
    color: "#4D9E8F",
    fontSize: 14,
    fontWeight: "600",
  },
  ingredientsPanel: {
    backgroundColor: "#EEF8E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  selectedBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 4,
  },
  selectedText: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryBlock: {
    marginTop: 14,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  foodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  foodChip: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#C9E6C1",
  },
  foodChipActive: {
    backgroundColor: "#4D9E8F",
    borderColor: "#4D9E8F",
  },
  foodChipText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "500",
  },
  foodChipTextActive: {
    color: "#FFF",
  },
  emptyBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  emptyText: {
    color: "#777",
    fontSize: 13,
  },
  addFoodToggle: {
    marginTop: 18,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#4D9E8F",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
  },
  addFoodToggleText: {
    color: "#4D9E8F",
    fontSize: 13,
    fontWeight: "700",
  },
  addFoodBox: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#D7EEE7",
  },
  addFoodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    color: "#333",
    marginBottom: 12,
  },
  categorySelectTitle: {
    color: "#333",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  saveFoodButton: {
    backgroundColor: "#4D9E8F",
    borderRadius: 12,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  saveFoodButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button50: {
    flex: 1,
  },
  actionButton: {
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#4D9E8F",
  },
  secondaryButton: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#4D9E8F",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#FFF",
  },
  secondaryButtonText: {
    color: "#4D9E8F",
  },
});
