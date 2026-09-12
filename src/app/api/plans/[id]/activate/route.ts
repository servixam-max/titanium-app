import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { getBearerUserId } from "@/lib/server/auth";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getBearerUserId(_req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`UPDATE plans SET active = false WHERE user_id = $1`, [userId]);
      const result = await client.query(
        `UPDATE plans SET active = true, modified_at = NOW(), version = version + 1
         WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId],
      );
      await client.query("COMMIT");

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Plan activate error:", err);
    return NextResponse.json({ error: "Error al activar el plan" }, { status: 500 });
  }
}