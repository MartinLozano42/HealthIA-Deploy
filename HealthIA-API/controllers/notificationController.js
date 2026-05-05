import pool from "../db/connection.js";

export const createNotification = async (idUser, type, title, message) => {
  try {
    await pool.query(
      "INSERT INTO notifications (idUser, type, title, message) VALUES (?, ?, ?, ?)",
      [idUser, type, title, message]
    );
  } catch (err) {
    console.error("createNotification error:", err);
  }
};

const checkInactivityReminder = async (idUser) => {
  try {
    const [[last]] = await pool.query(
      "SELECT MAX(registeredDate) AS lastDate FROM exerciselog WHERE idUser = ?",
      [idUser]
    );

    if (!last?.lastDate) return;

    const daysSince = Math.floor(
      (Date.now() - new Date(last.lastDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince < 7) return;

    const [[recent]] = await pool.query(
      `SELECT id FROM notifications
       WHERE idUser = ? AND type = 'reminder'
         AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       LIMIT 1`,
      [idUser]
    );

    if (recent) return;

    await createNotification(
      idUser,
      "reminder",
      "Te extrañamos",
      "Hace una semana que no entrenas 💪"
    );
  } catch (err) {
    console.error("checkInactivityReminder error:", err);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const idUser = Number(req.params.idUser);

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }

    checkInactivityReminder(idUser).catch(() => {});

    const [rows] = await pool.query(
      `SELECT id, type, title, message, isRead,
              DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%s') AS createdAt
       FROM notifications
       WHERE idUser = ?
       ORDER BY createdAt DESC
       LIMIT 50`,
      [idUser]
    );

    return res.json(rows);
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ message: "No se pudieron obtener las notificaciones" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "id inválido" });
    }

    await pool.query("UPDATE notifications SET isRead = 1 WHERE id = ?", [id]);

    return res.json({ message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ message: "No se pudo marcar como leída" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const idUser = Number(req.params.idUser);

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }

    await pool.query(
      "UPDATE notifications SET isRead = 1 WHERE idUser = ? AND isRead = 0",
      [idUser]
    );

    return res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    return res.status(500).json({ message: "No se pudo actualizar las notificaciones" });
  }
};
