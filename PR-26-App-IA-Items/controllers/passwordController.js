import { resetPasswordWithToken } from "../services/services/api";

export const getTokenValue = (tokenParam) => {
  if (Array.isArray(tokenParam)) {
    return tokenParam[0] || "";
  }

  return tokenParam || "";
};

export const validatePasswordResetInput = (token, password, confirmPassword) => {
  const cleanPassword = password.trim();
  const cleanConfirmPassword = confirmPassword.trim();

  if (!token) {
    return "El enlace no contiene un token valido.";
  }

  if (!cleanPassword || !cleanConfirmPassword) {
    return "Completa ambos campos de contrasena.";
  }

  if (cleanPassword.length < 6) {
    return "La contrasena debe tener al menos 6 caracteres.";
  }

  if (cleanPassword !== cleanConfirmPassword) {
    return "Las contrasenas no coinciden.";
  }

  return null;
};

export const resetPassword = async (token, password) => {
  await resetPasswordWithToken(token, password.trim());
};

export const submitPasswordReset = async (token, password, confirmPassword) => {
  const validationError = validatePasswordResetInput(
    token,
    password,
    confirmPassword,
  );

  if (validationError) {
    throw new Error(validationError);
  }

  await resetPassword(token, password);
};
