import { NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import pkg from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({
      ok: true,
      service: "fortixam-api",
      version: pkg.version,
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ ok: false, error: "database_unreachable" }, { status: 503 });
  }
}
