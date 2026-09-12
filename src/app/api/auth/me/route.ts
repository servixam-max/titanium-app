import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { getBearerUserId, signAccessToken } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const userId = getBearerUserId(req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.avatar_color, p.*
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const row = result.rows[0];
    const payload = { userId: row.id, email: row.email, username: row.username };

    return NextResponse.json({
      user: payload,
      profile: {
        goal: row.goal,
        level: row.level,
        daysPerWeek: row.days_per_week,
        equipment: row.equipment,
        heightCm: row.height_cm,
        weightGoal: row.weight_goal,
        restrictions: row.restrictions,
        onboardingComplete: row.onboarding_complete,
        preferences: row.preferences,
        avatarColor: row.avatar_color,
      },
      accessToken: signAccessToken(payload),
    });
  } catch (err) {
    console.error("Me error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
