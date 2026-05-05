import pool from "../db/connection.js";

const parseDietCompatibility = (rawValue) =>
  String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.toLowerCase() !== "all");

export const getDiets = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT dietCompatibility
      FROM HealthIAdb.food
      WHERE dietCompatibility IS NOT NULL
        AND TRIM(dietCompatibility) <> ''
      ORDER BY idFood
    `);

    const uniqueDiets = new Set();

    for (const row of rows) {
      const diets = parseDietCompatibility(row.dietCompatibility);
      for (const diet of diets) {
        uniqueDiets.add(diet);
      }
    }

    const diets = Array.from(uniqueDiets).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );

    return res.json(diets);
  } catch (error) {
    console.error("getDiets error:", error);
    return res.status(500).json({
      message: "No se pudo obtener el listado de tipos de dieta",
    });
  }
};
