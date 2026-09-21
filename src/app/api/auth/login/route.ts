import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { verifyPassword, signAccessToken, signRefreshToken } from "@/lib/server/auth";
import { rateLimit, resetRateLimit, clientIp } from "@/lib/server/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

// Límites: por combinación IP+cuenta (fuerza bruta dirigida) y por IP sola
// (barrido de muchas cuentas).
const PER_ACCOUNT_LIMIT = 5;
const PER_IP_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const ip = clientIp(req);
    const accountKey = `login:${ip}:${email.toLowerCase()}`;
    const ipKey = `login-ip:${ip}`;

    const accountLimit = rateLimit(accountKey, PER_ACCOUNT_LIMIT, WINDOW_MS);
    const ipLimit = rateLimit(ipKey, PER_IP_LIMIT, WINDOW_MS);

    if (!accountLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(accountLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: "Demasiados intentos. Prueba de nuevo en unos minutos." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const result = await pool.query(
      "SELECT id, email, username, password_hash FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      // Misma respuesta que con contraseña incorrecta: no se filtra qué
      // correos existen.
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const user = result.rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    // Login correcto: se limpia el contador de esa cuenta.
    resetRateLimit(accountKey);

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
