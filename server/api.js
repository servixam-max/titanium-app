const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL
const pool = new Pool({
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT) || 54322,
  database: process.env.DATABASE_NAME || "titanium",
  user: process.env.DATABASE_USER || "titanium",
  password: process.env.DATABASE_PASSWORD || "titanium123",
});

const base = "/titanium";

// Helper para obtener perfil default
async function getDefaultProfile() {
  const result = await pool.query(
    "SELECT id FROM profiles WHERE email = 'default@titanium.app' LIMIT 1"
  );
  if (result.rows.length > 0) return result.rows[0].id;
  const newProfile = await pool.query(
    `INSERT INTO profiles (email, username, created_at, updated_at)
     VALUES ('default@titanium.app', 'Default User', NOW(), NOW())
     RETURNING id`
  );
  return newProfile.rows[0].id;
}

/* =========================================================
   WEIGHT endpoints
   ========================================================= */
app.get("/api/weight", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    const result = await pool.query(
      `SELECT id, weight, date, created_at
       FROM weight_logs
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC`,
      [userId]
    );
    res.json({ weights: result.rows });
  } catch (e) {
    console.error("GET weight error:", e);
    res.status(500).json({ error: "Failed to fetch weights" });
  }
});

app.post("/api/weight", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    const { weight, date } = req.body;
    if (!weight || Number(weight) <= 0) {
      return res.status(400).json({ error: "Weight is required" });
    }
    const result = await pool.query(
      `INSERT INTO weight_logs (user_id, weight, date, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, weight, date, created_at`,
      [userId, Number(weight), date || new Date().toISOString().split("T")[0]]
    );
    res.json({ success: true, weight: result.rows[0] });
  } catch (e) {
    console.error("POST weight error:", e);
    res.status(500).json({ error: "Failed to create weight" });
  }
});

app.put("/api/weight/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { weight, date } = req.body;
    if (!weight || Number(weight) <= 0) {
      return res.status(400).json({ error: "Weight is required" });
    }
    const result = await pool.query(
      `UPDATE weight_logs SET weight = $1, date = $2
       WHERE id = $3
       RETURNING id, weight, date, created_at`,
      [Number(weight), date || new Date().toISOString().split("T")[0], id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Weight entry not found" });
    }
    res.json({ success: true, weight: result.rows[0] });
  } catch (e) {
    console.error("PUT weight error:", e);
    res.status(500).json({ error: "Failed to update weight" });
  }
});

app.delete("/api/weight/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM weight_logs WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Weight entry not found" });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE weight error:", e);
    res.status(500).json({ error: "Failed to delete weight" });
  }
});

/* =========================================================
   STATS endpoint
   ========================================================= */
