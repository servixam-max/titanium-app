import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-container-padding">
      <h1 className="font-display-timer text-display-timer text-primary mb-4">
        404
      </h1>
      <p className="font-headline-md text-headline-md text-slate-900 dark:text-white mb-8">
        Página no encontrada
      </p>
      <Link
        href="/"
        className="bg-primary hover:bg-emerald-600 text-white font-bold h-touch-target-min px-8 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
