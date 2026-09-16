"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Dumbbell,
  Timer,
  Flame,
  Save,
  Sparkles,
  Search,
  Clock,
  Layers,
  SlidersHorizontal,
  FolderHeart,
} from "lucide-react";
import { Exercise, Routine, TrainingMode, MuscleCategory, EquipmentType } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { saveRoutine, getRoutines, deleteRoutine, nowIso } from "@/lib/db";
import { haptics } from "@/lib/haptics";
import ExerciseImage from "@/components/ui/ExerciseImage";

export interface CustomExerciseItem {
  uid: string; // Unique identifier for this instance in the workout
  exercise: Exercise;
  sets: number;
  mode: "reps" | "hiit";
  targetReps: number;
  workSeconds: number;
  restSeconds: number;
}

interface CustomWorkoutBuilderProps {
  catalog: Exercise[];
  onStartCustomWorkout?: (routine: Routine, mode: TrainingMode) => void;
}

const MUSCLE_TRANSLATIONS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  legs: "Piernas",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  core: "Abdomen",
  full_body: "Full Body",
  hiit: "HIIT",
};

const MUSCLE_TABS: { id: MuscleCategory | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "chest", label: "Pecho" },
  { id: "back", label: "Espalda" },
  { id: "legs", label: "Piernas" },
  { id: "shoulders", label: "Hombros" },
  { id: "biceps", label: "Bíceps" },
  { id: "triceps", label: "Tríceps" },
  { id: "core", label: "Abdomen" },
  { id: "full_body", label: "Full Body" },
];

