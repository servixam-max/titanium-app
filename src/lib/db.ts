import Dexie, { Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import {
  WorkoutSession,
  WeightEntry,
  UserProfile,
  Plan,
  PlannedSession,
  Achievement,
  SyncQueueItem,
  SyncState,
  Routine,
  Exercise,
} from "./types";
import { getActiveUserId } from "./auth";

// =========================================================
// ID generation
// =========================================================

let cachedClientId: string | null = null;

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  if (cachedClientId) return cachedClientId;
  const key = "fortixam_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(key, id);
  }
  cachedClientId = id;
  return id;
}

export function generateId(): string {
  return uuidv4();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// =========================================================
// Database
// =========================================================

class FortixamDatabase extends Dexie {
  // v7 legacy tables
  sessions!: Table<WorkoutSession & LegacySession, string>;
  weights!: Table<WeightEntry & LegacyWeight, string>;

  // v8 tables
  profiles!: Table<UserProfile, string>;
  plans!: Table<Plan, string>;
  plannedSessions!: Table<PlannedSession, string>;
  achievements!: Table<Achievement, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  syncState!: Table<SyncState, string>;
  routines!: Table<Routine, string>;
  exercises!: Table<Exercise, string>;

  constructor() {
    super("fortixam-db-v8");

    this.version(1).stores({
      sessions: "id, userId, routineId, mode, startTime, completed, synced",
      weights: "id, userId, date, synced",
    });

    this.version(2).stores({
      sessions: "id, userId, routineId, mode, startTime, completed, synced",
      weights: "id, userId, date, synced",
      profiles: "id, userId, email",
      plans: "id, ownerUserId, active",
      plannedSessions: "id, planId, weekIndex, dayIndex",
      achievements: "id, userId, key",
      syncQueue: "id, entityType, entityId, operation",
      syncState: "id, ownerUserId, deviceId",
      routines: "id, day, ownerUserId, planId",
      exercises: "id, category, equipment, ownerUserId",
    });

    this.version(3).stores({
      sessions: "id, ownerUserId, routineId, mode, startTime, completed, [ownerUserId+modifiedAt]",
      weights: "id, ownerUserId, date, [ownerUserId+modifiedAt]",
      profiles: "id, userId, email, [ownerUserId+modifiedAt]",
      plans: "id, ownerUserId, active, [ownerUserId+modifiedAt]",
      plannedSessions: "id, planId, weekIndex, dayIndex, [ownerUserId+modifiedAt]",
      achievements: "id, userId, key, [ownerUserId+modifiedAt]",
      syncQueue: "id, entityType, entityId, operation, [ownerUserId+modifiedAt]",
      syncState: "id, ownerUserId, deviceId",
      routines: "id, day, ownerUserId, planId, [ownerUserId+modifiedAt]",
      exercises: "id, category, equipment, ownerUserId, [ownerUserId+modifiedAt]",
    }).upgrade(async (tx) => {
      const clientId = getClientId();
      const ownerUserId = getActiveUserId() || "xam-seed-id";
      const now = nowIso();

      await tx.table("sessions").toCollection().modify((session: Record<string, unknown>) => {
        if (!session.ownerUserId) session.ownerUserId = session.userId || ownerUserId;
        if (!session.clientId) session.clientId = clientId;
        if (!session.createdAt) session.createdAt = now;
        if (!session.modifiedAt) session.modifiedAt = now;
        if (!session.version) session.version = 1;
        // Normalize timestamps to ISO strings
        if (session.startTime instanceof Date) session.startTime = session.startTime.toISOString();
        if (session.endTime instanceof Date) session.endTime = session.endTime.toISOString();
        if (Array.isArray(session.exercises)) {
          (session.exercises as Array<Record<string, unknown>>).forEach((ex) => {
            if (!ex.id) ex.id = generateId();
            if (!ex.clientId) ex.clientId = clientId;
            if (!ex.ownerUserId) ex.ownerUserId = session.ownerUserId;
            if (!ex.createdAt) ex.createdAt = now;
            if (!ex.modifiedAt) ex.modifiedAt = now;
            if (!ex.version) ex.version = 1;
            if (Array.isArray(ex.sets)) {
              (ex.sets as Array<Record<string, unknown>>).forEach((set) => {
                if (!set.id) set.id = generateId();
                if (!set.clientId) set.clientId = clientId;
                if (!set.ownerUserId) set.ownerUserId = session.ownerUserId;
                if (!set.createdAt) set.createdAt = now;
                if (!set.modifiedAt) set.modifiedAt = now;
                if (!set.version) set.version = 1;
                if (set.timestamp instanceof Date) set.timestamp = set.timestamp.toISOString();
              });
            }
          });
        }
      });

      await tx.table("weights").toCollection().modify((weight: Record<string, unknown>) => {
        if (!weight.ownerUserId) weight.ownerUserId = weight.userId || ownerUserId;
        if (!weight.clientId) weight.clientId = clientId;
        if (!weight.createdAt) weight.createdAt = now;
        if (!weight.modifiedAt) weight.modifiedAt = now;
        if (!weight.version) weight.version = 1;
        if (!weight.date && weight.created_at) weight.date = weight.created_at;
      });
    });
  }
}

interface LegacySession {
  userId?: string;
  synced?: boolean;
  syncError?: string;
}

interface LegacyWeight {
  userId?: string;
  synced?: boolean;
  created_at?: string;
}

export const db = new FortixamDatabase();

// Migrate historical data from previous database versions (e.g. titanium-db)
export async function migrateLegacyDatabases(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const candidateNames = ["titanium-db", "titanium", "fortixam", "fortixam-db"];

    // Also discover any other database if supported
    if (typeof indexedDB !== "undefined" && "databases" in indexedDB) {
      try {
        const found = await indexedDB.databases();
        for (const info of found) {
          if (info.name && info.name !== "fortixam-db-v8" && !candidateNames.includes(info.name)) {
            const lower = info.name.toLowerCase();
            if (lower.includes("titanium") || lower.includes("fortixam")) {
              candidateNames.push(info.name);
            }
          }
        }
      } catch {
        // ignore error from databases()
      }
    }

    const currentOwner = getActiveUserId() || "xam-seed-id";
    const clientId = getClientId();
    const now = nowIso();

    for (const dbName of candidateNames) {
      try {
        const exists = await Dexie.exists(dbName);
        if (!exists) continue;

        const oldDb = new Dexie(dbName);
        await oldDb.open();
        const tableNames = oldDb.tables.map((t) => t.name);

        // Migrate weights
        if (tableNames.includes("weights")) {
          const oldWeights = (await oldDb.table("weights").toArray()) as Array<Record<string, unknown>>;
          for (const w of oldWeights) {
            if (!w || !w.id) continue;
            const existing = await db.weights.get(String(w.id));
            if (!existing) {
              const entry: WeightEntry = {
                id: String(w.id),
                ownerUserId: String(w.ownerUserId || w.userId || currentOwner),
                clientId: String(w.clientId || clientId),
                weight: Number(w.weight),
                date: String(w.date || w.created_at || now.slice(0, 10)),
                createdAt: String(w.createdAt || w.created_at || now),
                modifiedAt: String(w.modifiedAt || now),
                version: Number(w.version || 1),
                deleted: Boolean(w.deleted || false),
              };
              await db.weights.put(entry);
              await enqueueSync("WeightEntry", entry.id, "create", entry);
            }
          }
        }

        // Migrate sessions
        if (tableNames.includes("sessions")) {
          const oldSessions = (await oldDb.table("sessions").toArray()) as Array<Record<string, unknown>>;
          for (const s of oldSessions) {
            if (!s || !s.id) continue;
            const existing = await db.sessions.get(String(s.id));
            if (!existing) {
              const session: WorkoutSession = {
                id: String(s.id),
                ownerUserId: String(s.ownerUserId || s.userId || currentOwner),
                clientId: String(s.clientId || clientId),
                routineId: Number(s.routineId) || 1,
                routineName: s.routineName ? String(s.routineName) : undefined,
                mode: (s.mode as WorkoutSession["mode"]) || "guided",
                startTime: String(s.startTime || now),
                endTime: s.endTime ? String(s.endTime) : undefined,
                durationSeconds: Number(s.durationSeconds) || 0,
                exercises: Array.isArray(s.exercises) ? (s.exercises as WorkoutSession["exercises"]) : [],
                completed: Boolean(s.completed),
                notes: s.notes ? String(s.notes) : undefined,
                createdAt: String(s.createdAt || s.startTime || now),
                modifiedAt: String(s.modifiedAt || now),
                version: Number(s.version || 1),
                deleted: Boolean(s.deleted || false),
              };
              await db.sessions.put(session);
              await enqueueSync("WorkoutSession", session.id, "create", session);
            }
          }
        }

        oldDb.close();
      } catch (err) {
        console.warn(`[DB Migration] Notice for ${dbName}:`, err);
      }
    }
  } catch (err) {
    console.warn("[DB Migration] Overall migration notice:", err);
  }
}

