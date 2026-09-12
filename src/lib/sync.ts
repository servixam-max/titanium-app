// FORTIXAM v8 — client sync engine

import { db, getSyncQueue, removeSyncQueueItem, updateSyncAttempt, saveSyncState, getSyncState, nowIso, getClientId } from "./db";
import { fetchWithAuth, getActiveUserId } from "./auth";
import { SyncState, WorkoutSession, WeightEntry, Plan, UserProfile } from "./types";

const BATCH_SIZE = 100;

function buildState(): SyncState {
  return {
    ...buildSyncableStub(),
    deviceId: getClientId(),
    status: "idle",
  };
}

function buildSyncableStub() {
  const ownerUserId = getActiveUserId() || "xam-seed-id";
  return {
    id: `sync-${ownerUserId}`,
    clientId: getClientId(),
    ownerUserId,
    createdAt: nowIso(),
    modifiedAt: nowIso(),
    version: 1,
  };
}

export async function syncNow(): Promise<{ ok: boolean; applied: number; received: number; error?: string }> {
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
      const msg = (await res.json()).error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const { serverTime, applied, serverChanges } = await res.json();

    for (const item of batch) {
      await removeSyncQueueItem(item.id);
    }

    await applyServerChanges(serverChanges || []);

    await saveSyncState({
      ...state,
      lastSyncAt: serverTime,
      status: "idle",
      modifiedAt: nowIso(),
    });

    return { ok: true, applied: applied.length, received: serverChanges.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await saveSyncState({ ...state, status: "error", error: msg });
    return { ok: false, applied: 0, received: 0, error: msg };
  }
}

export async function applyServerChanges(serverChanges: Array<{ entityType: string; data: unknown }>): Promise<void> {
  for (const { entityType, data } of serverChanges) {
    try {
      switch (entityType) {
        case "WorkoutSession":
          await db.sessions.put(data as WorkoutSession);
          break;
        case "WeightEntry":
          await db.weights.put(data as WeightEntry);
          break;
        case "Plan":
          await db.plans.put(data as Plan);
          break;
        case "UserProfile":
          await db.profiles.put(data as UserProfile);
          break;
      }
    } catch (err) {
      console.error("Apply server change failed:", entityType, err);
    }
  }
}

export async function retryFailedSync(maxAttempts = 5): Promise<void> {
  const queue = await getSyncQueue();
  for (const item of queue) {
    if (item.attempts >= maxAttempts) continue;
    try {
      await syncNow();
      return;
    } catch {
      await updateSyncAttempt(item.id, "retry pending");
    }
  }
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
