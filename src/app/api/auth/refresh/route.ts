import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const refreshToken = req.headers.get("x-refresh-token");
  if (!refreshToken) {
    return NextResponse.json({ error: "Refresh token requerido" }, { status: 400 });
  }

  try {
    const { userId } = verifyRefreshToken(refreshToken);

    const result = await pool.query(
      "SELECT id, email, username FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
    }

    const user = result.rows[0];
    const payload = { userId: user.id, email: user.email, username: user.username };

    return NextResponse.json({
      user: payload,
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
  }
}
