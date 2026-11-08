/**
 * Tipos del auditor de DEX (F10.3). El módulo real es `apk-dex.mjs` para que
 * lo pueda ejecutar Node directamente desde el workflow, sin transpilar.
 */

export interface InstruccionDex {
  offset: string;
  mnemonico: string;
  operandos: string;
}

export interface MetodoDex {
  clase: string;
  nombre: string;
  tipo: string;
  instrucciones: InstruccionDex[];
}

export interface ResultadoAuditoria {
  ok: boolean;
  errores: string[];
  avisos: string[];
  metodo: MetodoDex | null;
}

export const METODO_VIGILADO: string;
export const MIN_INSTRUCCIONES: number;

export function extraerMetodos(dump: string): MetodoDex[];
export function buscarMetodoVigilado(metodos: MetodoDex[], nombre?: string): MetodoDex | null;
export function buscarThrowNulo(instrucciones: InstruccionDex[]): boolean;
export function invocaciones(instrucciones: InstruccionDex[]): string[];
export function auditarDexDump(
  dump: string,
  opciones?: { nombre?: string; minimo?: number },
): ResultadoAuditoria;