// Clean up historical dummy seed entries and trigger legacy migration once on load
if (typeof window !== "undefined") {
  setTimeout(() => {
    db.weights.delete("w-xam-1").catch(() => {});
    db.weights.delete("w-xam-2").catch(() => {});
    db.sessions.delete("d061a9cb-817d-4ad6-aeaa-b3629d74caf1").catch(() => {});
    migrateLegacyDatabases().catch(() => {});
  }, 100);
}

// =========================================================
// Syncable entity helpers
// =========================================================

export function makeSyncable(ownerUserId?: string, overrides: Partial<{
  id: string;
  clientId: string;
  createdAt: string;
  modifiedAt: string;
  version: number;
}> = {}): {
  id: string;
  clientId: string;
  ownerUserId: string;
  createdAt: string;
  modifiedAt: string;
  version: number;
} {
  return {
    id: overrides.id || generateId(),
    clientId: overrides.clientId || getClientId(),
    ownerUserId: ownerUserId || getActiveUserId() || "xam-seed-id",
    createdAt: overrides.createdAt || nowIso(),
    modifiedAt: overrides.modifiedAt || nowIso(),
    version: overrides.version ?? 1,
  };
}

export function bumpVersion(entity: { version: number; modifiedAt: string }) {
  return {
    version: entity.version + 1,
    modifiedAt: nowIso(),
  };
}