app.get("/api/stats", async (req, res) => {
  try {
    const userId = await getDefaultProfile();

    // Session stats
    const sessionStats = await pool.query(
      `SELECT
        COUNT(*) as total_sessions,
        COALESCE(SUM(total_sets), 0) as total_sets,
        COALESCE(SUM(total_reps), 0) as total_reps,
        COALESCE(SUM(total_volume), 0) as total_volume,
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        COALESCE(AVG(duration_seconds), 0) as avg_duration,
        COALESCE(AVG(total_volume), 0) as avg_volume,
        MAX(start_time) as last_session
       FROM workout_sessions
       WHERE user_id = $1 AND completed = true`,
      [userId]
    );

    // This week (from Monday)
    const weekStats = await pool.query(
      `SELECT COUNT(*) as count FROM workout_sessions
       WHERE user_id = $1 AND completed = true
       AND start_time >= date_trunc('week', NOW())`,
      [userId]
    );

    // This month
    const monthStats = await pool.query(
      `SELECT COUNT(*) as count FROM workout_sessions
       WHERE user_id = $1 AND completed = true
       AND start_time >= date_trunc('month', NOW())`,
      [userId]
    );

    // Calculate streak (consecutive days with at least one session)
    const sessionDates = await pool.query(
      `SELECT DISTINCT DATE(start_time) as d
       FROM workout_sessions
       WHERE user_id = $1 AND completed = true
       ORDER BY d DESC`,
      [userId]
    );

    let streak = 0;
    if (sessionDates.rows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = today;
      for (const row of sessionDates.rows) {
        const d = new Date(row.d);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));
        if (diff === 0) {
          streak++;
          checkDate = new Date(checkDate);
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (diff === 1) {
          // Check if we already started counting (today might not have a session yet)
          if (streak === 0) {
            // Allow starting from yesterday
            streak++;
            checkDate = new Date(d);
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    // Volume per session (for chart)
    const volumePerSession = await pool.query(
      `SELECT id, start_time, COALESCE(total_volume, 0) as volume,
              COALESCE(total_sets, 0) as sets, routine_name, mode
       FROM workout_sessions
       WHERE user_id = $1 AND completed = true
       ORDER BY start_time ASC
       LIMIT 20`,
      [userId]
    );

    // Weight stats
    const weightStats = await pool.query(
      `SELECT
        COUNT(*) as entries,
        COALESCE(MIN(weight), 0) as min_weight,
        COALESCE(MAX(weight), 0) as max_weight,
        COALESCE(AVG(weight), 0) as avg_weight,
        (SELECT weight FROM weight_logs WHERE user_id = $1 ORDER BY date DESC, created_at DESC LIMIT 1) as current,
        (SELECT weight FROM weight_logs WHERE user_id = $1 ORDER BY date DESC, created_at DESC OFFSET 1 LIMIT 1) as previous
       FROM weight_logs
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      sessions: {
        total: parseInt(sessionStats.rows[0].total_sessions) || 0,
        totalSets: parseInt(sessionStats.rows[0].total_sets) || 0,
        totalReps: parseInt(sessionStats.rows[0].total_reps) || 0,
        totalVolume: parseFloat(sessionStats.rows[0].total_volume) || 0,
        totalDuration: parseInt(sessionStats.rows[0].total_duration) || 0,
        avgDuration: parseFloat(sessionStats.rows[0].avg_duration) || 0,
        avgVolume: parseFloat(sessionStats.rows[0].avg_volume) || 0,
        lastSession: sessionStats.rows[0].last_session,
        thisWeek: parseInt(weekStats.rows[0].count) || 0,
        thisMonth: parseInt(monthStats.rows[0].count) || 0,
        streak,
      },
      volumeChart: volumePerSession.rows,
      weight: {
        entries: parseInt(weightStats.rows[0].entries) || 0,
        min: parseFloat(weightStats.rows[0].min_weight) || 0,
        max: parseFloat(weightStats.rows[0].max_weight) || 0,
        average: parseFloat(weightStats.rows[0].avg_weight) || 0,
        current: parseFloat(weightStats.rows[0].current) || 0,
        previous: parseFloat(weightStats.rows[0].previous) || 0,
      },
    });
  } catch (e) {
    console.error("GET stats error:", e);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/* =========================================================
   SESSIONS endpoints
   ========================================================= */
app.get("/api/sessions", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    const result = await pool.query(
      `SELECT
        ws.*,
        COALESCE(
          json_agg(
            json_build_object(
              'exercise_id', el.exercise_id,
              'exercise_name', el.exercise_name,
              'exercise_order', el.exercise_order,
              'sets_completed', el.sets_completed,
              'target_sets', el.target_sets,
              'target_reps', el.target_reps,
              'rest_seconds', el.rest_seconds,
              'sets', COALESCE(
                (SELECT json_agg(
                  json_build_object(
                    'set_number', sl.set_number,
                    'weight', sl.weight,
                    'reps', sl.reps,
                    'duration_seconds', sl.duration_seconds,
                    'completed', sl.completed,
                    'rpe', sl.rpe
                  ) ORDER BY sl.set_number
                )
                FROM set_logs sl
                WHERE sl.exercise_log_id = el.id
                ), '[]'
              )
            ) ORDER BY el.exercise_order
          ) FILTER (WHERE el.id IS NOT NULL),
          '[]'
        ) as exercises
      FROM workout_sessions ws
      LEFT JOIN exercise_logs el ON el.session_id = ws.id
      WHERE ws.user_id = $1
      GROUP BY ws.id
      ORDER BY ws.start_time DESC`,
      [userId]
    );
    res.json({ sessions: result.rows });
  } catch (e) {
    console.error("GET sessions error:", e);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    const {
      routine_id, routine_name, mode, start_time, end_time,
      duration_seconds, total_sets, total_reps, total_volume,
      completed, exercises,
    } = req.body;

    const sessionResult = await pool.query(
      `INSERT INTO workout_sessions
       (user_id, routine_id, routine_name, mode, start_time, end_time,
        duration_seconds, total_sets, total_reps, total_volume, completed, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        userId, routine_id, routine_name, mode,
        start_time ? new Date(start_time) : new Date(),
        end_time ? new Date(end_time) : null,
        duration_seconds || 0, total_sets || 0, total_reps || 0,
        total_volume || 0, completed || false, null,
      ]
    );

    const sessionId = sessionResult.rows[0].id;

    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (ex.sets && ex.sets.length > 0) {
          const exerciseResult = await pool.query(
            `INSERT INTO exercise_logs
             (session_id, exercise_id, exercise_name, exercise_order,
              sets_completed, target_sets, target_reps, rest_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
              sessionId, ex.exercise_id, ex.exercise_name || "Ejercicio " + (i + 1),
              i + 1, ex.sets.length,
              ex.target_sets || ex.sets.length,
              ex.target_reps || "8-12",
              ex.rest_seconds || 60,
            ]
          );
          const exerciseLogId = exerciseResult.rows[0].id;
          for (const set of ex.sets) {
            await pool.query(
              `INSERT INTO set_logs
               (exercise_log_id, set_number, weight, reps,
                duration_seconds, completed, rpe)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                exerciseLogId, set.set_number || set.setNumber, set.weight || 0,
                set.reps || 0, set.duration_seconds || set.duration || 0,
                set.completed !== false, set.rpe || null,
              ]
            );
          }
        }
      }
    }

    res.json({ success: true, session_id: sessionId });
  } catch (e) {
    console.error("POST sessions error:", e);
    res.status(500).json({ error: "Failed to create session" });
  }
});

