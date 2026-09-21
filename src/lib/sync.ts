// FORTIXAM — motor de sincronización del cliente

import {
  db,
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncAttempt,
  saveSyncState,
  getSyncState,
  nowIso,
  getClientId,
} from "./db";
import { fetchWithAuth, getActiveUserId } from "./auth";
import { mergeEntity, resolveQueueItem } from "./sync-merge";
import {
  SyncState,
  WorkoutSession,
  WeightEntry,
  Plan,
  PlannedSession,
  Achievement,
  UserProfile,
  Routine,
  Exercise,
} from "./types";

const BATCH_SIZE = 100;

interface ServerChange {
  entityType: string;
  data: Record<string, unknown>;
}

interface ServerResponse {
  serverTime: string;
  applied: Array<{ entityType: string; entityId: string }>;
  skipped: Array<{ entityType: string; entityId: string; reason: string }>;
  serverChanges: ServerChange[];
}

export interface SyncOutcome {
  ok: boolean;
  applied: number;
  received: number;
  skipped: number;
  error?: string;
}

function buildState(): SyncState {
  const ownerUserId = getActiveUserId() || "xam-seed-id";
  return {
    id: `sync-${ownerUserId}`,
    clientId: getClientId(),
    ownerUserId,
    createdAt: nowIso(),
    modifiedAt: nowIso(),
    version: 1,
    deviceId: getClientId(),
    status: "idle",
  };
}

/** Aplica un cambio del servidor con merge (nunca sobrescribe datos más nuevos). */
async function applyChange(entityType: string, data: Record<string, unknown>): Promise<void> {
  const id = typeof data.id === "string" ? data.id : undefined;
  if (!id) return;

  switch (entityType) {
    case "WorkoutSession": {
      const local = await db.sessions.get(id);
      const result = mergeEntity<WorkoutSession & Record<string, unknown>>(
        "WorkoutSession",
        local as (WorkoutSession & Record<string, unknown>) | undefined,
        data as WorkoutSession & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.sessions.put(result.entity);
      break;
    }
    case "WeightEntry": {
      const local = await db.weights.get(id);
      const result = mergeEntity<WeightEntry & Record<string, unknown>>(
        "WeightEntry",
        local as (WeightEntry & Record<string, unknown>) | undefined,
        data as WeightEntry & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.weights.put(result.entity);
      break;
    }
    case "Plan": {
      const local = await db.plans.get(id);
      const result = mergeEntity<Plan & Record<string, unknown>>(
        "Plan",
        local as (Plan & Record<string, unknown>) | undefined,
        data as Plan & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.plans.put(result.entity);
      break;
    }
    case "Routine": {
      const local = await db.routines.get(id);
      const result = mergeEntity<Routine & Record<string, unknown>>(
        "Routine",
        local as (Routine & Record<string, unknown>) | undefined,
        data as Routine & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.routines.put(result.entity);
      break;
    }
    case "Exercise": {
      const local = await db.exercises.get(id);
      const result = mergeEntity<Exercise & Record<string, unknown>>(
        "Exercise",
        local as (Exercise & Record<string, unknown>) | undefined,
        data as Exercise & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.exercises.put(result.entity);
      break;
    }
    case "PlannedSession": {
      const local = await db.plannedSessions.get(id);
      const result = mergeEntity<PlannedSession & Record<string, unknown>>(
        "PlannedSession",
        local as (PlannedSession & Record<string, unknown>) | undefined,
        data as PlannedSession & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.plannedSessions.put(result.entity);
      break;
    }
    case "Achievement": {
      const local = await db.achievements.get(id);
      const result = mergeEntity<Achievement & Record<string, unknown>>(
        "Achievement",
        local as (Achievement & Record<string, unknown>) | undefined,
        data as Achievement & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.achievements.put(result.entity);
      break;
    }
    case "UserProfile": {
      const local = await db.profiles.get(id);
      const result = mergeEntity<UserProfile & Record<string, unknown>>(
        "UserProfile",
        local as (UserProfile & Record<string, unknown>) | undefined,
        data as UserProfile & Record<string, unknown>,
      );
      if (result.action !== "skip") await db.profiles.put(result.entity);
      break;
    }
    default:
      // Entidad desconocida para este cliente: se ignora sin romper el sync.
      break;
  }
}

export async function applyServerChanges(serverChanges: ServerChange[]): Promise<void> {
  for (const change of serverChanges) {
    try {
      await applyChange(change.entityType, change.data);
    } catch (err) {
      console.error("Apply server change failed:", change.entityType, err);
    }
  }
}

export async function syncNow(): Promise<SyncOutcome> {
  const state = (await getSyncState()) || buildState();
  await saveSyncState({ ...state, status: "syncing", error: undefined });

  try {
    const queue = await getSyncQueue();
    const batch = queue.slice(0, BATCH_SIZE);

    const changes = batch.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      data: item.payload,
    }));

    const res = await fetchWithAuth("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: getClientId(), lastSyncAt: state.lastSyncAt, changes }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }

    const body = (await res.json()) as ServerResponse;

    for (const item of batch) {
      const resolution = resolveQueueItem(item, body);
      if (resolution.remove) {
        await removeSyncQueueItem(item.id);
      } else if (resolution.retry) {
        await updateSyncAttempt(item.id, resolution.reason);
      }
    }

    await applyServerChanges(body.serverChanges || []);

    await saveSyncState({
      ...state,
      lastSyncAt: body.serverTime,
      status: "idle",
      error: undefined,
      modifiedAt: nowIso(),
    });

    return {
      ok: true,
      applied: body.applied.length,
      received: body.serverChanges.length,
      skipped: body.skipped.length,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await saveSyncState({ ...state, status: "error", error: msg });
    return { ok: false, applied: 0, received: 0, skipped: 0, error: msg };
  }
}

/** Reintenta los items pendientes de la cola. */
export async function retryFailedSync(maxAttempts = 5): Promise<void> {
  const queue = await getSyncQueue();
  const pending = queue.filter((item) => item.attempts < maxAttempts);
  if (pending.length === 0) return;
  await syncNow();
}

export function startPeriodicSync(intervalMs = 30000): () => void {
  const timer = setInterval(async () => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    if (online) {
      await syncNow();
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