// =========================================================
// Sessions
// =========================================================

export async function saveSession(
  session: WorkoutSession,
  targetUserId?: string,
): Promise<void> {
  const ownerUserId = targetUserId || getActiveUserId() || "xam-seed-id";
  const clientId = getClientId();
  const now = nowIso();

  const enriched: WorkoutSession = {
    ...session,
    ownerUserId,
    clientId,
    createdAt: session.createdAt || now,
    modifiedAt: now,
    version: (session.version || 0) + 1,
  };

  await db.sessions.put(enriched);
  await enqueueSync("WorkoutSession", enriched.id, enriched.version > 1 ? "update" : "create", enriched);
}

export async function getSessions(targetUserId?: string): Promise<WorkoutSession[]> {
  const activeUser = targetUserId || getActiveUserId();
  try {
    const all = await db.sessions.toArray();
    const nonDeleted = all.filter((s) => !s.deleted);

    let matching: (WorkoutSession & LegacySession)[];
    if (activeUser) {
      matching = nonDeleted.filter((s) =>
        s.ownerUserId === activeUser ||
        s.userId === activeUser ||
        s.ownerUserId === "xam-seed-id" ||
        !s.ownerUserId
      );

      // Auto-adopt orphans to the active user in background
      const orphans = matching.filter((s) => s.ownerUserId !== activeUser);
      if (orphans.length > 0) {
        const adopted = orphans.map((s) => ({
          ...s,
          ownerUserId: activeUser,
          modifiedAt: nowIso(),
          version: (s.version || 1) + 1,
        }));
        db.sessions.bulkPut(adopted).catch(console.error);
        for (const item of adopted) {
          enqueueSync("WorkoutSession", item.id, "update", item).catch(() => {});
        }
      }
    } else {
      matching = nonDeleted;
    }

    matching.sort((a, b) => (b.startTime || "").localeCompare(a.startTime || ""));
    return matching;
  } catch (err) {
    console.error("Error getting sessions from db:", err);
    return [];
  }
}

export async function getSessionById(id: string): Promise<WorkoutSession | undefined> {
  return db.sessions.get(id);
}

export async function deleteSession(id: string): Promise<void> {
  const session = await db.sessions.get(id);
  if (!session) return;
  const updated = {
    ...session,
    deleted: true,
    modifiedAt: nowIso(),
    version: session.version + 1,
  };
  await db.sessions.put(updated);
  await enqueueSync("WorkoutSession", id, "delete", { id });
}