app.put("/api/sessions/:id", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    const sessionId = req.params.id;
    const {
      routine_id, routine_name, mode, end_time,
      duration_seconds, total_sets, total_reps, total_volume,
      completed, exercises,
    } = req.body;

    await pool.query(
      `UPDATE workout_sessions SET
       routine_id = COALESCE($1, routine_id),
       routine_name = COALESCE($2, routine_name),
       mode = COALESCE($3, mode),
       end_time = COALESCE($4, end_time),
       duration_seconds = COALESCE($5, duration_seconds),
       total_sets = COALESCE($6, total_sets),
       total_reps = COALESCE($7, total_reps),
       total_volume = COALESCE($8, total_volume),
       completed = COALESCE($9, completed)
       WHERE id = $10 AND user_id = $11`,
      [routine_id, routine_name, mode, end_time ? new Date(end_time) : null,
       duration_seconds, total_sets, total_reps, total_volume, completed,
       sessionId, userId]
    );

    if (exercises && Array.isArray(exercises)) {
      await pool.query("DELETE FROM exercise_logs WHERE session_id = $1", [sessionId]);
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        if (ex.sets && ex.sets.length > 0) {
          const exerciseResult = await pool.query(
            `INSERT INTO exercise_logs
             (session_id, exercise_id, exercise_name, exercise_order,
              sets_completed, target_sets, target_reps, rest_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
              sessionId, ex.exercise_id, ex.exercise_name || "Ejercicio " + (i + 1),
              i + 1, ex.sets.length,
              ex.target_sets || ex.sets.length,
              ex.target_reps || "8-12",
              ex.rest_seconds || 60,
            ]
          );
          const exerciseLogId = exerciseResult.rows[0].id;
          for (const set of ex.sets) {
            await pool.query(
              `INSERT INTO set_logs
               (exercise_log_id, set_number, weight, reps,
                duration_seconds, completed, rpe)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                exerciseLogId, set.set_number || set.setNumber, set.weight || 0,
                set.reps || 0, set.duration_seconds || set.duration || 0,
                set.completed !== false, set.rpe || null,
              ]
            );
          }
        }
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error("PUT sessions error:", e);
    res.status(500).json({ error: "Failed to update session" });
  }
});

