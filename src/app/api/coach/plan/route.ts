import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { withAuth } from "@/lib/server/withAuth";
import { buildPlan } from "@/lib/coach";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const result = await pool.query(
      `SELECT goal, level, days_per_week, equipment, restrictions FROM profiles WHERE user_id = $1`,
      [userId],
    );
    const profile = result.rows[0];

    const body = await req.json().catch(() => ({}));
    const plan = buildPlan({
      goal: body.goal || profile?.goal,
      level: body.level || profile?.level,
      daysPerWeek: body.daysPerWeek || profile?.days_per_week,
      equipment: body.equipment || profile?.equipment,
      restrictions: body.restrictions || profile?.restrictions,
    });

    return NextResponse.json({ plan });
  } catch (err) {
    console.error("Coach plan error:", err);
    return NextResponse.json({ error: "Error al generar el plan" }, { status: 500 });
  }
});
