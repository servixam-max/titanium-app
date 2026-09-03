import Dexie, { Table } from "dexie";
import { WorkoutSession, WeightEntry } from "./types";
import { getActiveUserId } from "./auth";

export interface LocalSession extends WorkoutSession {
  userId?: string;
  synced?: boolean;
  syncError?: string;
}

export interface LocalWeightEntry extends WeightEntry {
  userId?: string;
  synced?: boolean;
}

class TitaniumDatabase extends Dexie {
  sessions!: Table<LocalSession, string>;
  weights!: Table<LocalWeightEntry, string>;

  constructor() {
    super("titanium-db");
    this.version(1).stores({
      sessions: "id, routineId, mode, startTime, completed, synced",
      weights: "id, date, synced",
    });
    this.version(2).stores({
      sessions: "id, userId, routineId, mode, startTime, completed, synced",
      weights: "id, userId, date, synced",
    }).upgrade(async (tx) => {
      await tx.table("sessions").toCollection().modify((session) => {
        if (!session.userId) session.userId = "xam-seed-id";
      });
      await tx.table("weights").toCollection().modify((weight) => {
        if (!weight.userId) weight.userId = "xam-seed-id";
      });
    });
  }
}

export const db = new TitaniumDatabase();

// Clean up any historical dummy seed entries once on load
if (typeof window !== "undefined") {
  setTimeout(() => {
    db.weights.delete("w-xam-1").catch(() => {});
    db.weights.delete("w-xam-2").catch(() => {});
    db.sessions.delete("d061a9cb-817d-4ad6-aeaa-b3629d74caf1").catch(() => {});
  }, 100);
}

export async function saveSession(session: WorkoutSession, targetUserId?: string): Promise<void> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  await db.sessions.put({ ...session, userId, synced: false });
}

export async function getSessions(targetUserId?: string): Promise<LocalSession[]> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  const all = await db.sessions.orderBy("startTime").reverse().toArray();
  // Filter for this user's data; if user is XAM, also include legacy records without userId
  return all.filter((s) => s.userId === userId || (!s.userId && userId === "xam-seed-id"));
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

export async function deleteExerciseFromSession(
  sessionId: string,
  exerciseIndex: number
): Promise<boolean> {
  const session = await db.sessions.get(sessionId);
  if (!session) return false;
  if (!session.exercises || session.exercises.length <= 1) {
    // If only 1 exercise left in session, deleting the exercise deletes the session
    await db.sessions.delete(sessionId);
    return true;
  }
  const updatedExercises = [...session.exercises];
  updatedExercises.splice(exerciseIndex, 1);
  await db.sessions.update(sessionId, { exercises: updatedExercises });
  return true;
}

export async function clearAllSessions(targetUserId?: string): Promise<void> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  const userSessions = await getSessions(userId);
  const ids = userSessions.map((s) => s.id);
  await db.sessions.bulkDelete(ids);
}

export async function saveWeight(entry: WeightEntry, targetUserId?: string): Promise<void> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  await db.weights.put({ ...entry, userId, synced: false });
}

export async function getWeights(targetUserId?: string): Promise<LocalWeightEntry[]> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  const all = await db.weights.orderBy("date").reverse().toArray();
  return all.filter((w) => w.userId === userId || (!w.userId && userId === "xam-seed-id"));
}

export async function deleteWeight(id: string): Promise<void> {
  await db.weights.delete(id);
}

export async function getWeightStats(targetUserId?: string) {
  const userWeights = await getWeights(targetUserId);
  if (userWeights.length === 0) return null;
  // Sort chronologically ascending for stats
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
