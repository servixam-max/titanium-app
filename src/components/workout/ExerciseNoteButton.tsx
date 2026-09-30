"use client";

import { useState } from "react";
import { NotebookPen, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_NOTE_LENGTH, normalizeNote } from "@/lib/workout-notes";
import { haptics } from "@/lib/haptics";

interface ExerciseNoteButtonProps {
  /** Nota ya guardada del ejercicio (si la hay). */
  note?: string;
  /** Se llama al confirmar (blur o Enter). Vacío = borrar la nota. */
  onSave: (note: string) => void;
  className?: string;
}

/**
 * Nota rápida del ejercicio (F2.1). Vive cerrada como un enlace discreto para
 * no ensuciar la pantalla de entreno: al abrirla aparece un campo de una línea
 * que se guarda solo al salir del campo o al pulsar Enter. La nota viaja con la
 * sesión, así que se ve en el historial.
 */
export default function ExerciseNoteButton({ note, onSave, className }: ExerciseNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [flash, setFlash] = useState<string | null>(null);

  const hasNote = Boolean(normalizeNote(note));

  const openEditor = () => {
    setDraft(note ?? "");
    setOpen(true);
    haptics.light();
  };

  const commit = () => {
    const before = normalizeNote(note);
    const after = normalizeNote(draft);
    onSave(draft);
    setOpen(false);
    setDraft(after ?? "");
    if (after !== before) {
      setFlash(after ? "Nota guardada" : "Nota borrada");
      haptics.success();
      setTimeout(() => setFlash(null), 2000);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={openEditor}
        aria-label={hasNote ? "Editar nota del ejercicio" : "Añadir nota del ejercicio"}
        className={cn(
          "fx-press flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium",
          hasNote || flash
            ? "bg-primary/10 text-primary"
            : "bg-[var(--fx-inset)] text-[color:var(--text-secondary)]",
          className,
        )}
      >
        <NotebookPen className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="min-w-0 truncate">
          {flash ?? (hasNote ? note : "Añadir nota")}
        </span>
      </button>
    );
  }

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setOpen(false);
            setDraft(note ?? "");
          }
        }}
        maxLength={MAX_NOTE_LENGTH}
        autoFocus
        placeholder="Ej.: subir 2,5 kg la próxima vez"
        aria-label="Nota del ejercicio"
        className="min-w-0 flex-1 rounded-xl bg-[var(--fx-inset)] px-3 py-2 text-[16px] text-foreground placeholder:text-[color:var(--text-tertiary)] focus:outline-none"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        aria-label="Guardar nota"
        className="fx-press flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}
