"use client";

import { useTrainingReminderSync } from "@/hooks/useTrainingReminderSync";

/**
 * Sin interfaz: vive en el layout para que los avisos se reprogramen en
 * cualquier pantalla, no solo en Inicio (F8.3).
 */
export default function TrainingReminderScheduler() {
  useTrainingReminderSync();
  return null;
}
