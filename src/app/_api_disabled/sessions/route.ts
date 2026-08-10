import pool from "@/lib/pg-pool";
import { NextResponse } from "next/server";

// Get or create default profile
async function getDefaultProfile() {
  const result = await pool.query(
    "SELECT id FROM profiles WHERE email = 'default@titanium.app' LIMIT 1"
  );
  
  if (result.rows.length > 0) {
    return result.rows[0].id;
  }
  
  // Create default profile
  const newProfile = await pool.query(
    `INSERT INTO profiles (email, username, created_at, updated_at)
     VALUES ('default@titanium.app', 'Default User', NOW(), NOW())
     RETURNING id`
  );
  
  return newProfile.rows[0].id;
}

// GET /api/sessions
export async function GET() {
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
    
    return NextResponse.json({ sessions: result.rows });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/sessions
export async function POST(request: Request) {
  try {
    const userId = await getDefaultProfile();
    const body = await request.json();
    
    const {
      routine_id,
      routine_name,
      mode,
      start_time,
      end_time,
      duration_seconds,
      total_sets,
      total_reps,
      total_volume,
      completed,
      exercises,
    } = body;
    
    // Create session
    const sessionResult = await pool.query(
      `INSERT INTO workout_sessions 
       (user_id, routine_id, routine_name, mode, start_time, end_time, 
        duration_seconds, total_sets, total_reps, total_volume, completed, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        userId,
        routine_id,
        routine_name,
        mode,
        start_time ? new Date(start_time) : new Date(),
        end_time ? new Date(end_time) : null,
        duration_seconds || 0,
        total_sets || 0,
        total_reps || 0,
        total_volume || 0,
        completed || false,
        null,
      ]
    );
    
    const sessionId = sessionResult.rows[0].id;
    
    // Create exercise logs and set logs
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
              sessionId,
              ex.exercise_id,
              ex.exercise_name || `Ejercicio ${i + 1}`,
              i + 1,
              ex.sets.length,
              ex.target_sets || ex.sets.length,
              ex.target_reps || "8-12",
              ex.rest_seconds || 60,
            ]
          );
          
          const exerciseLogId = exerciseResult.rows[0].id;
          
          // Insert sets
          for (const set of ex.sets) {
            await pool.query(
              `INSERT INTO set_logs 
               (exercise_log_id, set_number, weight, reps, 
                duration_seconds, completed, rpe)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                exerciseLogId,
                set.set_number || set.setNumber,
                set.weight || 0,
                set.reps || 0,
                set.duration_seconds || set.duration || 0,
                set.completed !== false,
                set.rpe || null,
              ]
            );
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      session_id: sessionId 
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions
export async function DELETE() {
  try {
    const userId = await getDefaultProfile();
    
    await pool.query(
      "DELETE FROM workout_sessions WHERE user_id = $1",
      [userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sessions:", error);
    return NextResponse.json(
      { error: "Failed to delete sessions" },
      { status: 500 }
    );
  }
}
