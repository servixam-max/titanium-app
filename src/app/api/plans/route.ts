import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { withAuth } from "@/lib/server/withAuth";
import { z } from "zod";

const planSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  name: z.string(),
  description: z.string(),
  goal: z.string().optional(),
  level: z.string().optional(),
  daysPerWeek: z.number(),
  weeks: z.number(),
  schedule: z.any(),
  active: z.boolean().default(false),
  recommended: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  version: z.number().default(1),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
  deleted: z.boolean().default(false),
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const p = parsed.data;
    if (p.active) {
      await pool.query(`UPDATE plans SET active = false WHERE user_id = $1`, [userId]);
    }

    await pool.query(
      `INSERT INTO plans (id, user_id, client_id, name, description, goal, level, days_per_week, weeks, schedule, active, version, created_at, modified_at, deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         goal = EXCLUDED.goal,
         level = EXCLUDED.level,
         days_per_week = EXCLUDED.days_per_week,
         weeks = EXCLUDED.weeks,
         schedule = EXCLUDED.schedule,
         active = EXCLUDED.active,
         version = EXCLUDED.version,
         modified_at = EXCLUDED.modified_at,
         deleted = EXCLUDED.deleted`,
      [
        p.id,
        userId,
        p.clientId,
        p.name,
        p.description,
        p.goal || null,
        p.level || null,
        p.daysPerWeek,
        p.weeks,
        JSON.stringify(p.schedule),
        p.active,
        p.version,
        p.createdAt || new Date().toISOString(),
        p.modifiedAt || new Date().toISOString(),
        p.deleted,
      ],
    );

    return NextResponse.json({ success: true, id: p.id });
  } catch (err) {
    console.error("Plans POST error:", err);
    return NextResponse.json({ error: "Error al guardar el plan" }, { status: 500 });
  }
});

export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  try {
    const result = await pool.query(
      `SELECT * FROM plans WHERE user_id = $1 AND deleted = false ORDER BY modified_at DESC`,
      [userId],
    );
    const plans = result.rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      ownerUserId: row.user_id,
      name: row.name,
      description: row.description,
      goal: row.goal,
      level: row.level,
      daysPerWeek: row.days_per_week,
      weeks: row.weeks,
      schedule: typeof row.schedule === "string" ? JSON.parse(row.schedule) : row.schedule,
      active: row.active,
      version: row.version,
      createdAt: row.created_at?.toISOString(),
      modifiedAt: row.modified_at?.toISOString(),
      deleted: row.deleted,
    }));
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Plans GET error:", err);
    return NextResponse.json({ error: "Error al obtener planes" }, { status: 500 });
  }
});
