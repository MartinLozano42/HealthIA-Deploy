import pool from "../db/connection.js";

export const getActivityLevels = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT idActivityLevel, levelName, description
      FROM HealthIAdb.activitylevels
      ORDER BY idActivityLevel
    `);

    res.json(rows);
  } catch (error) {
    console.error("getActivityLevels error:", error);
    res.status(500).json({
      message: "No se pudo obtener los niveles de actividad",
    });
  }
};
