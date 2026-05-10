import pool from "../db/connection.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const PASSWORD_RESET_WINDOW_MINUTES = Number(
  process.env.PASSWORD_RESET_WINDOW_MINUTES || 30
);
const MAIL_APP_NAME = process.env.MAIL_APP_NAME || "HealthIA";
const MAIL_PRIMARY_COLOR = process.env.MAIL_PRIMARY_COLOR || "#0b6b57";

let passwordResetTableEnsured = false;

const getPasswordResetGenericResponse = () => ({
  message:
    "Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena.",
});

const ensurePasswordResetTable = async () => {
  if (passwordResetTableEnsured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      idUser INT NOT NULL,
      tokenHash VARCHAR(64) NOT NULL,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_token_hash (tokenHash),
      INDEX idx_password_reset_user (idUser),
      CONSTRAINT fk_password_reset_user
        FOREIGN KEY (idUser)
        REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  passwordResetTableEnsured = true;
};

const buildResetUrl = (token) => {
  const rawBaseUrl =
    process.env.RESET_PASSWORD_URL || process.env.FRONTEND_URL || "";

  if (!rawBaseUrl) return `token=${token}`;

  const separator = rawBaseUrl.includes("?") ? "&" : "?";
  return `${rawBaseUrl}${separator}token=${encodeURIComponent(token)}`;
};

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "SMTP incompleto: faltan SMTP_HOST, SMTP_USER, SMTP_PASS o SMTP_FROM"
    );
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
    }),
    from,
  };
};

