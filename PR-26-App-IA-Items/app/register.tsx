import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactElement, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlobalStyles, RegisterStyles } from "../constants/globalStyles";
import { Colors } from "../constants/theme";
import {
  getRegisterPasswordChecks,
  getRegisterValidationMessage,
  REGISTER_PASSWORD_REQUIREMENTS,
  registerAndResolveRoute,
} from "../controllers/authController";

export default function Register(): ReactElement {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validationMessage = useMemo<string | null>(() => {
    return getRegisterValidationMessage(name, email, password, confirmPassword);
  }, [name, email, password, confirmPassword]);

  const passwordChecks = useMemo<Record<string, boolean>>(() => {
    return getRegisterPasswordChecks(password, confirmPassword);
  }, [password, confirmPassword]);

  const handleRegister = async (): Promise<void> => {
    if (isSubmitting) return;

    const errorMessage = getRegisterValidationMessage(
      name,
      email,
      password,
      confirmPassword,
    );

    if (errorMessage) {
      Alert.alert("Revisa el formulario", errorMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      const route = await registerAndResolveRoute(
        name,
        email,
        password,
        confirmPassword,
      );
      router.replace(route as any);
    } catch (error: unknown) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo registrar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheck = (ok: boolean, text: string): ReactElement => (
    <View style={RegisterStyles.checkRow} key={text}>
      <Text style={[RegisterStyles.checkIcon, ok ? RegisterStyles.checkOk : RegisterStyles.checkOff]}>
        {ok ? "✓" : "•"}
      </Text>
      <Text
        style={[
          RegisterStyles.checkText,
          ok ? RegisterStyles.checkTextOk : RegisterStyles.checkTextOff,
        ]}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={RegisterStyles.safeArea} edges={["top"]}>
      <ScrollView
        style={GlobalStyles.container}
        contentContainerStyle={RegisterStyles.scrollContent}
      >
        <Pressable style={RegisterStyles.backButton} onPress={() => router.back()}>
          <MaterialIcons
            name="arrow-back"
            size={20}
            color={Colors.light.primary}
          />
          <Text style={RegisterStyles.backText}>Volver</Text>
        </Pressable>

        <Text style={RegisterStyles.title}>Crear cuenta</Text>
        <Text style={RegisterStyles.subtitle}>Empieza tu camino saludable</Text>

        <View style={RegisterStyles.form}>
          <View>
            <Text style={RegisterStyles.label}>Nombre completo</Text>
            <TextInput
              placeholder="Juan García"
              style={[GlobalStyles.card, RegisterStyles.input]}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
              editable={!isSubmitting}
            />
          </View>

          <View>
            <Text style={RegisterStyles.label}>Correo electrónico</Text>
            <TextInput
              placeholder="tu@correo.com"
              style={[GlobalStyles.card, RegisterStyles.input]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
              editable={!isSubmitting}
            />
          </View>

          <View>
            <Text style={RegisterStyles.label}>Contraseña</Text>
            <View style={[GlobalStyles.card, RegisterStyles.passwordWrapper]}>
              <TextInput
                placeholder="Min. 8 caracteres"
                secureTextEntry={!showPassword}
                style={RegisterStyles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={RegisterStyles.eyeButtonRight}
                disabled={isSubmitting}
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.light.primary}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={RegisterStyles.label}>Confirmar contraseña</Text>
            <View style={[GlobalStyles.card, RegisterStyles.passwordWrapper]}>
              <TextInput
                placeholder="Repite tu contraseña"
                secureTextEntry={!showConfirmPassword}
                style={RegisterStyles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={RegisterStyles.eyeButtonRight}
                disabled={isSubmitting}
              >
                <MaterialCommunityIcons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.light.primary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={RegisterStyles.validationCard}>
          <Text style={RegisterStyles.validationTitle}>La contraseña debe tener:</Text>
          {REGISTER_PASSWORD_REQUIREMENTS.map((requirement) =>
            renderCheck(Boolean(passwordChecks[requirement.key]), requirement.label),
          )}
          {confirmPassword.length > 0 &&
            renderCheck(passwordChecks.match, "Las contraseñas coinciden")}
        </View>

        {validationMessage && (
          <View style={RegisterStyles.warningBox}>
            <Text style={RegisterStyles.warningText}>{validationMessage}</Text>
          </View>
        )}

        <Text style={RegisterStyles.legalText}>
          Al crear una cuenta aceptas nuestros{" "}
          <Text style={RegisterStyles.link}>Términos de servicio</Text> y{" "}
          <Text style={RegisterStyles.link}>Política de privacidad</Text>.
        </Text>

        <Pressable
          style={[
            GlobalStyles.primaryButton,
            (isSubmitting || !!validationMessage) && RegisterStyles.disabledButton,
          ]}
          onPress={handleRegister}
          disabled={isSubmitting || !!validationMessage}
        >
          <Text style={GlobalStyles.buttonText}>
            {isSubmitting ? "Validando..." : "Continuar →"}
          </Text>
        </Pressable>

        <View style={RegisterStyles.footer}>
          <Text style={RegisterStyles.footerText}>¿Ya tienes cuenta?</Text>
          <Pressable
            onPress={() => router.push("/login")}
            disabled={isSubmitting}
          >
            <Text style={RegisterStyles.loginLink}>Inicia sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
