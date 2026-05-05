import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "../../constants/theme";
import { analyzeMealPhoto } from "../../services/services/api";

const MEAL_TYPES = ["desayuno", "almuerzo", "cena", "snack"];
const TODAY_MEALS_KEY = "todayMeals";

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const formatTimeLabel = (mealType: string) => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${capitalize(mealType)} - ${hh}:${mm}`;
};

export default function MealAI() {
  const router = useRouter();
  const params = useLocalSearchParams<{ idUser?: string }>();

  const [mealType, setMealType] = useState("almuerzo");
  const [userDescription, setUserDescription] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [imageFileName, setImageFileName] = useState(`meal-${Date.now()}.jpg`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const isWeb = Platform.OS === "web";

  const resolvedIdUser = useMemo(() => {
    const paramId = Number(params.idUser || 0);
    return Number.isFinite(paramId) && paramId > 0 ? paramId : 0;
  }, [params.idUser]);

  const resolveUserId = async () => {
    if (resolvedIdUser) return resolvedIdUser;

    try {
      const raw = await AsyncStorage.getItem("user");
      if (!raw) return 0;

      const parsed = JSON.parse(raw);
      return Number(parsed.id || parsed.idUser || 0);
    } catch {
      return 0;
    }
  };

  const saveMealToTodayList = async (mealData: any) => {
    try {
      const raw = await AsyncStorage.getItem(TODAY_MEALS_KEY);
      const currentMeals = raw ? JSON.parse(raw) : [];

      const newMeal = {
        id: mealData.idPhotoMeal || Date.now(),
        time: formatTimeLabel(mealType),
        name: mealData.detectedMealName || "Comida analizada",
        calories: Number(mealData.estimatedCalories || 0),
        proteins: Number(mealData.estimatedProteins || 0),
        carbs: Number(mealData.estimatedCarbs || 0),
        fats: Number(mealData.estimatedFats || 0),
        portion: mealData.detectedPortion || "",
        ingredients: mealData.ingredients || [],
        notes: mealData.notes || "",
        image: imageUri || mealData.imageUrl || "",
        source: "ai",
      };

      const updatedMeals = [newMeal, ...currentMeals];
      await AsyncStorage.setItem(TODAY_MEALS_KEY, JSON.stringify(updatedMeals));
    } catch (error) {
      console.error("Error guardando comida local:", error);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Debes permitir acceso a tus archivos.");
      return;
    }

    const resultPicker = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      quality: 0.9,
    });

    if (resultPicker.canceled || !resultPicker.assets?.length) return;

    const asset = resultPicker.assets[0];
    setImageUri(asset.uri);
    setImageMimeType(asset.mimeType || "image/jpeg");
    setImageFileName(asset.fileName || `meal-${Date.now()}.jpg`);
    setResult(null);
  };

  const takePhoto = async () => {
    if (isWeb) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Debes permitir acceso a la cámara.");
      return;
    }

    const resultCamera = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (resultCamera.canceled || !resultCamera.assets?.length) return;

    const asset = resultCamera.assets[0];
    setImageUri(asset.uri);
    setImageMimeType(asset.mimeType || "image/jpeg");
    setImageFileName(asset.fileName || `meal-${Date.now()}.jpg`);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!imageUri) {
      Alert.alert("Falta imagen", "Selecciona o sube una imagen primero.");
      return;
    }

    const idUser = await resolveUserId();

    if (!idUser) {
      Alert.alert("Sesión no válida", "No se pudo identificar al usuario.");
      return;
    }

    try {
      setLoading(true);

      const response = await analyzeMealPhoto({
        idUser,
        mealType,
        userDescription,
        imageUri,
        mimeType: imageMimeType,
        fileName: imageFileName,
      });

      const data = response?.data || null;
      setResult(data);

      if (data) {
        await saveMealToTodayList(data);
        Alert.alert("Listo", "La comida fue agregada a Comidas de hoy.", [
          {
            text: "Ver inicio",
            onPress: () => router.back(),
          },
          {
            text: "Quedarme aquí",
            style: "cancel",
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo analizar la comida");
    } finally {
      setLoading(false);
    }
  };

  const calories = result?.estimatedCalories ?? 0;
  const proteins = result?.estimatedProteins ?? 0;
  const carbs = result?.estimatedCarbs ?? 0;
  const fats = result?.estimatedFats ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </Pressable>

          <Text style={styles.title}>Análisis de comida con IA</Text>
          <Text style={styles.subtitle}>
            Sube una foto y Gemini estimará calorías, macros e ingredientes.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Tipo de comida</Text>
            <View style={styles.chipsRow}>
              {MEAL_TYPES.map((item) => {
                const active = item === mealType;

                return (
                  <Pressable
                    key={item}
                    onPress={() => setMealType(item)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Descripción opcional</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: se cocinó con aceite de oliva"
              value={userDescription}
              onChangeText={setUserDescription}
              placeholderTextColor="#8c97a2"
            />

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={pickFromGallery}
              >
                <Text style={styles.secondaryButtonText}>
                  {isWeb ? "Subir imagen" : "Elegir de galería"}
                </Text>
              </Pressable>

              {!isWeb && (
                <Pressable style={styles.secondaryButton} onPress={takePhoto}>
                  <Text style={styles.secondaryButtonText}>Tomar foto</Text>
                </Pressable>
              )}
            </View>

            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.emptyPreview}>
                <Text style={styles.emptyPreviewText}>
                  Aún no hay imagen seleccionada
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Analizar comida</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.resultTitle}>Macros estimados</Text>

            <View style={styles.macrosGrid}>
              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{calories}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>

              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{proteins}</Text>
                <Text style={styles.macroLabel}>proteínas</Text>
              </View>

              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{carbs}</Text>
                <Text style={styles.macroLabel}>carbs</Text>
              </View>

              <View style={styles.macroCard}>
                <Text style={styles.macroValue}>{fats}</Text>
                <Text style={styles.macroLabel}>grasas</Text>
              </View>
            </View>
          </View>

          {result && (
            <View style={styles.card}>
              <Text style={styles.resultTitle}>Resultado del análisis</Text>

              <View style={styles.resultBox}>
                <Text style={styles.resultMain}>{result.detectedMealName}</Text>
                <Text style={styles.resultSub}>
                  {result.detectedPortion} • confianza {result.confidenceScore}%
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Ingredientes detectados</Text>
              {result.ingredients?.length ? (
                result.ingredients.map((ingredient: any, index: number) => (
                  <View
                    key={`${ingredient.name}-${index}`}
                    style={styles.ingredientRow}
                  >
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>
                        {ingredient.name}
                      </Text>
                      <Text style={styles.ingredientQty}>
                        {ingredient.estimatedQuantity || "Cantidad no estimada"}
                      </Text>
                    </View>
                    <Text style={styles.ingredientConfidence}>
                      {ingredient.confidence ?? 0}%
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No se detectaron ingredientes.
                </Text>
              )}

              {!!result.notes && (
                <>
                  <Text style={styles.sectionTitle}>Notas</Text>
                  <Text style={styles.notes}>{result.notes}</Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F8",
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  backButtonText: {
    color: Colors.light.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#22302D",
    marginBottom: 6,
  },
  subtitle: {
    color: "#66716D",
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22302D",
    marginBottom: 8,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EEF4F1",
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
  },
  chipText: {
    color: "#46605A",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#F7F8F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#22302D",
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  secondaryButton: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: "#EAF4F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Colors.light.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  previewImage: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    marginBottom: 14,
    resizeMode: "cover",
  },
  emptyPreview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: "#F3F5F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyPreviewText: {
    color: "#8B9592",
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22302D",
    marginBottom: 12,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  macroCard: {
    width: "48%",
    minHeight: 92,
    backgroundColor: "#F7F8F9",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  macroValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#22302D",
  },
  macroLabel: {
    marginTop: 4,
    color: "#697773",
    textTransform: "capitalize",
    fontSize: 13,
  },
  resultBox: {
    backgroundColor: "#F6FBF8",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  resultMain: {
    fontSize: 20,
    fontWeight: "700",
    color: "#22302D",
  },
  resultSub: {
    color: "#5C6C67",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22302D",
    marginBottom: 10,
    marginTop: 4,
  },
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F8F9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontWeight: "600",
    color: "#22302D",
  },
  ingredientQty: {
    color: "#6B7874",
    marginTop: 2,
  },
  ingredientConfidence: {
    color: Colors.light.primary,
    fontWeight: "700",
  },
  emptyText: {
    color: "#8B9592",
  },
  notes: {
    color: "#5B6663",
    lineHeight: 20,
  },
});
