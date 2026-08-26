import Dexie, { Table } from "dexie";
import { WorkoutSession, WeightEntry } from "./types";

export interface LocalSession extends WorkoutSession {
  synced?: boolean;
  syncError?: string;
}

export interface LocalWeightEntry extends WeightEntry {
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
  }
}

export const db = new TitaniumDatabase();

export async function saveSession(session: WorkoutSession): Promise<void> {
  await db.sessions.put({ ...session, synced: false });
}

export async function getSessions(): Promise<LocalSession[]> {
  return db.sessions.orderBy("startTime").reverse().toArray();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

export async function clearAllSessions(): Promise<void> {
  await db.sessions.clear();
}

export async function saveWeight(entry: WeightEntry): Promise<void> {
  await db.weights.put({ ...entry, synced: false });
}

export async function getWeights(): Promise<LocalWeightEntry[]> {
  return db.weights.orderBy("date").reverse().toArray();
}

export async function deleteWeight(id: string): Promise<void> {
  await db.weights.delete(id);
}

export async function getWeightStats() {
  const weights = await db.weights.orderBy("date").toArray();
  if (weights.length === 0) return null;
  const values = weights.map((w) => w.weight);
  const current = weights[weights.length - 1].weight;
  const previous =
    weights.length > 1 ? weights[weights.length - 2].weight : current;
  return {
    entries: weights.length,
    min: Math.min(...values),
    max: Math.max(...values),
    average: values.reduce((a, b) => a + b, 0) / values.length,
    current,
    previous,
    diff: Number((current - previous).toFixed(1)),
    history: weights,
  };
}
