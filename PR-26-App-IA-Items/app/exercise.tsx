import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { ExerciseStyles, GlobalStyles } from "../constants/globalStyles";
import { Colors } from "../constants/theme";
import {
  calculateCaloriesEstimate,
  EXERCISE_TYPES,
  getExerciseTypeLabel,
  INTENSITY_LEVELS,
  loadExerciseProfile,
  loadExistingRoutine,
  saveRoutine,
  toggleTrainingDay,
  WEEK_DAYS,
} from "../controllers/exerciseController";

type ExerciseIntensity = "Baja" | "Media" | "Alta";

function DurationSlider({
  value,
  min = 5,
  max = 120,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const trackWidth = useRef(1);
  const animated = useRef(new Animated.Value(0)).current;

  const percentage = useMemo(() => (value - min) / (max - min), [value, min, max]);
  const currentPercent = useRef(percentage);
  const startPercent = useRef(percentage);

  useEffect(() => {
    currentPercent.current = percentage;
    animated.setValue(percentage);
  }, [percentage, animated]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startPercent.current = currentPercent.current;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (!trackWidth.current) return;
          const dx = gestureState.dx / trackWidth.current;
          const next = startPercent.current + dx;
          const clamped = Math.max(0, Math.min(1, next));
          currentPercent.current = clamped;
          animated.setValue(clamped);
          onChange(Math.round(min + clamped * (max - min)));
        },
      }),
    [animated, max, min, onChange]
  );

  return (
    <View style={ExerciseStyles.sliderContainer}>
      <View style={ExerciseStyles.sliderHeaderRow}>
        <Text style={ExerciseStyles.sliderLabel}>{min} min</Text>
        <Text style={ExerciseStyles.sliderLabel}>{max} min</Text>
      </View>
      <View
        style={ExerciseStyles.sliderTrack}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width - 24;
        }}
      >
        <Animated.View
          style={{
            ...ExerciseStyles.sliderProgress,
            width: animated.interpolate({
              inputRange: [0, 1],
              outputRange: [0, trackWidth.current],
            }),
          }}
        />
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            ...ExerciseStyles.sliderThumb,
            transform: [
              {
                translateX: animated.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, trackWidth.current],
                }),
              },
            ],
          }}
        />
      </View>
    </View>
  );
}

