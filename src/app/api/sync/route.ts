import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/server/db";
import { getBearerUserId } from "@/lib/server/auth";
import {
  TYPED_TABLES,
  DOCUMENT_ENTITIES,
  normalizeEntity,
  rowToEntity,
} from "@/lib/server/sync-mapping";
import { z } from "zod";

const MAX_CHANGES = 200;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const changeSchema = z.object({
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(128),
  operation: z.enum(["create", "update", "delete"]),
  data: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  clientId: z.string().max(128).optional(),
  lastSyncAt: z.string().max(64).optional(),
  changes: z.array(changeSchema).max(MAX_CHANGES).default([]),
});

function parseIso(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

interface UpsertResult {
  applied: boolean;
  serverVersion?: number;
  reason?: string;
}

async function upsertTypedEntity(
  userId: string,
  entityType: string,
  data: Record<string, unknown>,
): Promise<UpsertResult> {
  const meta = TYPED_TABLES[entityType];
  if (!meta) return { applied: false, reason: "unknown_entity_type" };

  const normalized = normalizeEntity(entityType, data);
  if (!normalized || typeof normalized.id !== "string") {
    return { applied: false, reason: "invalid_payload" };
  }
  normalized.user_id = userId;

  // Filtrado por user_id: evita que un usuario sobrescriba filas de otro.
  const existing = await pool.query(
    `SELECT version, modified_at FROM ${meta.table} WHERE id = $1 AND user_id = $2`,
    [normalized.id, userId],
  );

  if (existing.rows.length > 0) {
    const serverModified = new Date(existing.rows[0].modified_at).toISOString();
    const clientModified = typeof normalized.modified_at === "string" ? normalized.modified_at : null;

    if (clientModified && serverModified >= clientModified) {
      return { applied: false, reason: "server_newer", serverVersion: existing.rows[0].version };
    }

    const updatable = meta.columns.filter((c) => c !== "id" && c !== "created_at" && c !== "user_id");
    const setClause = updatable.map((c, i) => `${c} = $${i + 3}`).join(", ");
    const values = [normalized.id, userId, ...updatable.map((c) => normalized[c])];
    await pool.query(`UPDATE ${meta.table} SET ${setClause} WHERE id = $1 AND user_id = $2`, values);
  } else {
    // Un UUID ya usado por otro usuario no se sobrescribe: se reporta.
    const otherOwner = await pool.query(`SELECT user_id FROM ${meta.table} WHERE id = $1`, [normalized.id]);
    if (otherOwner.rows.length > 0) {
      return { applied: false, reason: "id_owned_by_another_user" };
    }

    const cols = meta.columns.join(", ");
    const placeholders = meta.columns.map((_, i) => `$${i + 1}`).join(", ");
    await pool.query(
      `INSERT INTO ${meta.table} (${cols}) VALUES (${placeholders})`,
      meta.columns.map((c) => normalized[c]),
    );
  }

  const refreshed = await pool.query(
    `SELECT version FROM ${meta.table} WHERE id = $1 AND user_id = $2`,
    [normalized.id, userId],
  );
  return { applied: true, serverVersion: refreshed.rows[0]?.version };
}

async function upsertDocument(
  userId: string,
  entityType: string,
  entityId: string,
  data: Record<string, unknown>,
): Promise<UpsertResult> {
  const version = typeof data.version === "number" ? data.version : 1;
  const modifiedAt = parseIso(typeof data.modifiedAt === "string" ? data.modifiedAt : null)?.toISOString()
    || new Date().toISOString();
  const createdAt = parseIso(typeof data.createdAt === "string" ? data.createdAt : null)?.toISOString()
    || modifiedAt;
  const clientId = typeof data.clientId === "string" ? data.clientId : null;
  const deleted = data.deleted === true;

  const existing = await pool.query(
    `SELECT version, modified_at FROM user_documents WHERE id = $1 AND user_id = $2`,
    [entityId, userId],
  );

  if (existing.rows.length > 0) {
    const serverModified = new Date(existing.rows[0].modified_at).toISOString();
    if (serverModified >= modifiedAt) {
      return { applied: false, reason: "server_newer", serverVersion: existing.rows[0].version };
    }
    await pool.query(
      `UPDATE user_documents SET data = $3, version = $4, modified_at = $5, deleted = $6
       WHERE id = $1 AND user_id = $2`,
      [entityId, userId, JSON.stringify(data), version, modifiedAt, deleted],
    );
  } else {
    const otherOwner = await pool.query(`SELECT user_id FROM user_documents WHERE id = $1`, [entityId]);
    if (otherOwner.rows.length > 0) {
      return { applied: false, reason: "id_owned_by_another_user" };
    }
    await pool.query(
      `INSERT INTO user_documents (id, user_id, entity_type, client_id, data, version, created_at, modified_at, deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [entityId, userId, entityType, clientId, JSON.stringify(data), version, createdAt, modifiedAt, deleted],
    );
  }

  return { applied: true, serverVersion: version };
}

async function markDeleted(
  userId: string,
  entityType: string,
  id: string,
): Promise<UpsertResult> {
  const meta = TYPED_TABLES[entityType];
  if (meta) {
    await pool.query(
      `UPDATE ${meta.table} SET deleted = true, modified_at = NOW(), version = version + 1
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return { applied: true };
  }
  if (DOCUMENT_ENTITIES.has(entityType)) {
    await pool.query(
      `UPDATE user_documents SET deleted = true, modified_at = NOW(), version = version + 1
       WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return { applied: true };
  }
  return { applied: false, reason: "unknown_entity_type" };
}

async function getServerChanges(
  userId: string,
  lastSyncAt?: string,
): Promise<Array<{ entityType: string; data: Record<string, unknown> }>> {
  const changes: Array<{ entityType: string; data: Record<string, unknown> }> = [];
  const since = parseIso(lastSyncAt);

  for (const [entityType, meta] of Object.entries(TYPED_TABLES)) {
    const query = since
      ? `SELECT * FROM ${meta.table} WHERE user_id = $1 AND modified_at > $2 AND deleted = false`
      : `SELECT * FROM ${meta.table} WHERE user_id = $1 AND deleted = false`;
    const params = since ? [userId, since.toISOString()] : [userId];
    const result = await pool.query(query, params);
    for (const row of result.rows) {
      changes.push({ entityType, data: rowToEntity(entityType, row) });
    }
  }

  const docQuery = since
    ? `SELECT entity_type, data FROM user_documents
       WHERE user_id = $1 AND modified_at > $2 AND deleted = false`
    : `SELECT entity_type, data FROM user_documents WHERE user_id = $1 AND deleted = false`;
  const docParams = since ? [userId, since.toISOString()] : [userId];
  const docResult = await pool.query(docQuery, docParams);
  for (const row of docResult.rows) {
    const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
    changes.push({ entityType: row.entity_type, data });
  }

  return changes;
}

export async function POST(req: NextRequest) {
  const userId = getBearerUserId(req.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload demasiado grande" }, { status: 413 });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de sync inválidos", issues: parsed.error.issues.slice(0, 5) },
        { status: 400 },
      );
    }

    const { lastSyncAt, changes } = parsed.data;

    const applied: Array<{ entityType: string; entityId: string; serverVersion?: number }> = [];
    const skipped: Array<{ entityType: string; entityId: string; reason: string }> = [];

    for (const change of changes) {
      const { entityType, entityId, operation, data } = change;

      if (operation === "delete") {
        const result = await markDeleted(userId, entityType, entityId);
        if (result.applied) applied.push({ entityType, entityId });
        else skipped.push({ entityType, entityId, reason: result.reason || "not_applied" });
        continue;
      }

      if (!data) {
        skipped.push({ entityType, entityId, reason: "missing_data" });
        continue;
      }

      const payload = { ...data, id: entityId };

      const result = TYPED_TABLES[entityType]
        ? await upsertTypedEntity(userId, entityType, payload)
        : DOCUMENT_ENTITIES.has(entityType)
          ? await upsertDocument(userId, entityType, entityId, payload)
          : { applied: false, reason: "unknown_entity_type" };

      if (result.applied) {
        applied.push({ entityType, entityId, serverVersion: result.serverVersion });
      } else {
        skipped.push({ entityType, entityId, reason: result.reason || "not_applied" });
      }
    }

    const serverChanges = await getServerChanges(userId, lastSyncAt);

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      applied,
      skipped,
      serverChanges,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Error de sincronización" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
