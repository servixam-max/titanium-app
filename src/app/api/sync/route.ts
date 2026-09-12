import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { getBearerUserId } from "@/lib/server/auth";

const TABLES: Record<string, { table: string; columns: string[]; json?: string[] }> = {
  WorkoutSession: {
    table: "workout_sessions",
    columns: [
      "id",
      "user_id",
      "client_id",
      "routine_id",
      "routine_name",
      "mode",
      "start_time",
      "end_time",
      "duration_seconds",
      "total_sets",
      "total_reps",
      "total_volume",
      "completed",
      "notes",
      "version",
      "created_at",
      "modified_at",
      "deleted",
    ],
  },
  WeightEntry: {
    table: "weight_entries",
    columns: ["id", "user_id", "client_id", "weight", "date", "version", "created_at", "modified_at", "deleted"],
  },
  Plan: {
    table: "plans",
    columns: [
      "id",
      "user_id",
      "client_id",
      "name",
      "description",
      "goal",
      "level",
      "days_per_week",
      "weeks",
      "schedule",
      "active",
      "version",
      "created_at",
      "modified_at",
      "deleted",
    ],
    json: ["schedule"],
  },
};

function parseIso(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEntity(entityType: string, data: Record<string, unknown>): Record<string, unknown> {
  const meta = TABLES[entityType];
  if (!meta) return data;

  const normalized: Record<string, unknown> = {};
  for (const col of meta.columns) {
    const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = data[camel] ?? data[col] ?? null;

    if (col === "created_at" || col === "modified_at" || col === "start_time" || col === "end_time" || col === "timestamp") {
      const parsed = parseIso(typeof value === "string" ? value : null);
      value = parsed ? parsed.toISOString() : null;
    }

    if (meta.json?.includes(col) && value !== null && typeof value !== "string") {
      value = JSON.stringify(value);
    }

    normalized[col] = value;
  }
  return normalized;
}

function rowToCamel(row: Record<string, unknown>, entityType: string): Record<string, unknown> {
  const meta = TABLES[entityType];
  if (!meta) return row;

  const result: Record<string, unknown> = {};
  for (const col of meta.columns) {
    const camel = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = row[col];
    if (meta.json?.includes(col) && typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        // keep as string
      }
    }
    result[camel] = value;
  }
  return result;
}

async function upsertEntity(userId: string, entityType: string, data: Record<string, unknown>) {
  const meta = TABLES[entityType];
  if (!meta) return null;

  const normalized = normalizeEntity(entityType, data);
  normalized.user_id = userId;

  const existing = await pool.query(`SELECT version, modified_at FROM ${meta.table} WHERE id = $1`, [normalized.id]);
  if (existing.rows.length > 0) {
    const serverModified = new Date(existing.rows[0].modified_at).toISOString();
    const clientModified = typeof normalized.modified_at === "string" ? normalized.modified_at : null;
    if (clientModified && serverModified >= clientModified) {
      // Server wins, skip update but still return current server row so client can reconcile
      return existing.rows[0];
    }
    const setClause = meta.columns
      .filter((c) => c !== "id" && c !== "created_at")
      .map((c, i) => `${c} = $${i + 2}`)
      .join(", ");
    const values = [normalized.id, ...meta.columns.filter((c) => c !== "id" && c !== "created_at").map((c) => normalized[c])];
    await pool.query(`UPDATE ${meta.table} SET ${setClause} WHERE id = $1`, values);
  } else {
    const cols = meta.columns.join(", ");
    const placeholders = meta.columns.map((_, i) => `$${i + 1}`).join(", ");
    await pool.query(`INSERT INTO ${meta.table} (${cols}) VALUES (${placeholders})`, meta.columns.map((c) => normalized[c]));
  }
  const refreshed = await pool.query(`SELECT * FROM ${meta.table} WHERE id = $1`, [normalized.id]);
  return refreshed.rows[0] || null;
}

async function markDeleted(userId: string, entityType: string, id: string) {
  const meta = TABLES[entityType];
  if (!meta) return;
  await pool.query(
    `UPDATE ${meta.table} SET deleted = true, modified_at = NOW(), version = version + 1 WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

async function getServerChanges(userId: string, lastSyncAt?: string): Promise<Array<{ entityType: string; data: Record<string, unknown> }>> {
  const changes: Array<{ entityType: string; data: Record<string, unknown> }> = [];

  for (const [entityType, meta] of Object.entries(TABLES)) {
    const query = lastSyncAt
      ? `SELECT * FROM ${meta.table} WHERE user_id = $1 AND modified_at > $2 AND deleted = false`
      : `SELECT * FROM ${meta.table} WHERE user_id = $1 AND deleted = false`;
    const params = lastSyncAt ? [userId, lastSyncAt] : [userId];
    const result = await pool.query(query, params);
    for (const row of result.rows) {
      changes.push({ entityType, data: rowToCamel(row, entityType) });
    }
  }

  return changes;
}

export async function POST(req: NextRequest) {
  const userId = getBearerUserId(req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { lastSyncAt, changes = [] } = body;

    const applied: Array<{ entityType: string; entityId: string; serverVersion?: number }> = [];

    for (const change of changes) {
      const { entityType, entityId, operation, data } = change;
      if (operation === "delete") {
        await markDeleted(userId, entityType, entityId);
        applied.push({ entityType, entityId });
      } else {
        const row = await upsertEntity(userId, entityType, data);
        if (row) {
          applied.push({ entityType, entityId, serverVersion: row.version });
        }
      }
    }

    const serverChanges = await getServerChanges(userId, lastSyncAt);

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      applied,
      serverChanges,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Error de sincronización" }, { status: 500 });
  }
}