export default function CustomWorkoutBuilder({
  catalog,
  onStartCustomWorkout,
}: CustomWorkoutBuilderProps) {
  const router = useRouter();
  const { currentUser, startWorkout } = useAppStore();

  const [routineTitle, setRoutineTitle] = useState("Mi Entrenamiento Personalizado");
  const [selectedItems, setSelectedItems] = useState<CustomExerciseItem[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Catalog search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMuscle, setActiveMuscle] = useState<MuscleCategory | "all">("all");
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | "all">("all");
  const [showCatalog, setShowCatalog] = useState(true);
  const [viewSavedList, setViewSavedList] = useState(false);

  // Load saved routines from IndexedDB
  const loadSavedRoutines = useCallback(async () => {
    try {
      const list = await getRoutines(currentUser?.id);
      const customList = list.filter(
        (r) => r.categoryTag === "personalizado" || r.day === 18 || (r.id && r.id.startsWith("custom-"))
      );
      setSavedRoutines(customList);
    } catch (err) {
      console.error("Error loading custom routines:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadSavedRoutines();
  }, [loadSavedRoutines]);

  // Filter exercises
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return catalog.filter((ex) => {
      if (q) {
        const matchName = ex.name.toLowerCase().includes(q);
        const matchDesc = ex.description?.toLowerCase().includes(q);
        const matchCat = ex.category?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      if (activeMuscle !== "all") {
        if (activeMuscle === "core") {
          if (ex.category !== "core") return false;
        } else if (activeMuscle === "full_body") {
          if (ex.category !== "full_body" && ex.category !== "hiit") return false;
        } else {
          if (ex.category !== activeMuscle) return false;
        }
      }
      if (equipmentFilter !== "all") {
        if (ex.equipment !== equipmentFilter && ex.equipment !== "both") return false;
      }
      return true;
    });
  }, [catalog, searchQuery, activeMuscle, equipmentFilter]);

  // Check how many times an exercise is added
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    selectedItems.forEach((item) => {
      const key = item.exercise.id || item.exercise.name;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [selectedItems]);

  // Add exercise to routine
  const handleAddExercise = (exercise: Exercise) => {
    haptics.impact();
    const isNaturallyHIIT =
      exercise.difficulty === "Cardio HIIT" ||
      exercise.category === "hiit" ||
      Boolean(exercise.workSeconds);

    const newItem: CustomExerciseItem = {
      uid: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      exercise,
      sets: exercise.sets || 3,
      mode: isNaturallyHIIT ? "hiit" : "reps",
      targetReps: parseInt(exercise.reps || "12", 10) || 12,
      workSeconds: exercise.workSeconds || (isNaturallyHIIT ? 20 : 30),
      restSeconds: exercise.restSeconds || (isNaturallyHIIT ? 10 : 60),
    };

    setSelectedItems((prev) => [...prev, newItem]);
  };

  // Remove exercise item
  const handleRemoveItem = (uid: string) => {
    haptics.tick();
    setSelectedItems((prev) => prev.filter((item) => item.uid !== uid));
  };

  // Move exercise item up / down
  const handleMoveItem = (index: number, direction: "up" | "down") => {
    haptics.tick();
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedItems.length) return;

    setSelectedItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Update item field
  const handleUpdateItem = (uid: string, updates: Partial<CustomExerciseItem>) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...updates } : item))
    );
  };

  // Calculations: Total sets, estimated time
  const totalSets = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.sets, 0);
  }, [selectedItems]);

  const estimatedMinutes = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    let totalSeconds = 0;
    selectedItems.forEach((item) => {
      const activeSecondsPerSet =
        item.mode === "hiit" ? item.workSeconds : item.targetReps * 3.5;
      const restSecondsPerSet = item.restSeconds;
      totalSeconds += item.sets * activeSecondsPerSet + (item.sets - 1) * restSecondsPerSet + 45; // 45s transition
    });
    return Math.max(5, Math.ceil(totalSeconds / 60));
  }, [selectedItems]);

  const hasHIIT = useMemo(() => {
    return selectedItems.some((item) => item.mode === "hiit");
  }, [selectedItems]);

  // Build Routine Object
  const buildRoutineObject = (): Routine => {
    const routineExercises: Exercise[] = selectedItems.map((item, idx) => {
      const isHIIT = item.mode === "hiit";
      return {
        ...item.exercise,
        id: item.exercise.id || `custom-ex-${idx + 1}`,
        sets: item.sets,
        reps: isHIIT ? `${item.workSeconds}s` : `${item.targetReps}`,
        workSeconds: isHIIT ? item.workSeconds : undefined,
        restSeconds: item.restSeconds,
        difficulty: isHIIT ? "Cardio HIIT" : item.exercise.difficulty || "Intermedio",
      };
    });

    const isDominantlyHIIT =
      selectedItems.filter((i) => i.mode === "hiit").length >= selectedItems.length / 2;

    const routineId = `custom-${Date.now()}`;

    return {
      id: routineId,
      day: 18,
      title: routineTitle.trim() || "Entrenamiento Personalizado",
      subtitle: `${selectedItems.length} ejercicios configurados a medida`,
      type: isDominantlyHIIT ? "hiit" : "strength",
      duration: `${estimatedMinutes} min`,
      difficulty: isDominantlyHIIT ? "Cardio HIIT" : "Intermedio",
      equipment: "Personalizado",
      categoryTag: "personalizado",
      coverImage: selectedItems[0]?.exercise.image || "/images/exercises/classic_push_ups/screen.webp",
      exercises: routineExercises,
      createdAt: nowIso(),
    };
  };

  // Launch Workout
  const handleStart = (mode: TrainingMode) => {
    if (selectedItems.length === 0) {
      alert("Añade al menos un ejercicio a tu rutina antes de comenzar.");
      return;
    }
    haptics.impact();
    const routine = buildRoutineObject();
    if (onStartCustomWorkout) {
      onStartCustomWorkout(routine, mode);
    } else {
      startWorkout(routine, mode, 0);
      router.push(mode === "guided" ? "/workout/guided" : "/workout/individual");
    }
  };

  // Save Routine
  const handleSave = async () => {
    if (selectedItems.length === 0) {
      alert("Añade ejercicios a tu rutina para poder guardarla.");
      return;
    }
    try {
      setIsSaving(true);
      haptics.selection();
      const routine = buildRoutineObject();
      await saveRoutine(routine);
      setSaveFeedback("¡Rutina guardada en Mis Rutinas!");
      setTimeout(() => setSaveFeedback(null), 3000);
      await loadSavedRoutines();
    } catch (err) {
      console.error("Error saving routine:", err);
      alert("Hubo un error al guardar la rutina.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete saved routine
  const handleDeleteSaved = async (id?: string) => {
    if (!id) return;
    if (confirm("¿Seguro que deseas eliminar esta rutina guardada?")) {
      try {
        haptics.tick();
        await deleteRoutine(id);
        await loadSavedRoutines();
      } catch (err) {
        console.error("Error deleting routine:", err);
      }
    }
  };

  // Load a saved routine into the builder
  const handleLoadSavedRoutine = (routine: Routine) => {
    haptics.selection();
    setRoutineTitle(routine.title);
    const loadedItems: CustomExerciseItem[] = routine.exercises.map((ex, idx) => {
      const isHIIT = Boolean(ex.workSeconds) || ex.reps?.includes("s");
      const targetReps = parseInt(ex.reps || "12", 10) || 12;
      return {
        uid: `loaded-${idx}-${Date.now()}`,
        exercise: ex,
        sets: ex.sets || 3,
        mode: isHIIT ? "hiit" : "reps",
        targetReps,
        workSeconds: ex.workSeconds || 20,
        restSeconds: ex.restSeconds || 60,
      };
    });
    setSelectedItems(loadedItems);
    setViewSavedList(false);
  };

  // Presets / Quick Loaders
  const loadPreset = (presetType: "tabata" | "hiit" | "push" | "legs") => {
    haptics.impact();
    let namesToFind: string[] = [];
    let title = "";
    let defaultMode: "reps" | "hiit" = "hiit";
    let defaultSets = 3;
    let defaultWork = 20;
    let defaultRest = 10;

    if (presetType === "tabata") {
      title = "Circuito Tabata Express (20s/10s)";
      namesToFind = ["Burpees", "Jumping Jacks", "Mountain Climbers", "Sentadilla con Salto"];
      defaultMode = "hiit";
      defaultSets = 4;
      defaultWork = 20;
      defaultRest = 10;
    } else if (presetType === "hiit") {
      title = "Super HIIT Titán (30s/15s)";
      namesToFind = ["Burpees", "Saltos de Patinador", "Plancha a Flexión", "Boxeo de Sombra"];
      defaultMode = "hiit";
      defaultSets = 3;
      defaultWork = 30;
      defaultRest = 15;
    } else if (presetType === "push") {
      title = "Fuerza Pectoral y Tríceps";
      namesToFind = ["Press de Banca", "Flexiones Clásicas", "Aperturas", "Fondos en Banco"];
      defaultMode = "reps";
      defaultSets = 4;
      defaultWork = 30;
      defaultRest = 75;
    } else if (presetType === "legs") {
      title = "Piernas de Acero";
      namesToFind = ["Sentadillas", "Zancadas", "Peso Muerto Rumano", "Puente de Glúteo"];
      defaultMode = "reps";
      defaultSets = 4;
      defaultWork = 30;
      defaultRest = 75;
    }

    const matchedExercises: Exercise[] = [];
    namesToFind.forEach((partial) => {
      const found = catalog.find((c) =>
        c.name.toLowerCase().includes(partial.toLowerCase())
      );
      if (found) matchedExercises.push(found);
    });

    if (matchedExercises.length > 0) {
      setRoutineTitle(title);
      setSelectedItems(
        matchedExercises.map((ex, idx) => ({
          uid: `preset-${idx}-${Date.now()}`,
          exercise: ex,
          sets: defaultSets,
          mode: defaultMode,
          targetReps: 12,
          workSeconds: defaultWork,
          restSeconds: defaultRest,
        }))
      );
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-32">
      {/* Top Banner / Title Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#141828] via-[#111422] to-[#0D101A] p-5 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                  Creador de Rutinas
                </span>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">
                  Día Personalizado
                </h2>
              </div>
            </div>

            {savedRoutines.length > 0 && (
              <button
                onClick={() => {
                  haptics.selection();
                  setViewSavedList(!viewSavedList);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                  viewSavedList
                    ? "bg-gradient-to-r from-primary to-emerald-400 text-black border-primary font-black shadow-neon"
                    : "bg-[#131626] text-zinc-300 border-white/10 hover:text-white hover:bg-[#181d2e]"
                }`}
              >
                <FolderHeart className="h-3.5 w-3.5" />
                <span>Mis Rutinas ({savedRoutines.length})</span>
              </button>
            )}
          </div>

          {/* Routine Name Input */}
          <div className="flex flex-col gap-1 mt-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Nombre de la Rutina
            </label>
            <input
              type="text"
              value={routineTitle}
              onChange={(e) => setRoutineTitle(e.target.value)}
              placeholder="Ej: Tabata Quemagrasa 20/10 o Pectoral Máximo"
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm font-bold text-white placeholder-zinc-500 focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Quick Presets Carousel */}
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Plantillas Rápidas de 1 Toque
            </span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => loadPreset("tabata")}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-orange-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-all active:scale-95"
              >
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                Tabata 20/10 (Cardio)
              </button>
              <button
                onClick={() => loadPreset("hiit")}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all active:scale-95"
              >
                <Timer className="h-3.5 w-3.5 text-amber-400" />
                Super HIIT (30/15)
              </button>
              <button
                onClick={() => loadPreset("push")}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all active:scale-95"
              >
                <Dumbbell className="h-3.5 w-3.5 text-cyan-400" />
                Fuerza Empuje
              </button>
              <button
                onClick={() => loadPreset("legs")}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all active:scale-95"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                Pierna & Glúteo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Routines Drawer (Collapsible) */}
      <AnimatePresence>
        {viewSavedList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[#141828] via-[#111422] to-[#0D101A] p-4 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <FolderHeart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Tus Rutinas Guardadas ({savedRoutines.length})
                </h3>
              </div>
              <button
                onClick={() => setViewSavedList(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto no-scrollbar">
              {savedRoutines.map((routine) => (
                <div
                  key={routine.id || routine.title}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#131626] border border-white/5 p-3 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                      <ExerciseImage
                        src={routine.coverImage || routine.exercises[0]?.image}
                        alt={routine.title}
                        size="sm"
                        containerClassName="w-full h-full"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <h4 className="text-xs font-black text-white truncate">
                        {routine.title}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {routine.exercises.length} ejercicios · {routine.duration}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleLoadSavedRoutine(routine)}
                      className="rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/25 transition-all"
                      title="Editar en el constructor"
                    >
                      Cargar
                    </button>
                    <button
                      onClick={() => {
                        haptics.impact();
                        startWorkout(routine, "guided", 0);
                        router.push("/workout/guided");
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-black font-black hover:scale-105 transition-all"
                      title="Iniciar Guiado"
                    >
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(routine.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Eliminar rutina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Routine Configuration Section (Selected Exercises) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="border-l-2 border-primary pl-2 text-xs font-bold uppercase tracking-wider text-white">
              Ejercicios Seleccionados ({selectedItems.length})
            </h3>
            {hasHIIT && (
              <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <Flame className="h-2.5 w-2.5" /> HIIT/Tabata
              </span>
            )}
          </div>

          {selectedItems.length > 0 && (
            <button
              onClick={() => {
                if (confirm("¿Vaciar todos los ejercicios seleccionados?")) {
                  haptics.tick();
                  setSelectedItems([]);
                }
              }}
              className="text-[10px] font-bold text-zinc-400 hover:text-red-400 transition-colors"
            >
              Vaciar lista
            </button>
          )}
        </div>

        {selectedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-[#131626]/60 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-zinc-400 mb-3">
              <Dumbbell className="h-7 w-7 opacity-70" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-tight text-white mb-1">
              Tu rutina está vacía
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs mb-4">
              Explora el catálogo abajo y pulsa <span className="text-primary font-bold">+ Añadir</span> para incorporar ejercicios, definir series y elegir si entrenar por repeticiones o por segundos HIIT.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => loadPreset("tabata")}
                className="rounded-xl bg-primary/20 border border-primary/40 px-3.5 py-2 text-xs font-black text-primary hover:bg-primary/30 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Cargar Circuito Tabata
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedItems.map((item, index) => {
              const muscle =
                MUSCLE_TRANSLATIONS[item.exercise.category || ""] || item.exercise.category || "Fuerza";
              const isHIIT = item.mode === "hiit";

              return (
                <motion.div
                  key={item.uid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#141828] via-[#111422] to-[#0D101A] p-3.5 shadow-xl transition-all"
                >
                  {/* Top exercise bar */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Step Number Badge */}
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-black/50 text-[11px] font-mono font-black text-primary border border-primary/30">
                        {index + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                        <ExerciseImage
                          src={item.exercise.image}
                          alt={item.exercise.name}
                          size="sm"
                          containerClassName="w-full h-full"
                          className="object-cover"
                        />
                      </div>

                      {/* Name & Muscle info */}
                      <div className="min-w-0 flex flex-col">
                        <h4 className="text-sm font-black text-white truncate leading-tight">
                          {item.exercise.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            {muscle}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {item.exercise.equipment === "dumbbells" ? "Mancuernas" : "Peso Corporal"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order & delete buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMoveItem(index, "up")}
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 transition-all"
                        title="Subir orden"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveItem(index, "down")}
                        disabled={index === selectedItems.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 transition-all"
                        title="Bajar orden"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.uid)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all ml-1"
                        title="Eliminar de la rutina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Configuration Controls */}
                  <div className="flex flex-col gap-3 rounded-xl bg-black/35 border border-white/5 p-3">
                    {/* Mode Selector Tabs (Reps vs HIIT) */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5">
                      <button
                        onClick={() => {
                          haptics.selection();
                          handleUpdateItem(item.uid, {
                            mode: "reps",
                            restSeconds: item.restSeconds < 30 ? 60 : item.restSeconds,
                          });
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          !isHIIT
                            ? "bg-primary text-black font-black shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Dumbbell className="h-3.5 w-3.5" />
                        <span>Por Reps (Fuerza)</span>
                      </button>

                      <button
                        onClick={() => {
                          haptics.selection();
                          handleUpdateItem(item.uid, {
                            mode: "hiit",
                            workSeconds: item.workSeconds || 20,
                            restSeconds: item.restSeconds > 30 ? 10 : item.restSeconds,
                          });
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isHIIT
                            ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        <span>Por Tiempo (HIIT)</span>
                      </button>
                    </div>

                    {/* Sets controller (applicable to both) */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        Número de Series:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            haptics.tick();
                            handleUpdateItem(item.uid, { sets: Math.max(1, item.sets - 1) });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono text-sm font-black text-primary">
                          {item.sets}
                        </span>
                        <button
                          onClick={() => {
                            haptics.tick();
                            handleUpdateItem(item.uid, { sets: Math.min(10, item.sets + 1) });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Mode Specific Config */}
                    {!isHIIT ? (
                      /* REP-BASED CONFIG */
                      <div className="grid grid-cols-2 gap-3">
                        {/* Reps */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Reps Objetivo
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                haptics.tick();
                                handleUpdateItem(item.uid, {
                                  targetReps: Math.max(1, item.targetReps - 2),
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-mono text-sm font-black text-white">
                              {item.targetReps}
                            </span>
                            <button
                              onClick={() => {
                                haptics.tick();
                                handleUpdateItem(item.uid, {
                                  targetReps: Math.min(50, item.targetReps + 2),
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Rest */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Descanso Serie
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                haptics.tick();
                                handleUpdateItem(item.uid, {
                                  restSeconds: Math.max(15, item.restSeconds - 15),
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                            >
                              -
                            </button>
                            <span className="flex-1 text-center font-mono text-sm font-black text-cyan-400">
                              {item.restSeconds}s
                            </span>
                            <button
                              onClick={() => {
                                haptics.tick();
                                handleUpdateItem(item.uid, {
                                  restSeconds: Math.min(240, item.restSeconds + 15),
                                });
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* HIIT / TABATA TIME-BASED CONFIG */
                      <div className="flex flex-col gap-2.5">
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          <button
                            onClick={() => {
                              haptics.tick();
                              handleUpdateItem(item.uid, { workSeconds: 20, restSeconds: 10 });
                            }}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                              item.workSeconds === 20 && item.restSeconds === 10
                                ? "bg-rose-500 text-white shadow-sm"
                                : "bg-white/10 text-zinc-400 hover:text-white"
                            }`}
                          >
                            🔥 Tabata 20s / 10s
                          </button>
                          <button
                            onClick={() => {
                              haptics.tick();
                              handleUpdateItem(item.uid, { workSeconds: 30, restSeconds: 15 });
                            }}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                              item.workSeconds === 30 && item.restSeconds === 15
                                ? "bg-amber-500 text-black shadow-sm"
                                : "bg-white/10 text-zinc-400 hover:text-white"
                            }`}
                          >
                            ⚡ HIIT 30s / 15s
                          </button>
                          <button
                            onClick={() => {
                              haptics.tick();
                              handleUpdateItem(item.uid, { workSeconds: 45, restSeconds: 15 });
                            }}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                              item.workSeconds === 45 && item.restSeconds === 15
                                ? "bg-cyan-500 text-black shadow-sm"
                                : "bg-white/10 text-zinc-400 hover:text-white"
                            }`}
                          >
                            💪 45s / 15s
                          </button>
                        </div>

                        {/* Fine tune Work & Rest */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Work Seconds */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                              Actividad (Trabajo)
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  haptics.tick();
                                  handleUpdateItem(item.uid, {
                                    workSeconds: Math.max(10, item.workSeconds - 5),
                                  });
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center font-mono text-sm font-black text-rose-400">
                                {item.workSeconds}s
                              </span>
                              <button
                                onClick={() => {
                                  haptics.tick();
                                  handleUpdateItem(item.uid, {
                                    workSeconds: Math.min(180, item.workSeconds + 5),
                                  });
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Rest Seconds */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                              Descanso
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  haptics.tick();
                                  handleUpdateItem(item.uid, {
                                    restSeconds: Math.max(5, item.restSeconds - 5),
                                  });
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center font-mono text-sm font-black text-cyan-400">
                                {item.restSeconds}s
                              </span>
                              <button
                                onClick={() => {
                                  haptics.tick();
                                  handleUpdateItem(item.uid, {
                                    restSeconds: Math.min(180, item.restSeconds + 5),
                                  });
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exercise Catalog Picker Section */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="border-l-2 border-primary pl-2 text-xs font-bold uppercase tracking-wider text-white">
              Explorar Catálogo de Ejercicios ({filteredCatalog.length})
            </h3>
          </div>
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="text-xs text-primary font-bold hover:underline"
          >
            {showCatalog ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showCatalog && (
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre (ej: Burpee, Press, Salto, Crunch...)"
                className="w-full rounded-2xl border border-white/10 bg-[#131626] pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-zinc-500 focus:border-primary focus:outline-none shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Muscle Filter Strip */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {MUSCLE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    haptics.selection();
                    setActiveMuscle(tab.id);
                  }}
                  className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    activeMuscle === tab.id
                      ? "bg-gradient-to-r from-primary to-emerald-400 text-black font-black shadow-neon border border-white/20"
                      : "bg-[#131626] text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Equipment Filter Strip */}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  haptics.selection();
                  setEquipmentFilter("all");
                }}
                className={`flex-1 rounded-xl py-1.5 text-[11px] font-bold border transition-all ${
                  equipmentFilter === "all"
                    ? "bg-white/15 text-white border-white/30"
                    : "bg-black/20 text-zinc-500 border-white/5 hover:text-zinc-300"
                }`}
              >
                Cualquier Equipo
              </button>
              <button
                onClick={() => {
                  haptics.selection();
                  setEquipmentFilter("dumbbells");
                }}
                className={`flex-1 rounded-xl py-1.5 text-[11px] font-bold border transition-all ${
                  equipmentFilter === "dumbbells"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-black/20 text-zinc-500 border-white/5 hover:text-zinc-300"
                }`}
              >
                Mancuernas
              </button>
              <button
                onClick={() => {
                  haptics.selection();
                  setEquipmentFilter("bodyweight");
                }}
                className={`flex-1 rounded-xl py-1.5 text-[11px] font-bold border transition-all ${
                  equipmentFilter === "bodyweight"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-black/20 text-zinc-500 border-white/5 hover:text-zinc-300"
                }`}
              >
                Peso Corporal
              </button>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {filteredCatalog.map((exercise) => {
                const count = itemCounts.get(exercise.id || exercise.name) || 0;
                const muscle =
                  MUSCLE_TRANSLATIONS[exercise.category || ""] || exercise.category || "Fuerza";
                const isHIIT =
                  exercise.difficulty === "Cardio HIIT" || exercise.category === "hiit";

                return (
                  <div
                    key={exercise.id || exercise.name}
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 bg-gradient-to-br from-[#141828] via-[#111422] to-[#0D101A] ${
                      count > 0
                        ? "border-primary/60 shadow-neon"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    {/* Thumbnail box */}
                    <div className="relative aspect-square w-full bg-black/40 overflow-hidden">
                      <ExerciseImage
                        src={exercise.image}
                        alt={exercise.name}
                        size="sm"
                        containerClassName="w-full h-full"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Count badge if added */}
                      {count > 0 && (
                        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-primary to-emerald-400 text-black font-mono text-xs font-black shadow-neon">
                          +{count}
                        </div>
                      )}

                      {/* HIIT badge */}
                      {isHIIT && (
                        <div className="absolute top-2 left-2 rounded-md bg-rose-500/80 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow">
                          HIIT
                        </div>
                      )}
                    </div>

                    {/* Content & Add button */}
                    <div className="flex flex-col p-2.5 gap-2">
                      <div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-primary">
                          {muscle}
                        </span>
                        <h4 className="text-xs font-black text-white leading-tight line-clamp-1">
                          {exercise.name}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleAddExercise(exercise)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                          count > 0
                            ? "bg-gradient-to-r from-primary to-emerald-400 text-black shadow-neon"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{count > 0 ? "Añadir más" : "Añadir"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar (Sticky at bottom) */}
      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="mx-auto max-w-lg pointer-events-auto rounded-3xl border border-white/15 bg-[#0d101a]/95 p-3.5 shadow-2xl backdrop-blur-2xl">
          {/* Summary metrics header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono font-black text-white">
                {selectedItems.length} {selectedItems.length === 1 ? "Ejercicio" : "Ejercicios"}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs font-mono font-bold text-zinc-400">
                {totalSets} Series
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{estimatedMinutes} min
              </span>
            </div>

            {/* Save Routine Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || selectedItems.length === 0}
              className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white transition-all disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5 text-primary" />
              <span>{isSaving ? "Guardando..." : "Guardar"}</span>
            </button>
          </div>

          {/* Feedback banner */}
          {saveFeedback && (
            <div className="mb-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 py-1 px-3 text-center text-xs font-bold text-emerald-300">
              {saveFeedback}
            </div>
          )}

          {/* Workout Launch Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleStart("guided")}
              disabled={selectedItems.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-[#85F754] to-[#00F59B] py-3 px-3 text-xs font-black uppercase tracking-wider text-black shadow-neon-strong border border-white/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Modo Guiado</span>
            </button>

            <button
              onClick={() => handleStart("individual")}
              disabled={selectedItems.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 px-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Dumbbell className="h-4 w-4" />
              <span>Modo Libre</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
