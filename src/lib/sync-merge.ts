// FORTIXAM — merge de entidades en la sincronización
//
// Reglas (last-write-wins con protección de datos locales):
//  1. Si no hay copia local, se inserta la del servidor.
//  2. Si el servidor marca `deleted`, se propaga el borrado.
//  3. Si la copia local es MÁS NUEVA que la del servidor, no se toca.
//  4. Si el servidor gana, se hace merge superficial (se conservan los campos
//     locales que el servidor no envía).
//  5. Caso especial WorkoutSession: el detalle (exercises) nunca se pierde por
//     un payload del servidor vacío o ausente. Fue el bug que borraba series.

export type MergeAction = "insert" | "update" | "skip";

export interface MergeResult<T> {
  action: MergeAction;
  entity: T;
  reason?: string;
}


function timeOf(entity: Record<string, unknown> | null): number {
  const raw = entity?.modifiedAt;
  if (typeof raw !== "string") return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** ¿El payload del servidor trae detalle real de ejercicios? */
export function hasExerciseDetail(entity: Record<string, unknown> | null): boolean {
  const exercises = entity?.exercises;
  return Array.isArray(exercises) && exercises.length > 0;
}

export function mergeEntity<T extends Record<string, unknown>>(
  entityType: string,
  local: T | undefined,
  incoming: T,
): MergeResult<T> {
  if (!local) {
    return { action: "insert", entity: incoming };
  }

  if (incoming.deleted === true) {
    return {
      action: "update",
      entity: { ...local, ...incoming, deleted: true } as T,
      reason: "deleted_on_server",
    };
  }

  const localTime = timeOf(local);
  const incomingTime = timeOf(incoming);

  if (localTime > 0 && incomingTime > 0 && localTime > incomingTime) {
    return { action: "skip", entity: local, reason: "local_is_newer" };
  }

  const merged = { ...local, ...incoming } as T;

  if (entityType === "WorkoutSession" && !hasExerciseDetail(incoming) && hasExerciseDetail(local)) {
    (merged as Record<string, unknown>).exercises = (local as Record<string, unknown>).exercises;
  }

  return { action: "update", entity: merged };
}

/**
 * Decide qué hacer con un item de la cola según la respuesta del servidor.
 * Evita dos fallos: perder cambios que el servidor no aplicó, y quedarse en
 * bucle infinito con items que el servidor rechaza siempre.
 */
export interface QueueResolution {
  remove: boolean;
  reason?: string;
  retry?: boolean;
}

export function resolveQueueItem(
  item: { entityType: string; entityId: string; attempts: number },
  serverResponse: {
    applied: Array<{ entityType: string; entityId: string }>;
    skipped: Array<{ entityType: string; entityId: string; reason: string }>;
  },
  maxAttempts = 5,
): QueueResolution {
  const applied = serverResponse.applied.some(
    (a) => a.entityType === item.entityType && a.entityId === item.entityId,
  );
  if (applied) return { remove: true };

  const skipped = serverResponse.skipped.find(
    (s) => s.entityType === item.entityType && s.entityId === item.entityId,
  );

  if (skipped) {
    // El servidor ya tiene una versión igual o más nueva: nada que enviar.
    if (skipped.reason === "server_newer") return { remove: true, reason: skipped.reason };

    // Rechazos definitivos: reintentar no arregla nada.
    if (
      skipped.reason === "unknown_entity_type" ||
      skipped.reason === "invalid_payload" ||
      skipped.reason === "id_owned_by_another_user"
    ) {
      return { remove: true, reason: skipped.reason };
    }

    return { remove: false, retry: true, reason: skipped.reason };
  }

  // No apareció en la respuesta: se conserva para el siguiente intento,
  // pero sin crecer sin límite.
  if (item.attempts + 1 >= maxAttempts) {
    return { remove: true, reason: "max_attempts_reached" };
  }
  return { remove: false, retry: true, reason: "not_acknowledged" };
}
