import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { verifyPassword, signAccessToken, signRefreshToken } from "@/lib/server/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const result = await pool.query(
      "SELECT id, email, username, password_hash FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const user = result.rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const payload = { userId: user.id, email: user.email, username: user.username };
    return NextResponse.json({
      user: payload,
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
