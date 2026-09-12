import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { getBearerUserId } from "@/lib/server/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getBearerUserId(_req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await pool.query(
      `UPDATE weight_entries SET deleted = true, modified_at = NOW(), version = version + 1
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Weight DELETE error:", err);
    return NextResponse.json({ error: "Error al eliminar el peso" }, { status: 500 });
  }
}