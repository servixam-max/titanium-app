// Natural Language Parser for Gym Voice Commands (Spanish)
// Extracts reps, weight (kg), RPE and completion commands from spoken voice.

export interface ParsedVoiceWorkout {
  weight?: number;
  reps?: number;
  rpe?: number;
  autoSubmit?: boolean;
  rawText: string;
  matchedFields: ("weight" | "reps" | "rpe" | "autoSubmit")[];
}

const SPANISH_NUMBERS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciséis: 16,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidós: 22,
  veintidos: 22,
  veintitrés: 23,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiséis: 26,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[,;]/g, " ")
    .replace(/\s+/g, " ");
}

function parseSpanishNumeric(str: string): number | null {
  const direct = parseFloat(str.replace(",", "."));
  if (!isNaN(direct)) return direct;
  return SPANISH_NUMBERS[str] ?? null;
}

export function parseWorkoutVoiceCommand(text: string): ParsedVoiceWorkout {
  const normalized = normalizeText(text);
  const matchedFields: ParsedVoiceWorkout["matchedFields"] = [];
  let weight: number | undefined;
  let reps: number | undefined;
  let rpe: number | undefined;
  let autoSubmit = false;

  // 1. Check for auto-submit triggers
  if (
    /(guardar|completar|finalizar|listo|hecho|siguiente serie|serie completada)/i.test(
      normalized
    )
  ) {
    autoSubmit = true;
    matchedFields.push("autoSubmit");
  }

  // 2. Extract RPE (e.g., "rpe 8", "esfuerzo 9", "rpe de 8.5")
  const rpeMatch = normalized.match(/(?:rpe|esfuerzo|intensidad)(?:\s+de)?\s+(\d+(?:[.,]\d+)?)/i);
  if (rpeMatch) {
    const val = parseFloat(rpeMatch[1].replace(",", "."));
    if (val >= 1 && val <= 10) {
      rpe = val;
      matchedFields.push("rpe");
    }
  }

  // 3. Extract Weight (kg / kilos)
  // Handles: "22 kilos", "22.5 kg", "veinte kilos", "17 y medio kilos", "con 30 kg"
  const weightRegex =
    /(?:con\s+)?(\d+(?:[.,]\d+)?|[a-záéíóú]+)(?:\s+y\s+(?:medio|media))?\s*(?:kg|kilos?|kilogramos?)/i;
  const weightMatch = normalized.match(weightRegex);

  if (weightMatch) {
    const rawVal = weightMatch[1];
    let num = parseSpanishNumeric(rawVal);
    if (num !== null) {
      if (weightMatch[0].includes("y medio") || weightMatch[0].includes("y media")) {
        num += 0.5;
      }
      weight = num;
      matchedFields.push("weight");
    }
  }

  // 4. Extract Reps (repeticiones / reps)
  // Handles: "12 repeticiones", "10 reps", "doce reps"
  const repsRegex =
    /(\d+(?:[.,]\d+)?|[a-záéíóú]+)\s*(?:reps?|repeticiones|repeticion)/i;
  const repsMatch = normalized.match(repsRegex);

  if (repsMatch) {
    const rawVal = repsMatch[1];
    const num = parseSpanishNumeric(rawVal);
    if (num !== null) {
      reps = Math.round(num);
      matchedFields.push("reps");
    }
  }

  // 5. Fallback for implicit patterns: e.g. "12 por 20" or "10 a 25" -> (reps x weight)
  if (reps === undefined && weight === undefined) {
    const comboMatch = normalized.match(/(\d+)\s*(?:x|por|a)\s*(\d+(?:[.,]\d+)?)/i);
    if (comboMatch) {
      reps = parseInt(comboMatch[1], 10);
      weight = parseFloat(comboMatch[2].replace(",", "."));
      matchedFields.push("reps", "weight");
    }
  }

  return {
    weight,
    reps,
    rpe,
    autoSubmit,
    rawText: text,
    matchedFields,
  };
}

export function formatVoiceConfirmation(parsed: ParsedVoiceWorkout): string {
  const parts: string[] = [];
  if (parsed.weight !== undefined) {
    parts.push(`${parsed.weight} kilos`);
  }
  if (parsed.reps !== undefined) {
    parts.push(`${parsed.reps} repeticiones`);
  }
  if (parsed.rpe !== undefined) {
    parts.push(`RPE ${parsed.rpe}`);
  }

  if (parts.length === 0) {
    return parsed.autoSubmit ? "Serie completada" : "Comando no reconocido";
  }

  return parts.join(", ") + (parsed.autoSubmit ? ". Guardando serie." : "");
}
