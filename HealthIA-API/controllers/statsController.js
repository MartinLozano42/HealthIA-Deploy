import pool from "../db/connection.js";
const pad = (value) => String(value).padStart(2, "0");

const toMysqlDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const startOfCurrentWeek = (date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
};

const endOfCurrentWeek = (date) => {
  const start = startOfCurrentWeek(date);
  const end = addDays(start, 6);

  end.setHours(23, 59, 59, 999);

  return end;
};

const buildDateRange = (range) => {
  const today = new Date();

  if (range === "month") {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const start = addDays(end, -29);
    start.setHours(0, 0, 0, 0);

    return {
      range: "month",
      startDate: toMysqlDate(start),
      endDate: toMysqlDate(end),
      todayDate: toMysqlDate(today),
    };
  }

  const start = startOfCurrentWeek(today);
  const end = endOfCurrentWeek(today);

  return {
    range: "week",
    startDate: toMysqlDate(start),
    endDate: toMysqlDate(end),
    todayDate: toMysqlDate(today),
  };
};

const datesBetween = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const dates = [];

  let cursor = start;

  while (cursor <= end) {
    dates.push(toMysqlDate(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value) => Math.round(normalizeNumber(value, 0));

const buildMapByDate = (rows, dateKey = "logDate") => {
  const map = new Map();

  rows.forEach((row) => {
    map.set(String(row[dateKey]), row);
  });

  return map;
};

const getWeekDayLabel = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  const labels = ["D", "L", "M", "X", "J", "V", "S"];

  return labels[date.getDay()];
};

const safePercent = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const calcTDEE = (weight, heightMeters, ageYears, sex, activityFactor) => {
  const h = heightMeters * 100; // a cm
  const isFemale = ["femenino", "female", "f", "mujer"].includes(
    String(sex || "").trim().toLowerCase()
  );

  const bmr = isFemale
    ? 447.593 + 9.247 * weight + 3.098 * h - 4.33 * ageYears
    : 88.362 + 13.397 * weight + 4.799 * h - 5.677 * ageYears;

  return Math.max(1200, Math.round(bmr * (activityFactor || 1.2)));
};

const getLatestGoal = async (idUser) => {
  try {
    const [[stats]] = await pool.query(
      `SELECT weight, height, idActivityLevel
       FROM UserStats
       WHERE idUser = ?
       ORDER BY id DESC
       LIMIT 1`,
      [idUser]
    );

    const weight = normalizeNumber(stats?.weight, 0);
    const height = normalizeNumber(stats?.height, 0);

    if (weight <= 0 || height <= 0) {
      return { dailyCalories: 2000, protein: 130, carbs: 250, fat: 65 };
    }

    let activityFactor = 1.2;
    if (stats?.idActivityLevel) {
      const [[al]] = await pool.query(
        `SELECT activityFactor FROM activitylevels WHERE idActivityLevel = ? LIMIT 1`,
        [stats.idActivityLevel]
      );
      activityFactor = normalizeNumber(al?.activityFactor, 1.2);
    }

    let age = 30;
    let sex = "masculino";
    try {
      const [[pref]] = await pool.query(
        `SELECT birthDate, sex FROM user_onboarding_preferences WHERE idUser = ? LIMIT 1`,
        [idUser]
      );
      if (pref?.birthDate) {
        age = Math.floor(
          (Date.now() - new Date(pref.birthDate).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        );
      }
      if (pref?.sex) sex = pref.sex;
    } catch {
      // tabla no existe aún, usa defaults
    }

    const tdee    = calcTDEE(weight, height, age, sex, activityFactor);
    const protein = Math.max(50, Math.round(weight * 1.8));
    const fat     = Math.max(30, Math.round((tdee * 0.25) / 9));
    const carbs   = Math.max(50, Math.round((tdee - protein * 4 - fat * 9) / 4));

    const today = toMysqlDate(new Date());
    pool.query(
      `INSERT INTO dailylog (idUser, logDate, dailyKcalObjetive, proteinObjetive, carbTarget, fatTarget)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         dailyKcalObjetive = VALUES(dailyKcalObjetive),
         proteinObjetive   = VALUES(proteinObjetive),
         carbTarget        = VALUES(carbTarget),
         fatTarget         = VALUES(fatTarget)`,
      [idUser, today, tdee, protein, carbs, fat]
    ).catch(() => {});

    return { dailyCalories: tdee, protein, carbs, fat };
  } catch {
    return { dailyCalories: 2000, protein: 130, carbs: 250, fat: 65 };
  }
};

const calculateStreak = ({ dates, mealMap, logMap }) => {
  const activeDates = new Set();

  dates.forEach((date) => {
    const meal = mealMap.get(date) || {};
    const log = logMap.get(date) || {};

    const hasFood =
      normalizeNumber(meal.calories, 0) > 0 ||
      normalizeNumber(log.foodKcal, 0) > 0;

    const hasExercise = normalizeNumber(log.burnedKcal, 0) > 0;

    if (hasFood || hasExercise) {
      activeDates.add(date);
    }
  });

  const sortedActive = Array.from(activeDates).sort();

  if (sortedActive.length === 0) return 0;

  let cursor = new Date(`${sortedActive[sortedActive.length - 1]}T00:00:00`);
  let streak = 0;

  while (activeDates.has(toMysqlDate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

const buildCalorieChart = ({ range, dates, mealMap, logMap, defaultGoal }) => {
  const dailyRows = dates.map((date) => {
    const meal = mealMap.get(date) || {};
    const log = logMap.get(date) || {};

    const photoCalories = normalizeNumber(meal.calories, 0);
    const logCalories = normalizeNumber(log.foodKcal, 0);
    const consumed = photoCalories > 0 ? photoCalories : logCalories;

    const goal = normalizeNumber(log.dailyKcalObjetive, defaultGoal);
    const burned = normalizeNumber(log.burnedKcal, 0);

    return {
      date,
      label: getWeekDayLabel(date),
      consumed: round(consumed),
      goal: round(goal),
      burned: round(burned),
      net: round(consumed - burned),
      protein: round(meal.proteins || log.proteins || 0),
      carbs: round(meal.carbs || log.carbohydrates || 0),
      fat: round(meal.fats || log.fats || 0),
    };
  });

  if (range === "week") {
    return dailyRows;
  }

  const weeks = [];

  for (let index = 0; index < dailyRows.length; index += 7) {
    const slice = dailyRows.slice(index, index + 7);

    const totalConsumed = slice.reduce((sum, item) => sum + item.consumed, 0);
    const totalGoal = slice.reduce((sum, item) => sum + item.goal, 0);
    const totalBurned = slice.reduce((sum, item) => sum + item.burned, 0);
    const totalProtein = slice.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = slice.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = slice.reduce((sum, item) => sum + item.fat, 0);

    weeks.push({
      date: `${slice[0]?.date || ""} / ${slice[slice.length - 1]?.date || ""}`,
      label: `S${weeks.length + 1}`,
      consumed: round(totalConsumed / Math.max(slice.length, 1)),
      goal: round(totalGoal / Math.max(slice.length, 1)),
      burned: round(totalBurned / Math.max(slice.length, 1)),
      net: round((totalConsumed - totalBurned) / Math.max(slice.length, 1)),
      protein: round(totalProtein),
      carbs: round(totalCarbs),
      fat: round(totalFat),
    });
  }

  return weeks;
};

export const saveStats = async (req, res) => {
  try {
    const { idUser, weight, height, targetWeight, idActivityLevel } = req.body;

    const [result] = await pool.query(
      `INSERT INTO UserStats
      (idUser, weight, height, targetWeight, idActivityLevel, recordDate)
      VALUES (?, ?, ?, ?, ?, NOW())`,
      [idUser, weight, height, targetWeight, idActivityLevel || null]
    );

    res.json({
      message: "Stats guardados",
      id: result.insertId,
    });
  } catch (error) {
    console.error("saveStats error:", error);
    res.status(500).json({
      message: "Error al guardar stats",
      error: String(error?.message || error),
    });
  }
};

export const getUserProgressStats = async (req, res) => {
  try {
    const idUser = Number(req.params.idUser || 0);
    const requestedRange = String(req.query.range || "week").toLowerCase();
    const safeRange = requestedRange === "month" ? "month" : "week";

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({
        message: "idUser inválido",
      });
    }

    const [[user]] = await pool.query(
      `
      SELECT id, name, email, status
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [idUser]
    );

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    const { range, startDate, endDate, todayDate } = buildDateRange(safeRange);
    const dates = datesBetween(startDate, endDate);
    const goal = await getLatestGoal(idUser);

    const [mealRows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(dateTime, '%Y-%m-%d') AS logDate,
        SUM(COALESCE(finalCalories, estimatedCalories, 0)) AS calories,
        SUM(COALESCE(finalProteins, estimatedProteins, 0)) AS proteins,
        SUM(COALESCE(finalCarbs, estimatedCarbs, 0)) AS carbs,
        SUM(COALESCE(finalFats, estimatedFats, 0)) AS fats,
        COUNT(*) AS mealsCount
      FROM photomeallog
      WHERE idUser = ?
        AND analysisStatus = 'processed'
        AND DATE(dateTime) BETWEEN ? AND ?
      GROUP BY DATE_FORMAT(dateTime, '%Y-%m-%d')
      ORDER BY logDate ASC
      `,
      [idUser, startDate, endDate]
    );

    const [dailyRows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(logDate, '%Y-%m-%d') AS logDate,
        dailyKcalObjetive,
        foodKcal,
        burnedKcal,
        proteins,
        carbohydrates,
        fats,
        proteinObjetive,
        carbTarget,
        fatTarget
      FROM dailylog
      WHERE idUser = ?
        AND logDate BETWEEN ? AND ?
      ORDER BY logDate ASC
      `,
      [idUser, startDate, endDate]
    );

    const [weightRowsRaw] = await pool.query(
      `
      SELECT
        DATE_FORMAT(ws.recordDate, '%Y-%m-%d') AS recordDate,
        ws.weight,
        ws.height,
        ws.targetWeight
      FROM WeaklyStats ws
      WHERE ws.idUser = ?
        AND DATE(ws.recordDate) <= ?
      ORDER BY ws.recordDate ASC
      LIMIT 12
      `,
      [idUser, endDate]
    );

    const weightEvolution = weightRowsRaw
      .map((row, index) => ({
        label: range === "month" ? `R${index + 1}` : `P${index + 1}`,
        date: row.recordDate,
        weight: normalizeNumber(row.weight, 0),
        height: normalizeNumber(row.height, 0),
        targetWeight: normalizeNumber(row.targetWeight, 0),
      }));

    const mealMap = buildMapByDate(mealRows);
    const logMap = buildMapByDate(dailyRows);

    const calorieChart = buildCalorieChart({
      range,
      dates,
      mealMap,
      logMap,
      defaultGoal: goal.dailyCalories,
    });

    const fullDailyRows = dates.map((date) => {
      const meal = mealMap.get(date) || {};
      const log = logMap.get(date) || {};

      const photoCalories = normalizeNumber(meal.calories, 0);
      const logCalories = normalizeNumber(log.foodKcal, 0);
      const consumed = photoCalories > 0 ? photoCalories : logCalories;

      return {
        date,
        consumed,
        goal: normalizeNumber(log.dailyKcalObjetive, goal.dailyCalories),
        burned: normalizeNumber(log.burnedKcal, 0),
        protein: normalizeNumber(meal.proteins || log.proteins, 0),
        carbs: normalizeNumber(meal.carbs || log.carbohydrates, 0),
        fat: normalizeNumber(meal.fats || log.fats, 0),
      };
    });

    const elapsedRows = fullDailyRows.filter((item) => item.date <= todayDate);
    const rowsForSummary = elapsedRows.length > 0 ? elapsedRows : fullDailyRows;

    const totalConsumed = rowsForSummary.reduce((sum, item) => sum + item.consumed, 0);
    const totalBurned = rowsForSummary.reduce((sum, item) => sum + item.burned, 0);
    const daysWithFood = rowsForSummary.filter((item) => item.consumed > 0).length;

    const avgCalories = daysWithFood > 0 ? round(totalConsumed / daysWithFood) : 0;

    const adherence =
      rowsForSummary.length > 0
        ? round(
            (rowsForSummary.reduce((sum, item) => {
              if (!item.goal || item.consumed <= 0) return sum;
              return sum + Math.min(item.consumed / item.goal, 1);
            }, 0) /
              rowsForSummary.length) *
              100
          )
        : 0;

    const totalProtein = fullDailyRows.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = fullDailyRows.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = fullDailyRows.reduce((sum, item) => sum + item.fat, 0);

    const proteinKcal = totalProtein * 4;
    const carbsKcal = totalCarbs * 4;
    const fatKcal = totalFat * 9;
    const macroKcalTotal = proteinKcal + carbsKcal + fatKcal;

    const firstWeight = weightEvolution[0]?.weight || 0;
    const latestWeight = weightEvolution[weightEvolution.length - 1]?.weight || 0;
    const targetWeight = weightEvolution[weightEvolution.length - 1]?.targetWeight || 0;

    const weightChange =
      firstWeight && latestWeight && weightEvolution.length > 1
        ? latestWeight - firstWeight
        : 0;

    const streakDays = calculateStreak({
      dates,
      mealMap,
      logMap,
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        status: user.status,
      },
      period: range,
      range: {
        startDate,
        endDate,
        todayDate,
      },
      goal: {
        ...goal,
        targetWeight,
      },
      summary: {
        avgCalories,
        adherence,
        weightChange: Number(weightChange.toFixed(1)),
        streakDays,
        totalConsumed: round(totalConsumed),
        totalBurned: round(totalBurned),
        daysWithFood,
      },
      calorieChart,
      weightEvolution,
      macros: {
        protein: round(totalProtein),
        carbs: round(totalCarbs),
        fat: round(totalFat),
        percentages: {
          protein: safePercent(proteinKcal, macroKcalTotal),
          carbs: safePercent(carbsKcal, macroKcalTotal),
          fat: safePercent(fatKcal, macroKcalTotal),
        },
      },
    });
  } catch (error) {
    console.error("getUserProgressStats error:", error);

    return res.status(500).json({
      message: "No se pudieron obtener las estadísticas del usuario",
      error: String(error?.message || error),
    });
  }
};

export const saveUserGoal = async (req, res) => {
  try {
    const idUser = Number(req.params.idUser || 0);
    const dailyCalories = Math.round(Number(req.body.dailyCalories || 0));
    const protein      = Math.round(Number(req.body.protein      || 0));
    const carbs        = Math.round(Number(req.body.carbs        || 0));
    const fat          = Math.round(Number(req.body.fat          || 0));

    if (!Number.isInteger(idUser) || idUser <= 0) {
      return res.status(400).json({ message: "idUser inválido" });
    }
    if (dailyCalories < 500 || dailyCalories > 10000) {
      return res.status(400).json({ message: "dailyCalories debe estar entre 500 y 10000" });
    }

    const today = toMysqlDate(new Date());

    await pool.query(
      `INSERT INTO dailylog (idUser, logDate, dailyKcalObjetive, proteinObjetive, carbTarget, fatTarget)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         dailyKcalObjetive = VALUES(dailyKcalObjetive),
         proteinObjetive   = VALUES(proteinObjetive),
         carbTarget        = VALUES(carbTarget),
         fatTarget         = VALUES(fatTarget)`,
      [idUser, today, dailyCalories, protein || null, carbs || null, fat || null]
    );

    return res.json({ message: "Meta guardada", dailyCalories, protein, carbs, fat });
  } catch (error) {
    console.error("saveUserGoal error:", error);
    return res.status(500).json({ message: "No se pudo guardar la meta", error: String(error?.message || error) });
  }
};

export const getAdminSummary = async (req, res) => {
  try {
    const [[usersSummary]] = await pool.query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeUsers,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactiveUsers
      FROM users
    `);

    const [[mealsSummary]] = await pool.query(`
      SELECT COUNT(*) AS registeredMeals
      FROM photomeallog
    `);

    const [mealTrendRows] = await pool.query(`
      SELECT
        DATE_FORMAT(mealDate, '%Y-%m') AS period,
        COUNT(*) AS total
      FROM Meal
      WHERE mealDate IS NOT NULL
      GROUP BY DATE_FORMAT(mealDate, '%Y-%m')
      ORDER BY period ASC
      LIMIT 6
    `);

    res.json({
      totalUsers: Number(usersSummary?.totalUsers || 0),
      activeUsers: Number(usersSummary?.activeUsers || 0),
      inactiveUsers: Number(usersSummary?.inactiveUsers || 0),
      registeredMeals: Number(mealsSummary?.registeredMeals || 0),
      trend: mealTrendRows.map((row) => ({
        label: row.period,
        meals: Number(row.total || 0),
      })),
    });
  } catch (error) {
    console.error("getAdminSummary error:", error);
    res.status(500).json({
      message: "No se pudieron obtener las estadísticas del administrador",
      error: String(error?.message || error),
    });
  }
};