export async function deleteExerciseFromSession(
  sessionId: string,
  exerciseIndex: number,
): Promise<boolean> {
  const session = await db.sessions.get(sessionId);
  if (!session) return false;
  if (!session.exercises || session.exercises.length <= 1) {
    await deleteSession(sessionId);
    return true;
  }
  const updatedExercises = [...session.exercises];
  updatedExercises.splice(exerciseIndex, 1);
  const updated = {
    ...session,
    exercises: updatedExercises,
    modifiedAt: nowIso(),
    version: session.version + 1,
  };
  await db.sessions.put(updated);
  await enqueueSync("WorkoutSession", sessionId, "update", updated);
  return true;
}

export async function clearAllSessions(targetUserId?: string): Promise<void> {
  const ownerUserId = targetUserId || getActiveUserId() || "xam-seed-id";
  const userSessions = await db.sessions.where("ownerUserId").equals(ownerUserId).toArray();
  const updates = userSessions.map((s) => ({
    ...s,
    deleted: true,
    modifiedAt: nowIso(),
    version: s.version + 1,
  }));
  await db.sessions.bulkPut(updates);
  for (const s of userSessions) {
    await enqueueSync("WorkoutSession", s.id, "delete", { id: s.id });
  }
}

// =========================================================
// Weights
// =========================================================

export async function saveWeight(entry: WeightEntry, targetUserId?: string): Promise<void> {
  const ownerUserId = targetUserId || getActiveUserId() || "xam-seed-id";
  const enriched: WeightEntry = {
    ...entry,
    ownerUserId,
    clientId: getClientId(),
    createdAt: entry.createdAt || nowIso(),
    modifiedAt: nowIso(),
    version: (entry.version || 0) + 1,
  };
  await db.weights.put(enriched);
  await enqueueSync("WeightEntry", enriched.id, enriched.version > 1 ? "update" : "create", enriched);
}

export async function getWeights(targetUserId?: string): Promise<WeightEntry[]> {
  const activeUser = targetUserId || getActiveUserId();
  try {
    const all = await db.weights.toArray();
    const nonDeleted = all.filter((w) => !w.deleted);

    let matching: (WeightEntry & LegacyWeight)[];
    if (activeUser) {
      matching = nonDeleted.filter((w) =>
        w.ownerUserId === activeUser ||
        w.userId === activeUser ||
        w.ownerUserId === "xam-seed-id" ||
        !w.ownerUserId
      );

      // Auto-adopt orphans to the active user in background
      const orphans = matching.filter((w) => w.ownerUserId !== activeUser);
      if (orphans.length > 0) {
        const adopted = orphans.map((w) => ({
          ...w,
          ownerUserId: activeUser,
          modifiedAt: nowIso(),
          version: (w.version || 1) + 1,
        }));
        db.weights.bulkPut(adopted).catch(console.error);
        for (const item of adopted) {
          enqueueSync("WeightEntry", item.id, "update", item).catch(() => {});
        }
      }
    } else {
      matching = nonDeleted;
    }

    matching.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return matching;
  } catch (err) {
    console.error("Error getting weights from db:", err);
    return [];
  }
}

export async function getWeightById(id: string): Promise<WeightEntry | undefined> {
  return db.weights.get(id);
}

export async function deleteWeight(id: string): Promise<void> {
  const entry = await db.weights.get(id);
  if (!entry) return;
  const updated = { ...entry, deleted: true, modifiedAt: nowIso(), version: entry.version + 1 };
  await db.weights.put(updated);
  await enqueueSync("WeightEntry", id, "delete", { id });
}

export async function getWeightStats(targetUserId?: string) {
  const userWeights = await getWeights(targetUserId);
  if (userWeights.length === 0) return null;
  const sorted = [...userWeights].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((w) => w.weight);
  const current = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : current;
  return {
    entries: sorted.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    current,
    previous,
    diff: Number((current - previous).toFixed(1)),
    history: sorted,
  };
}

// =========================================================
// Profile
// =========================================================

export async function saveProfile(profile: UserProfile): Promise<void> {
  const enriched: UserProfile = {
    ...profile,
    clientId: getClientId(),
    modifiedAt: nowIso(),
    version: (profile.version || 0) + 1,
  };
  await db.profiles.put(enriched);
  await enqueueSync("UserProfile", enriched.id, enriched.version > 1 ? "update" : "create", enriched);
}

export async function getProfile(userId?: string): Promise<UserProfile | undefined> {
  const target = userId || getActiveUserId() || "xam-seed-id";
  const profile = await db.profiles.where("userId").equals(target).first();
  if (profile) return profile;
  return db.profiles.toCollection().first();
}

