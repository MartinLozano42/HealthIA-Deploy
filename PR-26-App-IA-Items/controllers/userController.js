import User from "../models/User";
import { getUsers, updateUserStatus } from "../services/services/api";

export const loadUsers = async () => {
  const data = await getUsers();

  return data.map(
    (u) =>
      new User(
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.registrationDate,
        u.status,
        u.activationDate
      )
  );
};

export const changeUserStatus = async (user) => {
  const newStatus = user.status === "active" ? "inactive" : "active";

  const response = await updateUserStatus(user.id, newStatus);
  const updated = response?.user;

  if (updated && updated.id) {
    return new User(
      updated.id,
      updated.name ?? user.name,
      updated.email ?? user.email,
      updated.password ?? user.password,
      updated.role ?? user.role,
      updated.registrationDate ?? user.registrationDate,
      updated.status ?? newStatus,
      updated.activationDate ?? null
    );
  }

  user.status = newStatus;

  if (newStatus === "inactive") {
    user.activationDate = null;
  }

  return user;
};

export const getActiveTime = (activationDate) => {
  if (!activationDate) return null;

  const diffMs = Date.now() - new Date(activationDate).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days === 0 && hours === 0) return "Activo hace unos minutos";
  if (days === 0) return `${hours} ${hours === 1 ? "hora" : "horas"} activo`;

  return `${days} ${days === 1 ? "día" : "días"} y ${hours} ${
    hours === 1 ? "hora" : "horas"
  } activo`;
};

export const getActivationMonthYear = (activationDate) => {
  if (!activationDate) return null;

  const date = new Date(activationDate);
  const month = date.toLocaleString("es-ES", { month: "long" });
  const year = date.getFullYear();

  return `${month} ${year}`;
};