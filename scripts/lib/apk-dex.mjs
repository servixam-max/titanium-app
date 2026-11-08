/**
 * FORTIXAM — auditoría del DEX que se publica (F10.3).
 *
 * El defecto de F10.1 no se veía en el código fuente: R8 borraba las
 * anotaciones de Capacitor y `Bridge.getPermissionStates()` se compilaba como
 * un `throw null` literal. El APK pasaba todas las puertas porque ninguna
 * miraba el binario. Estas funciones leen la salida de `dexdump -d` y avisan
 * si el método vuelve a quedarse sin cuerpo de verdad.
 *
 * Puro: no toca disco ni ejecuta nada. Así se puede probar con el volcado
 * real de un APK roto (v8.5.61) y de uno sano (v8.5.63).
 */

/** Nombre del método que Capacitor usa para resolver los permisos de un plugin. */
export const METODO_VIGILADO = "getPermissionStates";

/** Menos instrucciones que esto no puede implementar nada: R8 lo ha vaciado. */
export const MIN_INSTRUCCIONES = 10;

/**
 * Cabecera de un método en `dexdump -d`:
 *   087d1c:   |[087d1c] com.getcapacitor.D.getPermissionStates:()Ljava/util/Map;
 */
const RE_CABECERA = /^\s*[0-9a-f]{6}:\s*\|\[[0-9a-f]+\]\s+([\w.$]+)\.([\w$<>]+):(\([^)]*\)[^\s]+)\s*$/;

/** Línea de instrucción con bytecode: 087d50: 2700   |0012: throw v0 */
const RE_INSTRUCCION = /^\s*[0-9a-f]{6}:.*\|\s*([0-9a-f]{4}):\s*(\S+)\s*(.*)$/;

const MNEMONICOS_CONSTANTE = new Set(["const/4", "const/16", "const", "const/high16"]);
const MNEMONICOS_SIN_DESTINO = /^(invoke-|if-|throw|return|goto|aget|sget|iput|sput|monitor-|check-cast|filled-new-array|nop|move-result|aput|iget|new-instance|new-array|array-length|instance-of)/;

/** Parte la línea por la barra que dibuja dexdump y se queda con el bytecode. */
function leerInstruccion(linea) {
  const m = RE_INSTRUCCION.exec(linea);
  if (!m) return null;
  const [, offset, mnemonico, resto] = m;
  const operandos = resto.split(" // ")[0].trim();
  return { offset, mnemonico, operandos };
}

/** Todos los métodos con bytecode que aparecen en un volcado de dexdump. */
export function extraerMetodos(dump) {
  const lineas = String(dump).split(/\r?\n/);
  const metodos = [];
  let actual = null;

  for (const linea of lineas) {
    const cabecera = RE_CABECERA.exec(linea);
    if (cabecera) {
      actual = {
        clase: cabecera[1],
        nombre: cabecera[2],
        tipo: cabecera[3],
        instrucciones: [],
      };
      metodos.push(actual);
      continue;
    }
    if (!actual) continue;
    const instruccion = leerInstruccion(linea);
    if (instruccion) {
      actual.instrucciones.push(instruccion);
      continue;
    }
    // Cualquier otra cosa (catches, locals, siguiente método…) cierra el cuerpo.
    actual = null;
  }
  return metodos;
}

/** Devuelve el método vigilado, sea cual sea la clase ofuscada donde viva. */
export function buscarMetodoVigilado(metodos, nombre = METODO_VIGILADO) {
  return metodos.find((m) => m.nombre === nombre) ?? null;
}

/**
 * ¿El cuerpo contiene un `throw` de un valor que ya se sabe cero?
 * Es exactamente lo que emite R8 cuando deduce que pluginAnnotation es null:
 *   const/4 v0, #int 0
 *   throw v0
 */
export function buscarThrowNulo(instrucciones) {
  const registrosCero = new Set();
  for (const { mnemonico, operandos } of instrucciones) {
    if (MNEMONICOS_CONSTANTE.has(mnemonico)) {
      const m = /^(v\d+),\s*#(?:int\s+)?0$/.exec(operandos);
      if (m) registrosCero.add(m[1]);
      else {
        const destino = /^(v\d+),/.exec(operandos);
        if (destino) registrosCero.delete(destino[1]);
      }
      continue;
    }
    if (mnemonico === "throw") {
      const registro = operandos.trim();
      if (registrosCero.has(registro)) return true;
      continue;
    }
    // Cualquier escritura en un registro invalida la constante que guardaba.
    if (!MNEMONICOS_SIN_DESTINO.test(mnemonico)) {
      const destino = /^(v\d+),?\s/.exec(operandos + " ");
      if (destino) registrosCero.delete(destino[1]);
    }
  }
  return false;
}

/** Invocaciones del cuerpo, para saber si de verdad consulta los permisos. */
export function invocaciones(instrucciones) {
  return instrucciones
    .filter((i) => i.mnemonico.startsWith("invoke"))
    .map((i) => (/\}(,\s*)?(.*)$/.exec(i.operandos)?.[2] ?? i.operandos).trim());
}

/**
 * Audita un volcado completo.
 * @returns {{ok: boolean, errores: string[], avisos: string[], metodo: object|null}}
 */
export function auditarDexDump(dump, opciones = {}) {
  const nombre = opciones.nombre ?? METODO_VIGILADO;
  const minimo = opciones.minimo ?? MIN_INSTRUCCIONES;
  const errores = [];
  const avisos = [];

  const metodo = buscarMetodoVigilado(extraerMetodos(dump), nombre);
  if (!metodo) {
    errores.push(
      `no aparece ${nombre}() con bytecode en el DEX: no se puede verificar que la app resuelva permisos`,
    );
    return { ok: false, errores, avisos, metodo: null };
  }

  const total = metodo.instrucciones.length;
  if (buscarThrowNulo(metodo.instrucciones)) {
    errores.push(
      `${metodo.clase}.${nombre}() vuelve a compilarse como \`throw null\`: R8 ha borrado las anotaciones de Capacitor`,
    );
  }
  if (total < minimo) {
    errores.push(
      `${metodo.clase}.${nombre}() tiene solo ${total} instrucciones (mínimo ${minimo}): R8 lo ha vaciado`,
    );
  }
  if (!invocaciones(metodo.instrucciones).some((t) => /permissions/i.test(t))) {
    avisos.push(`${metodo.clase}.${nombre}() no invoca a permissions(): revisa que no sea un esqueleto`);
  }

  return { ok: errores.length === 0, errores, avisos, metodo };
}
