import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { withAuth } from "@/lib/server/withAuth";
import { z } from "zod";

const weightSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  weight: z.number(),
  date: z.string(),
  version: z.number().default(1),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
  deleted: z.boolean().default(false),
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const parsed = weightSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
    }

    const w = parsed.data;
    await pool.query(
      `INSERT INTO weight_entries (id, user_id, client_id, weight, date, version, created_at, modified_at, deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         weight = EXCLUDED.weight,
         date = EXCLUDED.date,
         version = EXCLUDED.version,
         modified_at = EXCLUDED.modified_at,
         deleted = EXCLUDED.deleted`,
      [
        w.id,
        userId,
        w.clientId,
        w.weight,
        w.date,
        w.version,
        w.createdAt || new Date().toISOString(),
        w.modifiedAt || new Date().toISOString(),
        w.deleted,
      ],
    );

    return NextResponse.json({ success: true, id: w.id });
  } catch (err) {
    console.error("Weights POST error:", err);
    return NextResponse.json({ error: "Error al guardar peso" }, { status: 500 });
  }
});

export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  try {
    const result = await pool.query(
      `SELECT * FROM weight_entries WHERE user_id = $1 AND deleted = false ORDER BY date DESC`,
      [userId],
    );
    const entries = result.rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      ownerUserId: row.user_id,
      weight: Number(row.weight),
      date: row.date.toISOString ? row.date.toISOString() : row.date,
      version: row.version,
      createdAt: row.created_at?.toISOString(),
      modifiedAt: row.modified_at?.toISOString(),
      deleted: row.deleted,
    }));
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("Weights GET error:", err);
    return NextResponse.json({ error: "Error al obtener pesos" }, { status: 500 });
  }
});