// =========================================================
// Plans
// =========================================================

export async function savePlan(plan: Plan): Promise<void> {
  const version = (plan.version || 0) + 1;
  const enriched: Plan = {
    ...plan,
    clientId: getClientId(),
    modifiedAt: nowIso(),
    version,
  };
  await db.plans.put(enriched);
  await enqueueSync("Plan", enriched.id ?? generateId(), version > 1 ? "update" : "create", enriched);
}

export async function getPlans(ownerUserId?: string): Promise<Plan[]> {
  const target = ownerUserId || getActiveUserId() || "xam-seed-id";
  return db.plans.where("ownerUserId").equals(target).and((p) => !p.deleted).toArray();
}

export async function getActivePlan(ownerUserId?: string): Promise<Plan | undefined> {
  const target = ownerUserId || getActiveUserId() || "xam-seed-id";
  return db.plans.where({ ownerUserId: target, active: true }).first();
}

// =========================================================
// Sync queue
// =========================================================

export async function enqueueSync(
  entityType: string,
  entityId: string,
  operation: "create" | "update" | "delete",
  payload: unknown,
): Promise<void> {
  const ownerUserId = getActiveUserId() || "xam-seed-id";
  const existing = await db.syncQueue
    .where({ entityType, entityId })
    .filter((item) => item.operation !== "delete")
    .first();

  if (existing && operation !== "delete") {
    const updated: SyncQueueItem = {
      ...existing,
      operation,
      payload,
      modifiedAt: nowIso(),
      version: existing.version + 1,
    };
    await db.syncQueue.put(updated);
    return;
  }

  const item: SyncQueueItem = {
    ...makeSyncable(ownerUserId),
    entityType,
    entityId,
    operation,
    payload,
    attempts: 0,
  };
  await db.syncQueue.put(item);
}

export async function getSyncQueue(ownerUserId?: string): Promise<SyncQueueItem[]> {
  const target = ownerUserId || getActiveUserId() || "xam-seed-id";
  return db.syncQueue.where("ownerUserId").equals(target).sortBy("modifiedAt");
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function updateSyncAttempt(
  id: string,
  error?: string,
): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (!item) return;
  await db.syncQueue.put({
    ...item,
    attempts: item.attempts + 1,
    lastError: error,
    modifiedAt: nowIso(),
  });
}

export async function getSyncState(ownerUserId?: string): Promise<SyncState | undefined> {
  const target = ownerUserId || getActiveUserId() || "xam-seed-id";
  return db.syncState.where("ownerUserId").equals(target).first();
}

export async function saveSyncState(state: SyncState): Promise<void> {
  await db.syncState.put({
    ...state,
    clientId: getClientId(),
    modifiedAt: nowIso(),
  });
}

// =========================================================
// Routines / Exercises (local edits and community clones)
// =========================================================

export async function saveRoutine(routine: Routine): Promise<void> {
  const version = (routine.version || 0) + 1;
  const enriched: Routine = {
    ...routine,
    clientId: getClientId(),
    modifiedAt: nowIso(),
    version,
  };
  await db.routines.put(enriched);
  await enqueueSync("Routine", enriched.id ?? generateId(), version > 1 ? "update" : "create", enriched);
}

export async function getRoutines(ownerUserId?: string): Promise<Routine[]> {
  const target = ownerUserId || getActiveUserId() || "xam-seed-id";
  return db.routines.where("ownerUserId").equals(target).and((r) => !r.deleted).toArray();
}

export async function saveExercise(exercise: Exercise): Promise<void> {
  const version = (exercise.version || 0) + 1;
  const enriched: Exercise = {
    ...exercise,
    clientId: getClientId(),
    modifiedAt: nowIso(),
    version,
  };
  await db.exercises.put(enriched);
  await enqueueSync("Exercise", enriched.id, version > 1 ? "update" : "create", enriched);
}

export async function getExercises(ownerUserId?: string): Promise<Exercise[]> {
  const target = ownerUserId || getActiveUserId() || "xam-seed-id";
  return db.exercises.where("ownerUserId").equals(target).and((e) => !e.deleted).toArray();
}

// Legacy aliases for gradual migration
export type LocalSession = WorkoutSession;
export type LocalWeightEntry = WeightEntry;
