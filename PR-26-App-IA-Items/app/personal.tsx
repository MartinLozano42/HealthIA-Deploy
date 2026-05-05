import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GlobalStyles, PersonalStyles } from "../constants/globalStyles";
import { Colors } from "../constants/theme";
import {
  formatBirthDate,
  formatDateForWebInput,
  getActivityLevelLabel,
  getDefaultBirthDate,
  loadActivityLevelOptions,
  loadDietOptions,
  loadFoodGroups,
  parseWebInputDate,
  saveOnboardingAndResolveRoute,
  SEX_OPTIONS,
  TOTAL_ONBOARDING_STEPS,
  validateOnboardingData,
  validateOnboardingStep,
} from "../controllers/onboardingController";

export default function Personal() {
  const params = useLocalSearchParams<{
    idUser?: string;
    fromRegister?: string;
    registerName?: string;
    registerEmail?: string;
    registerPassword?: string;
  }>();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const cameFromRegister = params.fromRegister === "1";

  const registerData = {
    name: String(params.registerName || ""),
    email: String(params.registerEmail || ""),
    password: String(params.registerPassword || ""),
  };

  // Paso 1
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const webBirthDateInputRef = useRef<HTMLInputElement | null>(null);
  const [currentWeight, setCurrentWeight] = useState("");
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState("");

  // Errores de validacion Paso 1
  const [usernameError, setUsernameError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [weightError, setWeightError] = useState('');
  const [heightError, setHeightError] = useState('');

  // Errores de validacion Paso 2
  const [targetWeightError, setTargetWeightError] = useState('');
  const [activityLevelError, setActivityLevelError] = useState('');

  // Errores de validacion Paso 3
  const [dietTypeError, setDietTypeError] = useState('');

  // Errores de validacion Paso 4
  const [ingredientsError, setIngredientsError] = useState('');

  // Paso 2
  const [targetWeight, setTargetWeight] = useState("");
  const [activityLevelId, setActivityLevelId] = useState<number | null>(null);
  const [doesWeightTraining, setDoesWeightTraining] = useState(false);

  // Paso 2 - niveles de actividad remotos
  const [activityLevelOptions, setActivityLevelOptions] = useState<{ id: number; label: string; subtitle: string }[]>([]);
  const [loadingActivityLevels, setLoadingActivityLevels] = useState(false);
  const [activityLevelsError, setActivityLevelsError] = useState<string | null>(null);

  // Paso 3
  const [dietOptions, setDietOptions] = useState<string[]>([]);
  const [loadingDiets, setLoadingDiets] = useState(false);
  const [dietsError, setDietsError] = useState<string | null>(null);
  const [dietType, setDietType] = useState("");

  // Paso 4
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [foodGroups, setFoodGroups] = useState<{ title: string; items: string[] }[]>([]);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [foodsError, setFoodsError] = useState<string | null>(null);

  const progress = (step / TOTAL_ONBOARDING_STEPS) * 100;

  useEffect(() => {
    if (step !== 2) return;

    let active = true;
    setLoadingActivityLevels(true);
    setActivityLevelsError(null);

    loadActivityLevelOptions()
      .then((options) => {
        if (active) {
          setActivityLevelOptions(options);
        }
      })
      .catch((err) => {
        if (active) {
          setActivityLevelsError(
            err instanceof Error ? err.message : "Error al cargar niveles"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingActivityLevels(false);
        }
      });

    return () => {
      active = false;
    };
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;

    let active = true;
    setLoadingFoods(true);
    setFoodsError(null);

    loadFoodGroups(dietType)
      .then((groups) => {
        if (active) {
          setFoodGroups(groups);
        }
      })
      .catch((err) => {
        if (active) {
          setFoodsError(
            err instanceof Error ? err.message : "Error al cargar alimentos"
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingFoods(false);
        }
      });

    return () => {
      active = false;
    };
  }, [step, dietType]);

  useEffect(() => {
    if (step !== 3) return;

    let active = true;
    setLoadingDiets(true);
    setDietsError(null);

    loadDietOptions()
      .then((options) => {
        if (active) {
          setDietOptions(options);
        }
      })
      .catch((err) => {
        if (active) {
          setDietsError(err instanceof Error ? err.message : "Error al cargar dietas");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDiets(false);
        }
      });

    return () => {
      active = false;
    };
  }, [step]);

  const toggleIngredient = (item: string) => {
    setIngredients((prev) => {
      const next = prev.includes(item)
        ? prev.filter((current) => current !== item)
        : [...prev, item];
      if (next.length > 0 && ingredientsError) setIngredientsError('');
      return next;
    });
  };

  const handleBirthDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowBirthDatePicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleBirthDatePress = () => {
    if (Platform.OS === "web") {
      webBirthDateInputRef.current?.showPicker?.();
      webBirthDateInputRef.current?.click();
      return;
    }

    setShowBirthDatePicker(true);
  };

  const handleWebBirthDateChange = (value: string) => {
    const parsedDate = parseWebInputDate(value);
    setBirthDate(parsedDate);
    if (birthDateError) setBirthDateError('');
  };

  const validateStep1Inline = (): boolean => {
    let valid = true;

    // Nombre de usuario
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setUsernameError('El nombre de usuario es obligatorio');
      valid = false;
    } else if (trimmedUsername.length < 3) {
      setUsernameError('Debe tener al menos 3 caracteres');
      valid = false;
    } else if (trimmedUsername.length > 30) {
      setUsernameError('Máximo 30 caracteres permitidos');
      valid = false;
    } else if (!/^[a-zA-Z0-9_.ÁÉÍÓÚáéíóúÑñ -]+$/.test(trimmedUsername)) {
      setUsernameError('Solo letras, números, guiones y puntos');
      valid = false;
    } else {
      setUsernameError('');
    }

    // Fecha de nacimiento
    if (!birthDate) {
      setBirthDateError('La fecha de nacimiento es obligatoria');
      valid = false;
    } else {
      const now = new Date();
      const maxAgeDate = new Date();
      maxAgeDate.setFullYear(now.getFullYear() - 100);
      const minAgeDate = new Date();
      minAgeDate.setFullYear(now.getFullYear() - 10);

      if (birthDate > now) {
        setBirthDateError('La fecha no puede ser en el futuro');
        valid = false;
      } else if (birthDate < maxAgeDate) {
        setBirthDateError('La edad máxima permitida es 100 años');
        valid = false;
      } else if (birthDate > minAgeDate) {
        setBirthDateError('Debes tener al menos 10 años para registrarte');
        valid = false;
      } else {
        setBirthDateError('');
      }
    }

    // Peso actual
    const parsedWeight = parseFloat(currentWeight.replace(',', '.'));
    if (!currentWeight.trim()) {
      setWeightError('El peso actual es obligatorio');
      valid = false;
    } else if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setWeightError('Ingresa un número válido mayor a 0');
      valid = false;
    } else if (parsedWeight < 20) {
      setWeightError('El peso mínimo aceptado es 20 kg');
      valid = false;
    } else if (parsedWeight > 400) {
      setWeightError('El peso máximo aceptado es 400 kg');
      valid = false;
    } else {
      setWeightError('');
    }

    // Altura
    const parsedHeight = parseFloat(height.replace(',', '.'));
    if (!height.trim()) {
      setHeightError('La altura es obligatoria');
      valid = false;
    } else if (isNaN(parsedHeight) || parsedHeight <= 0) {
      setHeightError('Ingresa un número válido mayor a 0');
      valid = false;
    } else if (parsedHeight < 80) {
      setHeightError('La altura mínima aceptada es 80 cm');
      valid = false;
    } else if (parsedHeight > 250) {
      setHeightError('La altura máxima aceptada es 250 cm');
      valid = false;
    } else {
      setHeightError('');
    }

    return valid;
  };

  const validateStep2Inline = (): boolean => {
    let valid = true;

    const parsedTarget = parseFloat(targetWeight.replace(',', '.'));
    if (!targetWeight.trim()) {
      setTargetWeightError('El peso objetivo es obligatorio');
      valid = false;
    } else if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setTargetWeightError('Ingresa un número válido mayor a 0');
      valid = false;
    } else if (parsedTarget < 20) {
      setTargetWeightError('El peso mínimo aceptado es 20 kg');
      valid = false;
    } else if (parsedTarget > 400) {
      setTargetWeightError('El peso máximo aceptado es 400 kg');
      valid = false;
    } else {
      setTargetWeightError('');
    }

    if (!activityLevelId) {
      setActivityLevelError('Selecciona tu nivel de actividad');
      valid = false;
    } else {
      setActivityLevelError('');
    }

    return valid;
  };

  const validateStep3Inline = (): boolean => {
    if (!dietType) {
      setDietTypeError('Selecciona un tipo de dieta para continuar');
      return false;
    }
    setDietTypeError('');
    return true;
  };

  const validateStep4Inline = (): boolean => {
    if (!ingredients || ingredients.length === 0) {
      setIngredientsError('Selecciona al menos un ingrediente para continuar');
      return false;
    }
    setIngredientsError('');
    return true;
  };

  const validateCurrentStep = () => {
    return validateOnboardingStep(step, {
      username,
      birthDate,
      currentWeight,
      height,
      targetWeight,
      activityLevelId,
      dietType,
      ingredients,
    });
  };

  const validateAll = () => {
    return validateOnboardingData({
      username,
      birthDate,
      currentWeight,
      height,
      targetWeight,
      activityLevelId,
      dietType,
      ingredients,
    });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!validateStep1Inline()) return;
    } else if (step === 2) {
      if (!validateStep2Inline()) return;
    } else if (step === 3) {
      if (!validateStep3Inline()) return;
    } else if (step === 4) {
      if (!validateStep4Inline()) return;
    } else {
      const error = validateCurrentStep();
      if (error) {
        Alert.alert("Completa este paso", error);
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, TOTAL_ONBOARDING_STEPS));
  };

  const previousStep = () => {
    if (step === 1) {
      if (cameFromRegister) {
        router.replace("/register");
        return;
      }

      router.back();
      return;
    }
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    if (submitting) return;

    const fullError = validateAll();
    if (fullError) {
      Alert.alert("Completa tu perfil", fullError);
      return;
    }

    try {
      setSubmitting(true);
      const result = await saveOnboardingAndResolveRoute({
        paramsIdUser: params.idUser,
        cameFromRegister,
        registerData,
        data: {
          username,
          birthDate: birthDate!,
          currentWeight,
          height,
          targetWeight,
          sex,
          activityLevelId,
          doesWeightTraining,
          dietType,
          ingredients,
        },
      });

      if (result.shouldShowRegisterSuccess) {
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
        return;
      }

      router.replace(result.nextRoute as never);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo guardar el perfil",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={PersonalStyles.safeArea} edges={["top"]}>
      <ScrollView
        style={GlobalStyles.container}
        contentContainerStyle={PersonalStyles.scrollContent}
      >
        <Text style={PersonalStyles.stepText}>
          Paso {step} de {TOTAL_ONBOARDING_STEPS}
        </Text>
        <View style={PersonalStyles.progressBarBackground}>
          <View style={[PersonalStyles.progressBarFill, { width: `${progress}%` }]} />
        </View>

        {step === 1 && (
          <View>
            <Text style={GlobalStyles.title}>Datos personales</Text>
            <Text style={PersonalStyles.subtitle}>
              Cuentanos sobre ti para personalizar tu plan
            </Text>

            <Text style={PersonalStyles.label}>Nombre de usuario</Text>
            <TextInput
              placeholder="juan_garcia (min 3 caracteres)"
              style={[
                PersonalStyles.input,
                PersonalStyles.inputBox,
                !!usernameError && PersonalStyles.inputError,
              ]}
              value={username}
              onChangeText={(v) => { setUsername(v); if (usernameError) setUsernameError(''); }}
              autoCapitalize="none"
              autoComplete="off"
              placeholderTextColor="#8c97a2"
            />
            {!!usernameError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{usernameError}</Text>
              </View>
            )}

            <Text style={PersonalStyles.label}>Fecha de nacimiento</Text>
            <Pressable
              onPress={handleBirthDatePress}
              style={[
                PersonalStyles.input,
                PersonalStyles.inputBox,
                PersonalStyles.dateInputButton,
                !!birthDateError && PersonalStyles.inputError,
              ]}
            >
              <Text
                style={
                  birthDate ? PersonalStyles.dateInputText : PersonalStyles.dateInputPlaceholder
                }
              >
                {birthDate
                  ? formatBirthDate(birthDate)
                  : "Selecciona una fecha"}
              </Text>
              <MaterialIcons
                name="calendar-month"
                size={20}
                color={Colors.light.primary}
              />
            </Pressable>

            {Platform.OS === "web" && (
              <input
                ref={webBirthDateInputRef}
                type="date"
                max={formatDateForWebInput(new Date())}
                value={birthDate ? formatDateForWebInput(birthDate) : ""}
                onChange={(event) =>
                  handleWebBirthDateChange(event.target.value)
                }
                style={PersonalStyles.hiddenWebDateInput}
                aria-label="Fecha de nacimiento"
              />
            )}

            {Platform.OS !== "web" && showBirthDatePicker && (
              <View style={PersonalStyles.datePickerWrapper}>
                <DateTimePicker
                  value={birthDate ?? getDefaultBirthDate()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    handleBirthDateChange(event, selectedDate);
                    if (birthDateError) setBirthDateError('');
                  }}
                />

                {Platform.OS === "ios" && (
                  <Pressable
                    onPress={() => setShowBirthDatePicker(false)}
                    style={PersonalStyles.datePickerDoneButton}
                  >
                    <Text style={PersonalStyles.datePickerDoneText}>Listo</Text>
                  </Pressable>
                )}
              </View>
            )}
            {!!birthDateError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{birthDateError}</Text>
              </View>
            )}

            <Text style={PersonalStyles.label}>Peso actual (kg)</Text>
            <TextInput
              placeholder="70"
              style={[
                PersonalStyles.input,
                PersonalStyles.inputBox,
                !!weightError && PersonalStyles.inputError,
              ]}
              value={currentWeight}
              onChangeText={(v) => { setCurrentWeight(v); if (weightError) setWeightError(''); }}
              keyboardType="decimal-pad"
              placeholderTextColor="#8c97a2"
            />
            {!!weightError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{weightError}</Text>
              </View>
            )}

            <Text style={PersonalStyles.label}>Altura (cm)</Text>
            <TextInput
              placeholder="175"
              style={[
                PersonalStyles.input,
                PersonalStyles.inputBox,
                !!heightError && PersonalStyles.inputError,
              ]}
              value={height}
              onChangeText={(v) => { setHeight(v); if (heightError) setHeightError(''); }}
              keyboardType="decimal-pad"
              placeholderTextColor="#8c97a2"
            />
            {!!heightError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{heightError}</Text>
              </View>
            )}

            <Text style={PersonalStyles.label}>Sexo (opcional)</Text>
            <View style={PersonalStyles.rowWrap}>
              {SEX_OPTIONS.map((option) => {
                const selected = sex === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSex(sex === option.value ? '' : option.value)}
                    style={[
                      PersonalStyles.choiceButton,
                      selected && PersonalStyles.choiceButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        PersonalStyles.choiceText,
                        selected && PersonalStyles.choiceTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={PersonalStyles.fieldHintBox}>
              <MaterialCommunityIcons name="information-outline" size={13} color="#6e8efb" />
              <Text style={PersonalStyles.fieldHintText}>
                Este dato ayuda a personalizar mejor tu plan. Puedes omitirlo.
              </Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={GlobalStyles.title}>Tu objetivo</Text>
            <Text style={PersonalStyles.subtitle}>
              Define tu meta de peso y nivel de actividad
            </Text>

            <Text style={PersonalStyles.label}>Peso objetivo (kg)</Text>
            <TextInput
              placeholder="65"
              style={[
                PersonalStyles.input,
                PersonalStyles.inputBox,
                !!targetWeightError && PersonalStyles.inputError,
              ]}
              value={targetWeight}
              placeholderTextColor="#8c97a2"
              onChangeText={(v) => { setTargetWeight(v); if (targetWeightError) setTargetWeightError(''); }}
              keyboardType="decimal-pad"
            />
            {!!targetWeightError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{targetWeightError}</Text>
              </View>
            )}

            <Text style={PersonalStyles.label}>Nivel de actividad</Text>

            {loadingActivityLevels && (
              <ActivityIndicator color={Colors.light.primary} style={PersonalStyles.activityLoading} />
            )}

            {activityLevelsError != null && (
              <Text style={PersonalStyles.inlineError}>{activityLevelsError}</Text>
            )}

            <View style={PersonalStyles.activityLevelsList}>
              {activityLevelOptions.map((option) => {
                const selected = option.id === activityLevelId;
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      PersonalStyles.activityOption,
                      selected && PersonalStyles.activityOptionSelected,
                      !!activityLevelError && !activityLevelId && PersonalStyles.activityOptionError,
                    ]}
                    onPress={() => { setActivityLevelId(option.id); setActivityLevelError(''); }}
                  >
                    <View
                      style={[
                        PersonalStyles.radioCircle,
                        selected && PersonalStyles.radioCircleSelected,
                      ]}
                    />
                    <View>
                      <Text style={PersonalStyles.activityTitle}>{option.label}</Text>
                      <Text style={PersonalStyles.activitySubtitle}>
                        {option.subtitle}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {!!activityLevelError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{activityLevelError}</Text>
              </View>
            )}

            <View style={PersonalStyles.switchCard}>
              <View>
                <Text style={PersonalStyles.activityTitle}>¿Haces alza de pesos?</Text>
                <Text style={PersonalStyles.activitySubtitle}>
                  Entrenamiento de resistencia
                </Text>
              </View>
              <Switch
                value={doesWeightTraining}
                onValueChange={setDoesWeightTraining}
                trackColor={{ false: "#d9d9d9", true: Colors.light.secondary }}
                thumbColor={doesWeightTraining ? Colors.light.primary : "#fff"}
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={GlobalStyles.title}>Tipo de dieta</Text>
            <Text style={PersonalStyles.subtitle}>
              ¿Cual es tu preferencia alimentaria?
            </Text>

            {loadingDiets && (
              <ActivityIndicator
                color={Colors.light.primary}
                style={PersonalStyles.activityLoading}
              />
            )}

            {dietsError != null && (
              <Text style={PersonalStyles.inlineError}>{dietsError}</Text>
            )}

            <View style={PersonalStyles.gridTwoColumns}>
              {dietOptions.map((option) => {
                const selected = dietType === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      PersonalStyles.gridButton,
                      selected && PersonalStyles.gridButtonSelected,
                    ]}
                    onPress={() => { setDietType(option); setDietTypeError(''); }}
                  >
                    <Text
                      style={[
                        PersonalStyles.gridButtonText,
                        selected && PersonalStyles.gridButtonTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!!dietTypeError && (
              <View style={[PersonalStyles.fieldErrorBox, { marginTop: 12 }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{dietTypeError}</Text>
              </View>
            )}
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={GlobalStyles.title}>Ingredientes en casa</Text>
            <Text style={PersonalStyles.subtitle}>
              Selecciona al menos uno que tengas disponible
            </Text>

            {!!ingredientsError && (
              <View style={PersonalStyles.fieldErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
                <Text style={PersonalStyles.fieldErrorText}>{ingredientsError}</Text>
              </View>
            )}

            {loadingFoods && (
              <ActivityIndicator
                color={Colors.light.primary}
                style={PersonalStyles.foodsLoading}
              />
            )}

            {foodsError != null && (
              <Text style={PersonalStyles.foodsError}>{foodsError}</Text>
            )}

            {!loadingFoods &&
              foodsError == null &&
              foodGroups.map((group) => (
                <View key={group.title} style={PersonalStyles.foodGroup}>
                  <Text style={PersonalStyles.groupTitle}>{group.title}</Text>
                  <View style={PersonalStyles.rowWrap}>
                    {group.items.map((item) => {
                      const selected = ingredients.includes(item);
                      return (
                        <Pressable
                          key={item}
                          onPress={() => toggleIngredient(item)}
                          style={[PersonalStyles.chip, selected && PersonalStyles.chipSelected]}
                        >
                          <Text
                            style={[
                              PersonalStyles.chipText,
                              selected && PersonalStyles.chipTextSelected,
                            ]}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
          </View>
        )}

        {step === 5 && (
          <View>
            <View style={PersonalStyles.doneCircle}>
              <Text style={PersonalStyles.doneCheck}>✓</Text>
            </View>
            <Text style={[GlobalStyles.title, PersonalStyles.centeredTitle]}>
              ¡Todo listo!
            </Text>
            <Text
              style={[
                PersonalStyles.subtitle,
                PersonalStyles.subtitleCentered,
              ]}
            >
              Tu perfil esta configurado. La IA generara un plan personalizado
              con tus datos.
            </Text>

            <View style={PersonalStyles.summaryCard}>
              <Text style={PersonalStyles.summaryLabel}>Usuario</Text>
              <Text style={PersonalStyles.summaryValue}>
                {username || "Sin definir"}
              </Text>
            </View>
            <View style={PersonalStyles.summaryCard}>
              <Text style={PersonalStyles.summaryLabel}>Peso actual</Text>
              <Text style={PersonalStyles.summaryValue}>
                {currentWeight ? `${currentWeight} kg` : "Sin definir"}
              </Text>
            </View>
            <View style={PersonalStyles.summaryCard}>
              <Text style={PersonalStyles.summaryLabel}>Objetivo</Text>
              <Text style={PersonalStyles.summaryValue}>
                {targetWeight ? `${targetWeight} kg` : "Sin definir"}
              </Text>
            </View>
            <View style={PersonalStyles.summaryCard}>
              <Text style={PersonalStyles.summaryLabel}>Actividad</Text>
              <Text style={PersonalStyles.summaryValue}>
                {getActivityLevelLabel(activityLevelOptions, activityLevelId)}
              </Text>
            </View>
            <View style={PersonalStyles.summaryCard}>
              <Text style={PersonalStyles.summaryLabel}>Dieta</Text>
              <Text style={PersonalStyles.summaryValue}>
                {dietType || "Sin definir"}
              </Text>
            </View>
            <View style={PersonalStyles.summaryCard}>
              <Text style={PersonalStyles.summaryLabel}>Ingredientes</Text>
              <Text style={PersonalStyles.summaryValue}>
                {ingredients.length} seleccionados
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            PersonalStyles.footerButtons,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <Pressable
            style={PersonalStyles.backButton}
            onPress={previousStep}
            disabled={submitting}
          >
            <Text style={PersonalStyles.backButtonText}>‹</Text>
          </Pressable>

          {step < TOTAL_ONBOARDING_STEPS ? (
            <Pressable
              style={[GlobalStyles.primaryButton, PersonalStyles.continueButton]}
              onPress={nextStep}
            >
              <Text style={GlobalStyles.buttonText}>Continuar ›</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                GlobalStyles.primaryButton,
                PersonalStyles.continueButton,
                submitting && PersonalStyles.buttonDisabled,
              ]}
              onPress={handleFinish}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={GlobalStyles.buttonText}>Generar mi plan ✨</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Pantalla de éxito */}
      {showSuccess && (
        <Animated.View style={[successStyles.overlay, { opacity: successOpacity }]}>
          <Animated.View style={[successStyles.card, { transform: [{ scale: successScale }] }]}>
            {/* Ícono animado */}
            <View style={successStyles.iconCircle}>
              <MaterialCommunityIcons name="check-bold" size={52} color="#fff" />
            </View>

            <Text style={successStyles.title}>¡Registro exitoso!</Text>
            <Text style={successStyles.subtitle}>
              Tu cuenta y perfil han sido creados correctamente. Ya puedes iniciar sesión y comenzar tu plan personalizado.
            </Text>

            {/* Datos resumidos */}
            <View style={successStyles.dataRow}>
              <MaterialCommunityIcons name="account-outline" size={16} color="#4D9E8F" />
              <Text style={successStyles.dataText}>{username}</Text>
            </View>
            <View style={successStyles.dataRow}>
              <MaterialCommunityIcons name="food-apple-outline" size={16} color="#4D9E8F" />
              <Text style={successStyles.dataText}>Dieta {dietType} · {ingredients.length} ingredientes</Text>
            </View>
            <View style={successStyles.dataRow}>
              <MaterialCommunityIcons name="target" size={16} color="#4D9E8F" />
              <Text style={successStyles.dataText}>Objetivo: {targetWeight} kg</Text>
            </View>

            <Pressable
              style={successStyles.loginButton}
              onPress={() => router.replace("/login")}
            >
              <MaterialCommunityIcons name="login" size={18} color="#fff" />
              <Text style={successStyles.loginButtonText}>Ir a iniciar sesión</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const successStyles = StyleSheet.create({
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
    fontSize: 26,
    fontWeight: "800",
    color: "#1a2e2b",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7b79",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
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
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4D9E8F",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 20,
    width: "100%",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
