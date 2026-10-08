/**
 * Descansos recomendados según el tipo de ejercicio.
 *
 * Antes el catálogo usaba 75 s para casi todo (y 20 s en los HIIT, sin criterio
 * por músculo). Eso no tiene sentido fisiológico: una sentadilla pesada necesita
 * recuperar el sistema nervioso, mientras que un curl de bíceps o una elevación
 * lateral se recuperan mucho antes.
 *
 * Criterio (basado en el tamaño del grupo muscular y el coste sistémico):
 *  - Pierna pesada (sentadilla, peso muerto, hip thrust, búlgara, zancada,
 *    step up): 120 s — es el mayor reclutamiento y el que más tarda en recuperar.
 *  - Empuje/tracción multiarticular (press banca, remo, press militar, fondos,
 *    dominadas): 90 s.
 *  - Aislamiento y accesorios (curl, extensión, elevación lateral, pájaro,
 *    aperturas, patada, gemelos): 60 s.
 *  - Isométricos (plancha, wall sit, hollow): 45-60 s.
 *  - Metabólico / HIIT / pliométrico (burpee, thruster, jump, mountain climber,
 *    swing, snatch): 30-45 s, porque el objetivo es el pulso, no la fuerza.
 *  - Movilidad y respiración: 15-30 s.
 *
 * La función es pura y está probada: el catálogo y las sesiones la comparten.
 */

export type RestCategoria =
  | "pierna-pesada"
  | "multiarticular"
  | "aislamiento"
  | "isometrico"
  | "core"
  | "metabolico"
  | "movilidad";

interface Regla {
  categoria: RestCategoria;
  patron: RegExp;
  segundos: number;
}

/**
 * Orden importante: se aplica la PRIMERA regla que casa. Lo específico va antes
 * que lo genérico (p. ej. "sentadilla con salto" es metabólico, no pierna
 * pesada; por eso las pliometrías van antes).
 */
const REGLAS: Regla[] = [
  // --- Metabólico / pliométrico primero: un salto no pide 2 min de descanso ---
  {
    categoria: "metabolico",
    patron:
      /salto|jump|pliométric|pliometric|plyo|burpee|thruster|devil|man maker|snatch|clean|swing|high knee|rodilla|mountain climber|escalador|skater|patinador|jumping jack|boxeo|shadow|tabata|sprint|sprint/i,
    segundos: 30,
  },
  // --- Pierna pesada ---
  {
    categoria: "pierna-pesada",
    patron:
      /sentadilla|squat|peso muerto|deadlift|hip thrust|puente de glúteo|glute bridge|búlgara|bulgarian|zancada|lunge|cossack|cosaca|step up|paso al cajón|sumo|goblet|pistol/i,
    segundos: 120,
  },
  // --- Multiarticular de torso ---
  {
    categoria: "multiarticular",
    patron:
      /press (de )?banca|bench press|floor press|press inclinado|incline|press militar|military|press arnold|arnold|push press|remo|row|dominada|pull.?up|jalón|lat pulldown|fondos|dip|flexiones|push.?up|pike/i,
    segundos: 90,
  },
  // --- Isométricos ---
  {
    categoria: "isometrico",
    patron: /plancha|plank|hollow|wall sit|isométric|isometric|puente|hold|sostén|estátic|estatic/i,
    segundos: 60,
  },
  // --- Core dinámico ---
  {
    categoria: "core",
    patron:
      /crunch|abdominal|bicicleta|bicycle|russian|giro|leñador|woodchop|elevación de piernas|leg raise|jack ?knife/i,
    segundos: 60,
  },
  // --- Aislamiento / accesorios ---
  {
    categoria: "aislamiento",
    patron:
      /curl|extensión|extension|tríceps|triceps|patada|kickback|elevación|elevacion|lateral|pájaro|pajaro|reverse fly|apertura|fly|flye|shrug|encogimiento|gemelo|calf|antebrazo|forearm|farmer|granjero/i,
    segundos: 60,
  },
  // --- Movilidad / respiración ---
  {
    categoria: "movilidad",
    patron:
      /movilidad|rotación|rotacion|estiramiento|stretch|respiración|respiracion|relajación|relajacion|calentamiento|warm.?up|activación|activacion/i,
    segundos: 30,
  },
];

/** Descanso recomendado en segundos para un ejercicio, por su nombre. */
export function descansoRecomendado(
  nombre: string,
  categoria?: string | null,
): { segundos: number; categoria: RestCategoria } {
  const n = (nombre || "").toLowerCase();

  for (const regla of REGLAS) {
    if (regla.patron.test(n)) {
      return { segundos: regla.segundos, categoria: regla.categoria };
    }
  }

  // Sin coincidencia por nombre: se usa la categoría del ejercicio si existe.
  const c = (categoria || "").toLowerCase();
  if (c === "legs") return { segundos: 120, categoria: "pierna-pesada" };
  if (c === "chest" || c === "back" || c === "shoulders") {
    return { segundos: 90, categoria: "multiarticular" };
  }
  if (c === "biceps" || c === "triceps" || c === "arms") {
    return { segundos: 60, categoria: "aislamiento" };
  }
  if (c === "core") return { segundos: 60, categoria: "core" };
  if (c === "full_body") return { segundos: 45, categoria: "metabolico" };

  return { segundos: 75, categoria: "multiarticular" };
}
