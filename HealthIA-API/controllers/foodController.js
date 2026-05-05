
import pool from "../db/connection.js";

const parseDietCompatibility = (rawValue) =>
  String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.toLowerCase() !== "all");

const getValidDietTypes = async () => {
  const [rows] = await pool.query(`
    SELECT dietCompatibility
    FROM HealthIAdb.food
    WHERE dietCompatibility IS NOT NULL
      AND TRIM(dietCompatibility) <> ''
  `);

  const uniqueDiets = new Set();
  for (const row of rows) {
    const diets = parseDietCompatibility(row.dietCompatibility);
    for (const diet of diets) {
      uniqueDiets.add(diet);
    }
  }

  return Array.from(uniqueDiets).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
};

export const getFood = async (req, res) => {
  try {
    const { dietType } = req.query;
    const validDietTypes = await getValidDietTypes();

    if (!dietType) {
      return res.status(400).json({
        message:
          "El parámetro dietType es obligatorio. Valores válidos: " +
          validDietTypes.join(", "),
      });
    }

    if (!validDietTypes.includes(dietType)) {
      return res.status(400).json({
        message:
          `dietType "${dietType}" no es válido. Valores válidos: ` +
          validDietTypes.join(", "),
      });
    }

    const [rows] = await pool.query(
      `
      SELECT name, category
      FROM HealthIAdb.food
      WHERE dietCompatibility = 'all'
         OR FIND_IN_SET(?, dietCompatibility) > 0
      ORDER BY category, name
      `,
      [dietType]
    );

    res.json(rows);
  } catch (error) {
    console.error("getFood error:", error);
    res.status(500).json({
      message: "No se pudo obtener la lista de alimentos",
    });
  }
};