app.delete("/api/sessions", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    await pool.query(
      "DELETE FROM workout_sessions WHERE user_id = $1",
      [userId]
    );
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE sessions error:", e);
    res.status(500).json({ error: "Failed to delete sessions" });
  }
});

// Delete individual session
app.delete("/api/sessions/:id", async (req, res) => {
  try {
    const userId = await getDefaultProfile();
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE session error:", e);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

/* =========================================================
   STATIC WEB (Next.js export)
   ========================================================= */
const distPath = path.join(__dirname, "..", "dist");

// Static assets (with /titanium prefix)
app.use(base + "/_next", express.static(path.join(distPath, "_next"), { maxAge: "1y" }));
app.use(base + "/icons", express.static(path.join(distPath, "icons"), { maxAge: "1y" }));
app.use(base + "/images", express.static(path.join(distPath, "images"), { maxAge: "1y" }));
app.use(base + "/screenshots", express.static(path.join(distPath, "screenshots"), { maxAge: "1y" }));
// Static assets (without /titanium prefix - for Tailscale)
app.use("/_next", express.static(path.join(distPath, "_next"), { maxAge: "1y" }));
app.use("/icons", express.static(path.join(distPath, "icons"), { maxAge: "1y" }));
app.use("/images", express.static(path.join(distPath, "images"), { maxAge: "1y" }));
app.use("/screenshots", express.static(path.join(distPath, "screenshots"), { maxAge: "1y" }));

// Individual files in root
const rootAssets = ["sw.js", "manifest.json"];
for (const asset of rootAssets) {
  const fullPath = path.join(distPath, asset);
  if (fs.existsSync(fullPath)) {
    app.get(base + "/" + asset, (req, res) => res.sendFile(fullPath));
  }
}

// Catch-all SPA route (must be last!) - serve per-route HTML files
// Also serve static assets without /titanium prefix (Tailscale strips it)
app.use("/_next", express.static(path.join(distPath, "_next"), { maxAge: "1y" }));
app.use("/icons", express.static(path.join(distPath, "icons"), { maxAge: "1y" }));
app.use("/images", express.static(path.join(distPath, "images"), { maxAge: "1y" }));

const indexHtml = path.join(distPath, "index.html");
// With /titanium prefix (direct access)
if (fs.existsSync(indexHtml)) {
  app.use("/titanium", (req, res) => {
    const routePath = req.path === "/" || req.path === "" ? "index" : req.path.replace(/^\//, "").replace(/\/$/, "");
    const routeHtml = path.join(distPath, routePath + ".html");
    if (routePath !== "index" && fs.existsSync(routeHtml)) {
      return res.sendFile(routeHtml);
    }
    res.sendFile(indexHtml);
  });
  // Without /titanium prefix (Tailscale Serve strips it)
  app.use("/", (req, res) => {
    const routePath = req.path === "/" || req.path === "" ? "index" : req.path.replace(/^\//, "").replace(/\/$/, "");
    const routeHtml = path.join(distPath, routePath + ".html");
    if (routePath !== "index" && fs.existsSync(routeHtml)) {
      return res.sendFile(routeHtml);
    }
    // Don't serve index.html for API routes that don't match
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(indexHtml);
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Titanium API server v2.0 running on 0.0.0.0:" + PORT);
});