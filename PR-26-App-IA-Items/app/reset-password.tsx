import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlobalStyles, ResetPasswordStyles } from "../constants/globalStyles";
import {
    getTokenValue,
  submitPasswordReset,
} from "../controllers/passwordController";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => getTokenValue(params.token).trim(), [params.token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await submitPasswordReset(token, password, confirmPassword);

      Alert.alert("Listo", "Tu contrasena fue actualizada correctamente.", [
        {
          text: "Ir a login",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contrasena"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={ResetPasswordStyles.safeArea} edges={["top"]}>
      <ScrollView style={GlobalStyles.container} contentContainerStyle={ResetPasswordStyles.content}>
        <Text style={ResetPasswordStyles.title}>Restablecer contrasena</Text>
        <Text style={ResetPasswordStyles.subtitle}>
          Ingresa una nueva contrasena para tu cuenta.
        </Text>

        <View style={ResetPasswordStyles.card}>
          <Text style={ResetPasswordStyles.label}>Nueva contrasena</Text>
          <TextInput
            style={ResetPasswordStyles.input}
            placeholder="Minimo 6 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#8c97a2"
          />

          <Text style={ResetPasswordStyles.label}>Confirmar contrasena</Text>
          <TextInput
            style={ResetPasswordStyles.input}
            placeholder="Repite la contrasena"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor="#8c97a2"
          />

          <Pressable
            style={[GlobalStyles.primaryButton, ResetPasswordStyles.submitButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={GlobalStyles.buttonText}>Guardar nueva contrasena</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace("/login")} disabled={submitting}>
            <Text style={ResetPasswordStyles.backToLogin}>Volver a iniciar sesion</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
