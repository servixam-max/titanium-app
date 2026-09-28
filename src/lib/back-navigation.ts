/**
 * Decisión del gesto/botón ATRÁS de Android (F4.3).
 *
 * Vive aparte del componente para poder probarse sin WebView ni Capacitor:
 * la lógica de "qué debe hacer atrás" es pura y es donde están los errores
 * reales (cerrar la app en vez de retroceder).
 */

export type BackAction = "close-modal" | "history-back" | "go-home" | "exit";

export interface BackContext {
  /** ¿El WebView puede retroceder? Lo dice el plugin nativo. */
  canGoBack: boolean;
  /** Longitud del historial del WebView como respaldo. */
  historyLength: number;
  /** Ruta actual de la app. */
  pathname: string;
  /** ¿Hay un modal/diálogo abierto encima? */
  hasOpenModal: boolean;
}

/**
 * Orden de prioridad:
 *  1. Modal abierto → se cierra el modal (no se navega ni se sale).
 *  2. Hay historial → retroceder dentro de la app.
 *  3. Sin historial y fuera de la home → volver a la home.
 *  4. En la home sin historial → salir (es lo que espera cualquiera).
 */
export function decideBackAction({
  canGoBack,
  historyLength,
  pathname,
  hasOpenModal,
}: BackContext): BackAction {
  if (hasOpenModal) return "close-modal";
  if (canGoBack || historyLength > 1) return "history-back";
  if (pathname !== "/") return "go-home";
  return "exit";
}
