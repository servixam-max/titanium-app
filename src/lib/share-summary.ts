// FORTIXAM — compartir el resumen del entrenamiento (F2.5).
//
// La mejora del día: poder enviar la sesión recién terminada a quien se quiera.
// El camino preferido es la Web Share API (la hoja nativa del sistema); como el
// WebView de Android no la implementa, el plan B —copiar al portapapeles— es el
// que se usa de verdad dentro del APK. Queda como último recurso el modo
// antiguo (`execCommand`) para WebViews sin Clipboard API.
//
// Todo lo que se puede decidir sin React vive aquí, para probarlo sin WebView:
// el texto del resumen, el formato determinista de las cifras (sin depender del
// ICU del dispositivo) y la cadena de intentos compartir → copiar → copiar.

export interface ShareSessionLike {
  routineId?: string | number | null;
  routineName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  exercises?: Array<{
    sets?: Array<{ weight?: number | null; reps?: number | null }> | null;
  } | null> | null;
}

export interface WorkoutSummaryStats {
  /** Minutos redondeados, o `null` si no hay tiempos válidos. */
  minutes: number | null;
  sets: number;
  reps: number;
  volumeKg: number;
}

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/** Miles con punto: 6420 → "6.420". Determinista, sin separadores del ICU. */
export function formatThousands(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Fecha corta en español: "2 oct 2026". Cadena vacía si no es válida. */
export function formatWorkoutSummaryDate(
  iso: string | null | undefined,
): string {
  if (typeof iso !== "string" || iso.length === 0) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MESES_CORTOS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Cifras del resumen: duración, series, reps y volumen (peso × reps). */
export function computeWorkoutSummaryStats(
  session: ShareSessionLike | null | undefined,
): WorkoutSummaryStats {
  const exercises = session?.exercises ?? [];
  let sets = 0;
  let reps = 0;
  let volumeKg = 0;

  for (const exercise of exercises) {
    for (const set of exercise?.sets ?? []) {
      if (!set) continue;
      sets += 1;
      const setReps =
        typeof set.reps === "number" && Number.isFinite(set.reps)
          ? set.reps
          : 0;
      const setWeight =
        typeof set.weight === "number" && Number.isFinite(set.weight)
          ? set.weight
          : 0;
      reps += setReps;
      volumeKg += setWeight * setReps;
    }
  }

  let minutes: number | null = null;
  if (session?.startTime && session?.endTime) {
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      minutes = Math.round((end - start) / 60_000);
    }
  }

  return { minutes, sets, reps, volumeKg };
}

/** Texto listo para enviar por WhatsApp, Telegram o donde se quiera. */
export function buildWorkoutSummary(
  session: ShareSessionLike | null | undefined,
  options: { routineTitle?: string | null } = {},
): string {
  const stats = computeWorkoutSummaryStats(session);
  const title =
    options.routineTitle?.trim() ||
    session?.routineName?.trim() ||
    (session?.routineId !== undefined && session?.routineId !== null
      ? `Día ${session.routineId}`
      : "Entrenamiento");

  const metrics: string[] = [];
  if (stats.minutes !== null) {
    metrics.push(
      stats.minutes > 0 ? `⏱️ ${stats.minutes} min` : "⏱️ menos de 1 min",
    );
  }
  if (stats.sets > 0) metrics.push(`🔢 ${stats.sets} series`);
  if (stats.reps > 0) metrics.push(`💯 ${formatThousands(stats.reps)} reps`);
  if (stats.volumeKg > 0) {
    metrics.push(`🏋️ ${formatThousands(stats.volumeKg)} kg`);
  }

  const date = formatWorkoutSummaryDate(session?.endTime ?? session?.startTime);

  const lines = ["¡Entreno completado en FORTIXAM! 💪", title];
  if (metrics.length > 0) lines.push(metrics.join(" · "));
  if (date) lines.push(date);
  return lines.join("\n");
}

// =========================================================
// Cadena de intentos: compartir → portapapeles → copia antigua
// =========================================================

export interface SharePayload {
  text: string;
  title?: string;
  url?: string;
}

/** Lo que el entorno (navegador/WebView) puede ofrecer, inyectable en pruebas. */
export interface ShareEnvironment {
  share?: ((data: SharePayload) => Promise<void>) | null;
  clipboard?: { writeText: (text: string) => Promise<void> } | null;
  legacyCopy?: ((text: string) => boolean) | null;
}

export type ShareOutcome =
  | { method: "web-share"; status: "shared" | "cancelled" }
  | { method: "clipboard" | "legacy-copy"; status: "copied" }
  | { method: "none"; status: "failed" };

/**
 * ¿El error es solo "el usuario cerró la hoja de compartir"? Cancelar no es un
 * fallo: no debe enseñarse ningún aviso ni caer al portapapeles.
 */
export function isShareAbort(error: unknown): boolean {
  return (error as { name?: unknown } | null | undefined)?.name === "AbortError";
}

/** Copia con el modo antiguo (WebViews sin Clipboard API). */
export function legacyCopyText(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Lo que ofrece el entorno real; en pruebas se pasa a mano. */
export function resolveShareEnvironment(): ShareEnvironment {
  if (typeof navigator === "undefined") return {};
  const nav = navigator;
  const env: ShareEnvironment = {};
  if (typeof nav.share === "function") {
    env.share = (data) => nav.share!(data);
  }
  if (nav.clipboard && typeof nav.clipboard.writeText === "function") {
    env.clipboard = nav.clipboard;
  }
  if (typeof document !== "undefined") {
    env.legacyCopy = legacyCopyText;
  }
  return env;
}

/**
 * Intenta compartir y, si no hay hoja nativa (caso normal en el APK), copia el
 * texto. Devuelve qué camino se usó y cómo terminó, para que la interfaz pueda
 * decir la verdad ("compartido", "copiado", "no se pudo").
 */
export async function shareSummaryText(
  text: string,
  environment?: ShareEnvironment,
): Promise<ShareOutcome> {
  const env = environment ?? resolveShareEnvironment();

  if (env.share) {
    try {
      await env.share({ text, title: "FORTIXAM" });
      return { method: "web-share", status: "shared" };
    } catch (error) {
      if (isShareAbort(error)) {
        return { method: "web-share", status: "cancelled" };
      }
      // Error real (permiso, sin destinos...): se intenta el portapapeles.
    }
  }

  if (env.clipboard) {
    try {
      await env.clipboard.writeText(text);
      return { method: "clipboard", status: "copied" };
    } catch {
      // Sin permiso o sin API real: queda el modo antiguo.
    }
  }

  if (env.legacyCopy && env.legacyCopy(text)) {
    return { method: "legacy-copy", status: "copied" };
  }

  return { method: "none", status: "failed" };
}