const sendPasswordResetCodeEmail = async ({ to, code }) => {
  const { transporter, from } = createTransporter();
  await transporter.verify();

  const safeAppName = String(MAIL_APP_NAME).replace(/[<>]/g, "");
  const currentYear = new Date().getFullYear();

  const plainText = [
    "Hola,",
    "",
    `Recibimos una solicitud para restablecer tu contrasena en ${safeAppName}.`,
    `Tu codigo de verificacion es: ${code}`,
    `Este codigo vence en ${PASSWORD_RESET_WINDOW_MINUTES} minutos.`,
    "",
    "Si no solicitaste este cambio, puedes ignorar este correo.",
  ].join("\n");

  const html = `
  <div style="margin:0;padding:24px 12px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background:${MAIL_PRIMARY_COLOR};padding:22px 24px;text-align:center;">
          <h1 style="margin:0;font-size:30px;line-height:1.2;color:#ffffff;font-weight:700;">${safeAppName}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:26px 24px 8px 24px;">
          <p style="margin:0 0 14px 0;font-size:18px;font-weight:700;color:#111827;">Recuperacion de contrasena</p>
          <p style="margin:0 0 16px 0;font-size:16px;line-height:1.55;">
            Hola, recibimos una solicitud para restablecer tu contrasena en <strong>${safeAppName}</strong>.
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.5;color:#4b5563;">
            Ingresa el siguiente codigo en la aplicacion para continuar:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px auto;">
            <tr>
              <td align="center" style="background:#f0faf7;border:2px solid ${MAIL_PRIMARY_COLOR};border-radius:14px;padding:18px 32px;">
                <span style="font-size:38px;font-weight:800;color:${MAIL_PRIMARY_COLOR};letter-spacing:10px;">${code}</span>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 22px 0;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">
            Este codigo vence en <strong>${PASSWORD_RESET_WINDOW_MINUTES} minutos</strong>.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
            Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;background:#111827;color:#d1d5db;text-align:center;font-size:12px;">
          © ${currentYear} ${safeAppName}. Todos los derechos reservados.
        </td>
      </tr>
    </table>
  </div>`;

  const info = await transporter.sendMail({
    from: `"${safeAppName}" <${from}>`,
    to,
    subject: `Codigo de verificacion - ${safeAppName}`,
    text: plainText,
    html,
  });

  console.log("Correo enviado:", info.messageId);
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

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
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) {
    throw new Error("El correo es obligatorio");
  }

  if (cleanEmail.length > 120) {
    throw new Error("El correo es demasiado largo");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error("Correo invalido");
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

export const testMail = async (req, res) => {
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
    const from = process.env.SMTP_FROM || user;
    const to = req.body?.to || user;

    if (!host || !user || !pass || !from) {
      return res.status(500).json({
        message: "Faltan variables SMTP_HOST, SMTP_USER, SMTP_PASS o SMTP_FROM",
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: {
        user,
        pass,
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `HealthIA <${from}>`,
      to,
      subject: "Prueba SMTP HealthIA",
      text: "Si recibes este correo, SMTP esta funcionando.",
      html: "<p>Si recibes este correo, <b>SMTP esta funcionando</b>.</p>",
    });

    return res.status(200).json({
      message: "Correo de prueba enviado",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("testMail error:", error);
    return res.status(500).json({
      message: "Fallo SMTP",
      error: String(error && error.message ? error.message : error),
    });
  }
};

export const register = async (req, res) => {
  try {
    const name = validateName(req.body?.name);
    const email = validateEmail(req.body?.email);
    const password = validatePassword(req.body?.password);

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "El correo ya esta registrado",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO users
        (name, email, password, role, registrationDate, status, activationDate)
       VALUES (?, ?, ?, 'user', NOW(), 'inactive', NULL)`,
      [name, email, password]
    );

    return res.status(201).json({
      user: {
        id: result.insertId,
        name,
        email,
        role: "user",
        status: "inactive",
        registrationDate: new Date().toISOString(),
        activationDate: null,
      },
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Error al registrar",
    });
  }
};

export const login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        message: "Completa correo y contrasena",
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = ? AND password = ? LIMIT 1",
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    return res.json({
      user: sanitizeUser(rows[0]),
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Error en login" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "El correo es obligatorio",
      });
    }

    await ensurePasswordResetTable();

    const [users] = await pool.query(
      "SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(200).json(getPasswordResetGenericResponse());
    }

    const user = users[0];
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashResetToken(code);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_WINDOW_MINUTES * 60 * 1000
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (idUser, tokenHash, expiresAt) VALUES (?, ?, ?)`,
      [user.id, codeHash, expiresAt]
    );

    await sendPasswordResetCodeEmail({ to: user.email, code });

    return res.status(200).json(getPasswordResetGenericResponse());
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({
      message: "No se pudo procesar la solicitud",
    });
  }
};

export const verifyCode = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({ message: "Correo y codigo son obligatorios" });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Codigo invalido" });
    }

    await ensurePasswordResetTable();

    const [users] = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Codigo invalido o expirado" });
    }

    const user = users[0];
    const codeHash = hashResetToken(code);

    const [rows] = await pool.query(
      `SELECT id, expiresAt, usedAt
       FROM password_reset_tokens
       WHERE idUser = ? AND tokenHash = ?
       ORDER BY createdAt DESC LIMIT 1`,
      [user.id, codeHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Codigo invalido o expirado" });
    }

    const record = rows[0];

    if (record.usedAt) {
      return res.status(400).json({ message: "El codigo ya fue utilizado" });
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "El codigo ha expirado" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashResetToken(resetToken);

    await pool.query(
      "UPDATE password_reset_tokens SET tokenHash = ? WHERE id = ?",
      [resetTokenHash, record.id]
    );

    return res.status(200).json({ token: resetToken });
  } catch (error) {
    console.error("verifyCode error:", error);
    return res.status(500).json({ message: "No se pudo verificar el codigo" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = validatePassword(req.body?.password);

    if (!token) {
      return res.status(400).json({
        message: "Token y contrasena son obligatorios",
      });
    }

    await ensurePasswordResetTable();

    const tokenHash = hashResetToken(token);

    const [rows] = await pool.query(
      `
      SELECT id, idUser, expiresAt, usedAt
      FROM password_reset_tokens
      WHERE tokenHash = ?
      ORDER BY createdAt DESC
      LIMIT 1
      `,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "El enlace no es valido",
      });
    }

    const resetRecord = rows[0];

    if (resetRecord.usedAt) {
      return res.status(400).json({
        message: "El enlace ya fue utilizado",
      });
    }

    if (new Date(resetRecord.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        message: "El enlace ha expirado",
      });
    }

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      newPassword,
      resetRecord.idUser,
    ]);

    await pool.query(
      "UPDATE password_reset_tokens SET usedAt = NOW() WHERE id = ?",
      [resetRecord.id]
    );

    return res.status(200).json({
      message: "Contrasena actualizada correctamente",
    });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contrasena",
    });
  }
};