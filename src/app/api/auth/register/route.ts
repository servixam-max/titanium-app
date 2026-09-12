import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { hashPassword, signAccessToken, signRefreshToken } from "@/lib/server/auth";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { username, email, password } = parsed.data;
    const passwordHash = hashPassword(password);

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }

    const userResult = await pool.query(
      `INSERT INTO users (email, username, password_hash, avatar_color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username`,
      [email, username, passwordHash, "#00D68F"],
    );

    const user = userResult.rows[0];

    await pool.query(
      `INSERT INTO profiles (user_id, preferences)
       VALUES ($1, $2)`,
      [user.id, JSON.stringify({ audioMode: "full", voiceRate: 0.92, equipmentPreference: "dumbbells", theme: "dark", highContrast: false, language: "es", restTimerAutoStart: true, restTimerAdaptive: false })],
    );

    const payload = { userId: user.id, email: user.email, username: user.username };
    return NextResponse.json({
      user: payload,
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
