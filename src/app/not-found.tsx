import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-container-padding">
      <h1 className="font-display-timer text-display-timer text-primary-container mb-4">
        404
      </h1>
      <p className="font-headline-md text-headline-md text-on-surface mb-8">
        Página no encontrada
      </p>
      <Link
        href="/"
        className="bg-primary-container text-on-primary-container font-headline-md h-touch-target-min px-8 rounded-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
