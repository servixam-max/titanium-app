import Dexie, { Table } from "dexie";
import { WorkoutSession, WeightEntry } from "./types";
import { getActiveUserId, SEED_USER } from "./auth";

export interface LocalSession extends WorkoutSession {
  userId?: string;
  synced?: boolean;
  syncError?: string;
}

export interface LocalWeightEntry extends WeightEntry {
  userId?: string;
  synced?: boolean;
}

// Initial session history for user XAM
const XAM_INITIAL_SESSIONS: LocalSession[] = [
  {
    id: "d061a9cb-817d-4ad6-aeaa-b3629d74caf1",
    userId: "xam-seed-id",
    routineId: 2,
    mode: "guided",
    startTime: new Date("2026-09-02T17:09:38.809Z"),
    endTime: new Date("2026-09-03T09:45:52.152Z"),
    completed: true,
    synced: false,
    exercises: [
      {
        exerciseId: "d2-1",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:21:20.417Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:23:28.921Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:25:35.513Z") },
        ],
      },
      {
        exerciseId: "d2-2",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:29:12.484Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:31:45.305Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:34:12.537Z") },
        ],
      },
      {
        exerciseId: "d2-3",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:36:41.238Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:39:29.356Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:41:51.524Z") },
        ],
      },
      {
        exerciseId: "d2-4",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:44:53.620Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:47:30.616Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:50:03.760Z") },
        ],
      },
      {
        exerciseId: "d2-5",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:53:27.629Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:56:00.689Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-02T17:58:29.001Z") },
        ],
      },
      {
        exerciseId: "d2-6",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T18:02:16.765Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-02T18:05:12.542Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-02T18:07:28.293Z") },
        ],
      },
      {
        exerciseId: "d2-7",
        sets: [
          { setNumber: 1, reps: 10, completed: true, timestamp: new Date("2026-09-02T18:09:48.165Z") },
          { setNumber: 2, reps: 10, completed: true, timestamp: new Date("2026-09-03T09:45:49.605Z") },
          { setNumber: 3, reps: 10, completed: true, timestamp: new Date("2026-09-03T09:45:52.151Z") },
        ],
      },
    ],
  },
];

const XAM_INITIAL_WEIGHTS: LocalWeightEntry[] = [
  {
    id: "w-xam-1",
    userId: "xam-seed-id",
    weight: 78.5,
    date: "2026-08-25",
    created_at: "2026-08-25T08:00:00.000Z",
    synced: true,
  },
  {
    id: "w-xam-2",
    userId: "xam-seed-id",
    weight: 78.1,
    date: "2026-09-01",
    created_at: "2026-09-01T08:00:00.000Z",
    synced: true,
  },
];

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

// Ensure XAM seed data exists if user XAM is querying and DB has no sessions
async function ensureXamSeeded(): Promise<void> {
  try {
    const count = await db.sessions.count();
    if (count === 0) {
      for (const s of XAM_INITIAL_SESSIONS) {
        await db.sessions.put(s);
      }
      for (const w of XAM_INITIAL_WEIGHTS) {
        await db.weights.put(w);
      }
    }
  } catch (err) {
    console.warn("Error seeding XAM initial data:", err);
  }
}

export async function saveSession(session: WorkoutSession, targetUserId?: string): Promise<void> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  await db.sessions.put({ ...session, userId, synced: false });
}

export async function getSessions(targetUserId?: string): Promise<LocalSession[]> {
  const userId = targetUserId || getActiveUserId() || "xam-seed-id";
  if (userId === "xam-seed-id") {
    await ensureXamSeeded();
  }
  const all = await db.sessions.orderBy("startTime").reverse().toArray();
  // Filter for this user's data; if user is XAM, also include legacy records without userId
  return all.filter((s) => s.userId === userId || (!s.userId && userId === "xam-seed-id"));
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
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
  if (userId === "xam-seed-id") {
    await ensureXamSeeded();
  }
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
