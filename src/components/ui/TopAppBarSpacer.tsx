/**
 * Espaciador para la TopAppBar fija.
 *
 * La TopAppBar se posiciona con `fixed`, así que no ocupa sitio en el flujo y
 * el contenido arranca debajo de ella. Sin reservar su hueco, el saludo, la
 * racha y las primeras tarjetas quedaban tapados por la barra.
 *
 * La barra real mide 48 px (`h-touch-target-min`) y además consume el inset de
 * la barra de estado con `safe-top`; aquí se replica exactamente lo mismo. El
 * inset en el APK es 0 porque Capacitor ya deja el WebView por debajo de la
 * barra de estado, por eso no se duplica el hueco.
 */
export default function TopAppBarSpacer() {
  return (
    <div
      aria-hidden="true"
      data-top-app-bar-spacer=""
      className="pointer-events-none w-full flex-shrink-0"
      style={{ height: 48 }}
    />
  );
}
