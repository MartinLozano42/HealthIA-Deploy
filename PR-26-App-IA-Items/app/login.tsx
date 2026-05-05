import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlobalStyles } from "../constants/globalStyles";
import { Colors } from "../constants/theme";
import { loginAndResolveRoute, sendPasswordReset } from "../controllers/authController";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isInactiveAccount, setIsInactiveAccount] = useState(false);
  const [forgotEmailError, setForgotEmailError] = useState("");

  const validateFields = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    let valid = true;

    if (!cleanEmail) {
      setEmailError("El correo es obligatorio");
      valid = false;
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      setEmailError("Ingresa un correo válido");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!cleanPassword) {
      setPasswordError("La contraseña es obligatoria");
      valid = false;
    } else if (cleanPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  };

  const handleLogin = async () => {
    setLoginError("");
    setIsInactiveAccount(false);
    if (!validateFields()) return;
    try {
      setLoading(true);
      const route = await loginAndResolveRoute(email, password);
      router.replace(route as never);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "ACCOUNT_INACTIVE") {
        setIsInactiveAccount(true);
        setLoginError("Tu cuenta está inactiva y no puede iniciar sesión.");
      } else {
        setIsInactiveAccount(false);
        setLoginError("Correo o contraseña incorrectos");
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email.trim().toLowerCase());
    setForgotModalVisible(true);
  };

  const handleForgotPassword = async () => {
    const cleanForgotEmail = forgotEmail.trim().toLowerCase();
    if (!cleanForgotEmail) {
      setForgotEmailError("El correo es obligatorio");
      return;
    }
    if (!EMAIL_REGEX.test(cleanForgotEmail)) {
      setForgotEmailError("Ingresa un correo válido");
      return;
    }
    setForgotEmailError("");
    try {
      setSendingReset(true);
      await sendPasswordReset(forgotEmail);
      setForgotModalVisible(false);
      Alert.alert(
        "Correo enviado",
        "Si tu cuenta existe, recibiras un enlace para restablecer la contrasena."
      );
    } catch {
      setForgotEmailError("No se pudo enviar el correo, intenta de nuevo");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={GlobalStyles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Volver</Text>
      </Pressable>

      <View style={styles.logoBox}>
        <MaterialCommunityIcons name="leaf" size={22} color="white" />
      </View>

      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        style={[styles.input, !!emailError && styles.inputError]}
        placeholder="tu@correo.com"
        value={email}
        onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(""); }}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#8c97a2"
      />
      {!!emailError && (
        <View style={styles.fieldErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
          <Text style={styles.fieldErrorText}>{emailError}</Text>
        </View>
      )}

      <Text style={styles.label}>Contraseña</Text>
      <View style={[styles.passwordWrapper, !!passwordError && styles.inputError]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(""); }}
          placeholderTextColor="#8c97a2"
        />
        <Pressable onPress={() => setShowPassword((prev) => !prev)}>
          <MaterialCommunityIcons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={Colors.light.primary}
          />
        </Pressable>
      </View>
      {!!passwordError && (
        <View style={styles.fieldErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#e53935" />
          <Text style={styles.fieldErrorText}>{passwordError}</Text>
        </View>
      )}

      <Pressable onPress={openForgotPassword}>
        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <Pressable
        style={[GlobalStyles.primaryButton, styles.loginButton, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={GlobalStyles.buttonText}>Iniciar sesión</Text>
        )}
      </Pressable>
      {!!loginError && !isInactiveAccount && (
        <View style={styles.loginErrorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#e53935" />
          <Text style={styles.loginErrorText}>{loginError}</Text>
        </View>
      )}

      {isInactiveAccount && (
        <View style={styles.inactiveBox}>
          <View style={styles.inactiveIconRow}>
            <MaterialCommunityIcons name="account-lock-outline" size={28} color="#b45309" />
            <Text style={styles.inactiveTitle}>Cuenta inactiva</Text>
          </View>
          <Text style={styles.inactiveBody}>
            Tu cuenta aún no ha sido activada. Contacta al administrador para que active tu acceso.
          </Text>
        </View>
      )}

      <Modal
        transparent
        animationType="fade"
        visible={forgotModalVisible}
        onRequestClose={() => { setForgotModalVisible(false); setForgotEmailError(""); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Recuperar contrasena</Text>
            <Text style={styles.modalSubtitle}>Ingresa tu correo y te enviaremos un enlace.</Text>

            <TextInput
              style={[styles.modalInput, !!forgotEmailError && styles.inputError]}
              placeholder="tu@correo.com"
              value={forgotEmail}
              onChangeText={(v) => { setForgotEmail(v); if (forgotEmailError) setForgotEmailError(""); }}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#8c97a2"
              editable={!sendingReset}
            />
            {!!forgotEmailError && (
              <View style={styles.modalErrorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#e53935" />
                <Text style={styles.modalErrorText}>{forgotEmailError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => { setForgotModalVisible(false); setForgotEmailError(""); }}
                disabled={sendingReset}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalSendButton]}
                onPress={handleForgotPassword}
                disabled={sendingReset}
              >
                {sendingReset ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSendText}>Enviar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 36,
  },

  backButton: {
    marginBottom: 14,
  },

  backText: {
    color: Colors.light.secondary,
    fontSize: 18,
    fontWeight: "700",
  },

  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  title: {
    fontSize: 28,
    color: Colors.light.text,
    fontWeight: "800",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: 16,
    color: Colors.light.text,
  },

  passwordWrapper: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.light.text,
  },

  forgotText: {
    color: Colors.light.primary,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 20,
  },

  loginButton: {
    marginTop: 6,
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
  },
  modalSendButton: {
    backgroundColor: Colors.light.primary,
  },
  modalCancelText: {
    color: Colors.light.text,
    fontWeight: "700",
  },
  modalSendText: {
    color: "white",
    fontWeight: "700",
  },
  inputError: {
    borderColor: "#e53935",
  },
  fieldErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fdecea",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  fieldErrorText: {
    color: "#e53935",
    fontSize: 12,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  modalErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fdecea",
    borderWidth: 1,
    borderColor: "#f5c6c6",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: "#e53935",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  loginErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fdecea",
    borderWidth: 1,
    borderColor: "#f5c6c6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  loginErrorText: {
    color: "#e53935",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  inactiveBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  inactiveIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inactiveTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400e",
  },
  inactiveBody: {
    fontSize: 13,
    color: "#78350f",
    lineHeight: 20,
  },
});
