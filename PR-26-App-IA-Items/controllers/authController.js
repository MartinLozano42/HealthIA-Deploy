import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getOnboarding,
  loginUser,
  requestPasswordReset,
} from "../services/services/api";

const extractUser = (response) =>
  response?.user || response?.data?.user || response;

const validateName = (name) => {
  const rawName = String(name || "");

  if (!rawName) {
    throw new Error("El nombre es obligatorio");
  }

  if (rawName !== rawName.trim()) {
    throw new Error("El nombre no puede tener espacios al inicio o al final");
  }

  const cleanName = rawName.trim();

  if (!cleanName) {
    throw new Error("El nombre no puede estar vacio");
  }

  if (cleanName.length < 3) {
    throw new Error("El nombre debe tener al menos 3 caracteres");
  }

  if (cleanName.length > 80) {
    throw new Error("El nombre no puede superar los 80 caracteres");
  }

  const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;
  if (!nameRegex.test(cleanName)) {
    throw new Error("El nombre solo puede contener letras y espacios");
  }

  return cleanName;
};

const validateEmail = (email) => {
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!cleanEmail) {
    throw new Error("El correo es obligatorio");
  }

  if (cleanEmail.length > 120) {
    throw new Error("El correo es demasiado largo");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error("Ingresa un correo valido");
  }

  return cleanEmail;
};

const validatePassword = (password) => {
  const cleanPassword = String(password || "").trim();

  if (!cleanPassword) {
    throw new Error("La contrasena es obligatoria");
  }

  if (cleanPassword.length < 8) {
    throw new Error("La contrasena debe tener al menos 8 caracteres");
  }

  if (cleanPassword.length > 64) {
    throw new Error("La contrasena no puede superar los 64 caracteres");
  }

  if (/\s/.test(cleanPassword)) {
    throw new Error("La contrasena no puede contener espacios");
  }

  if (!/[A-Z]/.test(cleanPassword)) {
    throw new Error("La contrasena debe tener al menos una mayuscula");
  }

  if (!/[a-z]/.test(cleanPassword)) {
    throw new Error("La contrasena debe tener al menos una minuscula");
  }

  if (!/[0-9]/.test(cleanPassword)) {
    throw new Error("La contrasena debe tener al menos un numero");
  }

  if (!/[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(cleanPassword)) {
    throw new Error("La contrasena debe tener al menos un caracter especial");
  }

  return cleanPassword;
};

export const REGISTER_PASSWORD_REQUIREMENTS = [
  { key: "minLength", label: "Minimo 8 caracteres" },
  { key: "upper", label: "Al menos una mayuscula" },
  { key: "lower", label: "Al menos una minuscula" },
  { key: "number", label: "Al menos un numero" },
  { key: "special", label: "Al menos un caracter especial" },
  { key: "noSpaces", label: "Sin espacios" },
];

export const getRegisterValidationMessage = (
  name,
  email,
  password,
  confirmPassword,
) => {
  try {
    const cleanPassword = validatePassword(password);
    const cleanConfirmPassword = String(confirmPassword || "").trim();

    validateName(name);
    validateEmail(email);

    if (!cleanConfirmPassword) {
      return "Debes confirmar la contrasena";
    }

    if (cleanPassword !== cleanConfirmPassword) {
      return "Las contraseñas no coinciden";
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Datos de registro invalidos";
  }
};

export const getRegisterPasswordChecks = (password, confirmPassword) => {
  const cleanPassword = String(password || "").trim();
  const cleanConfirmPassword = String(confirmPassword || "").trim();

  return {
    minLength: cleanPassword.length >= 8,
    upper: /[A-Z]/.test(cleanPassword),
    lower: /[a-z]/.test(cleanPassword),
    number: /[0-9]/.test(cleanPassword),
    special: /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(cleanPassword),
    noSpaces: cleanPassword.length > 0 && !/\s/.test(cleanPassword),
    match:
      cleanPassword.length > 0 &&
      cleanConfirmPassword.length > 0 &&
      cleanPassword === cleanConfirmPassword,
  };
};

export const loginAndResolveRoute = async (email, password) => {
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();
  const cleanPassword = String(password || "").trim();

  if (!cleanEmail || !cleanPassword) {
    throw new Error("Completa todos los campos");
  }

  const response = await loginUser(cleanEmail, cleanPassword);
  const user = extractUser(response);

  if (!user || !user.id) {
    throw new Error("Credenciales incorrectas");
  }

  if (user.status === "inactive") {
    throw new Error("ACCOUNT_INACTIVE");
  }

  try {
    await AsyncStorage.setItem("user", JSON.stringify(user));
  } catch (storageError) {
    console.log("AsyncStorage error (continuando):", storageError);
  }

  let onboardingComplete = Boolean(user?.onboardingComplete);

  if (!onboardingComplete) {
    try {
      const onboarding = await getOnboarding(user.id);
      onboardingComplete = Boolean(onboarding);
    } catch (onboardingError) {
      console.log(
        "No se pudo verificar onboarding (continuando):",
        onboardingError,
      );
    }
  }

  if (user.role === "admin") {
    return {
      pathname: "/(Admin)",
      params: { idUser: String(user.id), role: String(user.role) },
    };
  }

  if (onboardingComplete) {
    return {
      pathname: "/(tabs)",
      params: { idUser: String(user.id) },
    };
  }

  return {
    pathname: "/personal",
    params: { idUser: String(user.id) },
  };
};

export const registerAndResolveRoute = async (
  name,
  email,
  password,
  confirmPassword,
) => {
  const cleanName = validateName(name);
  const cleanEmail = validateEmail(email);
  const cleanPassword = validatePassword(password);
  const cleanConfirmPassword = String(confirmPassword || "").trim();

  if (!cleanConfirmPassword) {
    throw new Error("Debes confirmar la contrasena");
  }

  if (cleanPassword !== cleanConfirmPassword) {
    throw new Error("Las contraseñas no coinciden");
  }

  return {
    pathname: "/personal",
    params: {
      fromRegister: "1",
      registerName: cleanName,
      registerEmail: cleanEmail,
      registerPassword: cleanPassword,
    },
  };
};

export const sendPasswordReset = async (email) => {
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!cleanEmail) {
    throw new Error("Ingresa tu correo para recuperar la contrasena");
  }

  await requestPasswordReset(cleanEmail);
};
