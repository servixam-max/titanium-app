import pool from "@/lib/pg-pool";
import { NextResponse } from "next/server";

// PUT /api/sessions/[id] - Update existing session
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    
    const {
      end_time,
      duration_seconds,
      total_sets,
      total_reps,
      total_volume,
      completed,
      exercises,
    } = body;
    
    // Update session
    await pool.query(
      `UPDATE workout_sessions 
       SET end_time = $1, duration_seconds = $2, total_sets = $3, 
           total_reps = $4, total_volume = $5, completed = $6
       WHERE id = $7`,
      [
        end_time ? new Date(end_time) : null,
        duration_seconds || 0,
        total_sets || 0,
        total_reps || 0,
        total_volume || 0,
        completed || false,
        sessionId,
      ]
    );
    
    // Delete existing exercise logs (and cascade set_logs)
    await pool.query(
      "DELETE FROM exercise_logs WHERE session_id = $1",
      [sessionId]
    );
    
    // Insert new exercise logs and set logs
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
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
