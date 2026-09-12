import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { withAuth } from "@/lib/server/withAuth";
import { z } from "zod";

const setLogSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  setNumber: z.number(),
  weight: z.number().optional(),
  reps: z.number().optional(),
  durationSeconds: z.number().optional(),
  rpe: z.number().optional(),
  completed: z.boolean().default(true),
  side: z.string().optional(),
  timestamp: z.string().optional(),
  version: z.number().default(1),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
});

const exerciseLogSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  order: z.number(),
  targetSets: z.number().optional(),
  targetReps: z.string().optional(),
  restSeconds: z.number().optional(),
  groupId: z.string().optional(),
  sets: z.array(setLogSchema),
  version: z.number().default(1),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
});

const sessionSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  routineId: z.string().or(z.number()).optional(),
  routineName: z.string().optional(),
  mode: z.enum(["guided", "individual"]),
  startTime: z.string(),
  endTime: z.string().optional(),
  durationSeconds: z.number().optional(),
  totalSets: z.number().optional(),
  totalReps: z.number().optional(),
  totalVolume: z.number().optional(),
  completed: z.boolean().default(false),
  notes: z.string().optional(),
  exercises: z.array(exerciseLogSchema),
  version: z.number().default(1),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
  deleted: z.boolean().default(false),
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de sesión inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const s = parsed.data;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO workout_sessions (id, user_id, client_id, routine_id, routine_name, mode, start_time, end_time, duration_seconds, total_sets, total_reps, total_volume, completed, notes, version, created_at, modified_at, deleted)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (id) DO UPDATE SET
           routine_id = EXCLUDED.routine_id,
           routine_name = EXCLUDED.routine_name,
           mode = EXCLUDED.mode,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           duration_seconds = EXCLUDED.duration_seconds,
           total_sets = EXCLUDED.total_sets,
           total_reps = EXCLUDED.total_reps,
           total_volume = EXCLUDED.total_volume,
           completed = EXCLUDED.completed,
           notes = EXCLUDED.notes,
           version = EXCLUDED.version,
           modified_at = EXCLUDED.modified_at,
           deleted = EXCLUDED.deleted`,
        [
          s.id,
          userId,
          s.clientId,
          s.routineId?.toString() || null,
          s.routineName || null,
          s.mode,
          s.startTime,
          s.endTime || null,
          s.durationSeconds || null,
          s.totalSets || 0,
          s.totalReps || 0,
          s.totalVolume || 0,
          s.completed,
          s.notes || null,
          s.version,
          s.createdAt || new Date().toISOString(),
          s.modifiedAt || new Date().toISOString(),
          s.deleted,
        ],
      );

      for (const ex of s.exercises) {
        await client.query(
          `INSERT INTO exercise_logs (id, session_id, client_id, exercise_id, exercise_name, exercise_order, target_sets, target_reps, rest_seconds, group_id, version, created_at, modified_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET
             exercise_id = EXCLUDED.exercise_id,
             exercise_name = EXCLUDED.exercise_name,
             exercise_order = EXCLUDED.exercise_order,
             target_sets = EXCLUDED.target_sets,
             target_reps = EXCLUDED.target_reps,
             rest_seconds = EXCLUDED.rest_seconds,
             group_id = EXCLUDED.group_id,
             version = EXCLUDED.version,
             modified_at = EXCLUDED.modified_at`,
          [
            ex.id,
            s.id,
            ex.clientId,
            ex.exerciseId,
            ex.exerciseName,
            ex.order,
            ex.targetSets || null,
            ex.targetReps || null,
            ex.restSeconds || null,
            ex.groupId || null,
            ex.version,
            ex.createdAt || new Date().toISOString(),
            ex.modifiedAt || new Date().toISOString(),
          ],
        );

        for (const set of ex.sets) {
          await client.query(
            `INSERT INTO set_logs (id, exercise_log_id, client_id, set_number, weight, reps, duration_seconds, rpe, completed, side, timestamp, version, created_at, modified_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             ON CONFLICT (id) DO UPDATE SET
               set_number = EXCLUDED.set_number,
               weight = EXCLUDED.weight,
               reps = EXCLUDED.reps,
               duration_seconds = EXCLUDED.duration_seconds,
               rpe = EXCLUDED.rpe,
               completed = EXCLUDED.completed,
               side = EXCLUDED.side,
               timestamp = EXCLUDED.timestamp,
               version = EXCLUDED.version,
               modified_at = EXCLUDED.modified_at`,
            [
              set.id,
              ex.id,
              set.clientId,
              set.setNumber,
              set.weight || null,
              set.reps || null,
              set.durationSeconds || null,
              set.rpe || null,
              set.completed,
              set.side || null,
              set.timestamp || null,
              set.version,
              set.createdAt || new Date().toISOString(),
              set.modifiedAt || new Date().toISOString(),
            ],
          );
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true, id: s.id });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Sessions POST error:", err);
    return NextResponse.json({ error: "Error al guardar la sesión" }, { status: 500 });
  }
});

export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  try {
    const sessionsResult = await pool.query(
      `SELECT * FROM workout_sessions WHERE user_id = $1 AND deleted = false ORDER BY start_time DESC`,
      [userId],
    );

    const sessions = [];
    for (const sessionRow of sessionsResult.rows) {
      const exercisesResult = await pool.query(
        `SELECT * FROM exercise_logs WHERE session_id = $1 ORDER BY exercise_order`,
        [sessionRow.id],
      );

      const exercises = [];
      for (const exRow of exercisesResult.rows) {
        const setsResult = await pool.query(
          `SELECT * FROM set_logs WHERE exercise_log_id = $1 ORDER BY set_number`,
          [exRow.id],
        );
        exercises.push({
          id: exRow.id,
          clientId: exRow.client_id,
          exerciseId: exRow.exercise_id,
          exerciseName: exRow.exercise_name,
          order: exRow.exercise_order,
          targetSets: exRow.target_sets,
          targetReps: exRow.target_reps,
          restSeconds: exRow.rest_seconds,
          groupId: exRow.group_id,
          version: exRow.version,
          createdAt: exRow.created_at?.toISOString(),
          modifiedAt: exRow.modified_at?.toISOString(),
          sets: setsResult.rows.map((setRow) => ({
            id: setRow.id,
            clientId: setRow.client_id,
            setNumber: setRow.set_number,
            weight: setRow.weight ? Number(setRow.weight) : undefined,
            reps: setRow.reps,
            durationSeconds: setRow.duration_seconds,
            rpe: setRow.rpe,
            completed: setRow.completed,
            side: setRow.side,
            timestamp: setRow.timestamp?.toISOString(),
            version: setRow.version,
            createdAt: setRow.created_at?.toISOString(),
            modifiedAt: setRow.modified_at?.toISOString(),
          })),
        });
      }

      sessions.push({
        id: sessionRow.id,
        clientId: sessionRow.client_id,
        ownerUserId: sessionRow.user_id,
        routineId: sessionRow.routine_id,
        routineName: sessionRow.routine_name,
        mode: sessionRow.mode,
        startTime: sessionRow.start_time.toISOString(),
        endTime: sessionRow.end_time?.toISOString(),
        durationSeconds: sessionRow.duration_seconds,
        totalSets: sessionRow.total_sets,
        totalReps: sessionRow.total_reps,
        totalVolume: sessionRow.total_volume ? Number(sessionRow.total_volume) : undefined,
        completed: sessionRow.completed,
        notes: sessionRow.notes,
        version: sessionRow.version,
        createdAt: sessionRow.created_at?.toISOString(),
        modifiedAt: sessionRow.modified_at?.toISOString(),
        deleted: sessionRow.deleted,
        exercises,
      });
    }

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("Sessions GET error:", err);
    return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 });
  }
});
