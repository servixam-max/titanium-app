/**
 * Plan semanal por día de la semana.
 *
 * El sistema anterior repartía los días con un contador
 * (`completados % schedule.length`), así que la sesión de hoy dependía de
 * cuántos entrenos llevabas hechos, no de qué día es. Si el plan dice
 * "lunes Día 1, martes Día 2", un jueves debía salir descanso o el día que
 * tocara, no lo que cayera por el contador.
 *
 * Aquí el plan se define por día de la semana (1 = lunes … 7 = domingo) y cada
 * entrada puede ser:
 *   - un día de entreno concreto (1-18),
 *   - `null` → descanso,
 *   - varios días → sesión doble.
 *
 * También distingue descanso *obligatorio* de *opcional*: el opcional deja al
 * usuario entrenar si le apetece, y la app se lo ofrece sin imponerlo.
 */

export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Qué toca un día de la semana. */
export interface EntradaSemanal {
  /** Días de rutina a hacer (1-18). Vacío = descanso. */
  dias: number[];
  /** En descanso: ¿se puede entrenar igualmente? */
  descansoOpcional?: boolean;
  /** Texto corto para la UI ("Descanso", "Descanso opcional"...). */
  etiqueta?: string;
}

export interface PlanSemanal {
  id: string;
  name: string;
  description: string;
  /** Días de entreno por semana (sin contar descansos). */
  daysPerWeek: number;
  weeks: number;
  /** Qué toca cada día de la semana. Clave: 1=lunes … 7=domingo. */
  week: Record<DiaSemana, EntradaSemanal>;
  tags: string[];
  recommended?: boolean;
  /** Por qué se recomienda, en una línea (se muestra en la UI). */
  recomendacion?: string;
}

/** Día de la semana ISO-8601: lunes=1 … domingo=7. */
export function diaSemanaIso(fecha: Date = new Date()): DiaSemana {
  const js = fecha.getDay(); // 0=domingo … 6=sábado
  return (js === 0 ? 7 : js) as DiaSemana;
}

export interface SesionDeHoy {
  /** Días de rutina a entrenar hoy (vacío si descanso). */
  dias: number[];
  esDescanso: boolean;
  /** Descanso pero se puede entrenar si se quiere. */
  descansoOpcional: boolean;
  /** Texto para la cabecera de la pantalla. */
  etiqueta: string;
  /** Explicación de por qué toca eso hoy. */
  motivo: string;
}

const NOMBRES_DIA: Record<DiaSemana, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

/** Qué toca hoy según el plan. Sin plan, devuelve la sesión recomendada base. */
export function sesionDeHoy(
  plan: PlanSemanal | null | undefined,
  fecha: Date = new Date(),
): SesionDeHoy {
  const dia = diaSemanaIso(fecha);

  if (!plan) {
    return {
      dias: [],
      esDescanso: true,
      descansoOpcional: true,
      etiqueta: "Elige un plan",
      motivo: "Aún no has elegido plan: elige uno para saber qué te toca cada día.",
    };
  }

  const entrada = plan.week[dia];
  const nombreDia = NOMBRES_DIA[dia];

  if (!entrada || entrada.dias.length === 0) {
    const opcional = Boolean(entrada?.descansoOpcional);
    return {
      dias: [],
      esDescanso: true,
      descansoOpcional: opcional,
      etiqueta: opcional ? "Descanso opcional" : "Descanso",
      motivo: opcional
        ? `${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)} es descanso en «${plan.name}», pero puedes entrenar si te apetece.`
        : `Hoy toca descansar: ${nombreDia} es descanso en «${plan.name}».`,
    };
  }

  const etiqueta = entrada.etiqueta || (entrada.dias.length > 1 ? "Sesión doble" : "Entrenamiento");
  return {
    dias: entrada.dias,
    esDescanso: false,
    descansoOpcional: false,
    etiqueta,
    motivo: `${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)} toca ${entrada.dias
      .map((d) => `Día ${d}`)
      .join(" + ")} en «${plan.name}».`,
  };
}

/**
 * ¿Ya está hecho el entreno de hoy?
 *
 * Sirve para no repetir la sesión si el usuario ya la registró: la home debe
 * decir "hecho" en vez de volver a proponer lo mismo.
 */
export function yaEntrenadoHoy(
  plan: PlanSemanal | null | undefined,
  routineIdsCompletadosHoy: number[],
  fecha: Date = new Date(),
): boolean {
  const hoy = sesionDeHoy(plan, fecha);
  if (hoy.dias.length === 0) return false;
  return hoy.dias.every((d) => routineIdsCompletadosHoy.includes(d));
}
