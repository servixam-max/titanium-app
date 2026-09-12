import { NextResponse } from "next/server";
import { pool } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, service: "fortixam-api", version: process.env.NEXT_PUBLIC_APP_VERSION || "8.0.0" });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ ok: false, error: "database_unreachable" }, { status: 503 });
  }
}