export default function ExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ idUser?: string }>();
  const idUser = Number(params.idUser || 0);

  const [selectedType, setSelectedType] = useState(EXERCISE_TYPES[0].key);
  const [intensity, setIntensity] = useState<ExerciseIntensity>("Media");
  const [duration, setDuration] = useState(30);
  const [useWeight, setUseWeight] = useState(false);
  const [days, setDays] = useState<string[]>(["M", "V"]);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [profileWeight, setProfileWeight] = useState<number | null>(null);
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [profileSex, setProfileSex] = useState<string>("O");
  const [activityLevelId, setActivityLevelId] = useState<number | null>(null);

  useEffect(() => {
    if (!idUser) {
      return;
    }

    let cancelled = false;

    loadExerciseProfile(idUser)
      .then((profile) => {
        if (cancelled) return;

        setProfileWeight(profile.profileWeight);
        setProfileAge(profile.profileAge);
        setProfileSex(profile.profileSex);
        setActivityLevelId(profile.activityLevelId ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        // Si no hay onboarding disponible, usamos valores por defecto en el calculo.
        setProfileWeight(null);
        setProfileAge(null);
        setProfileSex("O");
        setActivityLevelId(null);
      })
      .finally(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [idUser]);

  useEffect(() => {
    let cancelled = false;

    loadExistingRoutine(idUser)
      .then((routine) => {
        if (cancelled || !routine) return;
        setSelectedType(routine.exerciseType);
        setIntensity(routine.intensity as ExerciseIntensity);
        setDuration(routine.duration);
        setUseWeight(routine.useWeight);
        if (routine.days.length > 0) setDays(routine.days);
        if (routine.activityLevelId) setActivityLevelId(routine.activityLevelId);
        setIsEdit(true);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [idUser]);

  const calories = useMemo(() => {
    return calculateCaloriesEstimate({
      selectedType,
      intensity,
      duration,
      profileWeight,
      profileAge,
      profileSex,
      useWeight,
    });
  }, [duration, intensity, profileAge, profileSex, profileWeight, selectedType, useWeight]);

  const handleSaveActivity = async () => {
    if (saving) return;

    try {
      setSaving(true);

      await saveRoutine({
        idUser,
        activityLevelId,
        selectedType,
        intensity,
        duration,
        useWeight,
        days,
        types: EXERCISE_TYPES,
        calories,
        registeredDate: undefined,
        dateModification: undefined,
        isEdit,
      });

      setShowSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo guardar la actividad"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={GlobalStyles.container} contentContainerStyle={ExerciseStyles.scrollContent}>

      <View style={[GlobalStyles.card, ExerciseStyles.summaryCard]}>
        <View style={ExerciseStyles.summaryRow}>
          <View style={ExerciseStyles.summaryLeftGroup}>
            <View style={ExerciseStyles.summaryIconBadge}>
              <MaterialCommunityIcons name="fire" size={28} color="#fff" />
            </View>

            <View style={ExerciseStyles.summaryCopyColumn}>
              <Text style={ExerciseStyles.summaryCaption}>
                Calorías estimadas
              </Text>
              <Text style={ExerciseStyles.summaryValue}>{calories}</Text>
              <Text style={ExerciseStyles.summarySubtext}>kcal quemadas</Text>
            </View>
          </View>

          <View style={ExerciseStyles.summaryMetaColumn}>
            <View style={ExerciseStyles.summaryMetaRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#fff" />
              <Text style={ExerciseStyles.summaryMetaText}>{duration} min</Text>
            </View>
            <View style={ExerciseStyles.summaryMetaRow}>
              <MaterialCommunityIcons name="run" size={14} color="#fff" />
              <Text style={ExerciseStyles.summaryMetaText}>
                {getExerciseTypeLabel(selectedType)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={ExerciseStyles.section}>
        <Text style={ExerciseStyles.sectionTitle}>
          Tipo de ejercicio
        </Text>
        <View style={ExerciseStyles.exerciseTypeGrid}>
          {EXERCISE_TYPES.map((type) => {
            const active = type.key === selectedType;
            const iconName = type.iconName as React.ComponentProps<
              typeof MaterialCommunityIcons
            >["name"];
            return (
              <Pressable
                key={type.key}
                style={[
                  ExerciseStyles.exerciseTypeCard,
                  active ? ExerciseStyles.exerciseTypeCardActive : ExerciseStyles.exerciseTypeCardInactive,
                ]}
                onPress={() => setSelectedType(type.key)}
              >
                <View style={ExerciseStyles.exerciseTypeIcon}>
                  <MaterialCommunityIcons name={iconName} size={24} />
                </View>
                <Text
                  style={[
                    ExerciseStyles.exerciseTypeText,
                    active ? ExerciseStyles.exerciseTypeTextActive : ExerciseStyles.exerciseTypeTextInactive,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={ExerciseStyles.section}>
        <Text style={ExerciseStyles.sectionTitle}>
          Intensidad
        </Text>
        <View style={ExerciseStyles.intensityRow}>
          {(INTENSITY_LEVELS as ExerciseIntensity[]).map((level) => (
            <Pressable
              key={level}
              style={[
                ExerciseStyles.intensityButton,
                intensity === level ? ExerciseStyles.intensityButtonActive : ExerciseStyles.intensityButtonInactive,
              ]}
              onPress={() => setIntensity(level)}
            >
              <Text
                style={[
                  ExerciseStyles.intensityText,
                  intensity === level ? ExerciseStyles.intensityTextActive : ExerciseStyles.intensityTextInactive,
                ]}
              >
                {level}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={ExerciseStyles.section}>
        <Text style={ExerciseStyles.sectionTitle}>
          Duración
        </Text>
        <View style={ExerciseStyles.durationRow}>
          <Text style={ExerciseStyles.durationValue}>{duration} min</Text>
        </View>
        <DurationSlider value={duration} onChange={setDuration} />
      </View>

      <View style={ExerciseStyles.section}>
        <View style={ExerciseStyles.weightTrainingRow}>
          <Text style={ExerciseStyles.weightTrainingTitle}>¿Alza de pesos?</Text>
          <Switch
            value={useWeight}
            onValueChange={setUseWeight}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            thumbColor={useWeight ? Colors.light.background : "#fff"}
          />
        </View>
        <Text style={ExerciseStyles.weightTrainingHint}>+10% calorías quemadas</Text>
      </View>

      <View style={ExerciseStyles.section}>
        <Text style={ExerciseStyles.sectionTitle}>
          Días de entrenamiento
        </Text>
        <View style={ExerciseStyles.trainingDaysRow}>
          {WEEK_DAYS.map((d) => {
            const enabled = days.includes(d.key);
            return (
              <Pressable
                key={d.key}
                style={[
                  ExerciseStyles.trainingDayButton,
                  enabled ? ExerciseStyles.trainingDayButtonEnabled : ExerciseStyles.trainingDayButtonDisabled,
                ]}
                onPress={() => setDays((prev) => toggleTrainingDay(prev, d.key))}
              >
                <Text style={[ExerciseStyles.trainingDayText, enabled ? ExerciseStyles.trainingDayTextEnabled : ExerciseStyles.trainingDayTextDisabled]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={[GlobalStyles.primaryButton, ExerciseStyles.primaryActionButton, saving && ExerciseStyles.primaryActionButtonDisabled]}
        onPress={handleSaveActivity}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={GlobalStyles.buttonText}>{isEdit ? "Actualizar actividad ✓" : "Guardar actividad ✓"}</Text>
        )}
      </Pressable>

      <Pressable style={[GlobalStyles.secondaryButton, ExerciseStyles.secondaryActionButton]} onPress={() => router.back()}>
        <Text style={GlobalStyles.buttonText}>Volver</Text>
      </Pressable>

      <View style={ExerciseStyles.bottomSpacer} />

      {/* Overlay de éxito */}
      {showSuccess && (
        <Animated.View style={[exStyles.overlay, { opacity: successOpacity }]}>
          <Animated.View style={[exStyles.card, { transform: [{ scale: successScale }] }]}>

            <View style={exStyles.iconCircle}>
              <MaterialCommunityIcons name="check-bold" size={52} color="#fff" />
            </View>

            <Text style={exStyles.title}>
              {isEdit ? "¡Actividad actualizada!" : "¡Actividad guardada!"}
            </Text>
            <Text style={exStyles.subtitle}>
              Tu rutina de ejercicio ha sido {isEdit ? "actualizada" : "guardada"} correctamente.
            </Text>

            {/* Resumen */}
            <View style={exStyles.dataRow}>
              <MaterialCommunityIcons name="run-fast" size={16} color="#4D9E8F" />
              <Text style={exStyles.dataText}>
                {getExerciseTypeLabel(selectedType)} · Intensidad {intensity}
              </Text>
            </View>
            <View style={exStyles.dataRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#4D9E8F" />
              <Text style={exStyles.dataText}>{duration} min por sesión</Text>
            </View>
            <View style={exStyles.dataRow}>
              <MaterialCommunityIcons name="fire" size={16} color="#4D9E8F" />
              <Text style={exStyles.dataText}>~{calories} kcal estimadas</Text>
            </View>

            <Pressable
              style={exStyles.homeButton}
              onPress={() =>
                router.replace({
                  pathname: "/(tabs)",
                  params: { idUser: String(idUser) },
                })
              }
            >
              <MaterialCommunityIcons name="home-outline" size={18} color="#fff" />
              <Text style={exStyles.homeButtonText}>Ir al inicio</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const exStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#4D9E8F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#4D9E8F",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a2e2b",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7b79",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 18,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0faf7",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    width: "100%",
  },
  dataText: {
    fontSize: 13,
    color: "#2d5a52",
    fontWeight: "600",
    flexShrink: 1,
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4D9E8F",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 18,
    width: "100%",
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
