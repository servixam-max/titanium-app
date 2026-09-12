"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Dumbbell,
  CalendarDays,
  ShieldAlert,
  ChevronRight,
  Check,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { fetchWithAuth } from "@/lib/auth";
import { buildPlan } from "@/lib/coach";
import { savePlan, saveProfile, makeSyncable, getProfile } from "@/lib/db";
import { UserProfile, TrainingGoal, ExperienceLevel, EquipmentType } from "@/lib/types";
import { syncNow } from "@/lib/sync";

const goals: { value: TrainingGoal; label: string; desc: string; icon: string }[] = [
  { value: "strength", label: "Fuerza", desc: "Levanta más peso y gana potencia", icon: "💪" },
  { value: "hypertrophy", label: "Hipertrofia", desc: "Gana masa muscular y definición", icon: "🏋️" },
  { value: "fat_loss", label: "Pérdida de grasa", desc: "Quema calorías con rutinas intensas", icon: "🔥" },
  { value: "endurance", label: "Resistencia", desc: "Mejora tu capacidad cardiovascular", icon: "🏃" },
  { value: "mobility", label: "Movilidad", desc: "Recupera rango y control corporal", icon: "🧘" },
];

const levels: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: "beginner", label: "Principiante", desc: "Menos de 6 meses entrenando" },
  { value: "intermediate", label: "Intermedio", desc: "6 meses a 2 años" },
  { value: "advanced", label: "Avanzado", desc: "Más de 2 años de entrenamiento" },
];

const equipmentOptions: { value: EquipmentType; label: string }[] = [
  { value: "dumbbells", label: "Mancuernas" },
  { value: "bodyweight", label: "Peso corporal" },
  { value: "both", label: "Ambos" },
];

const daysOptions = [2, 3, 4, 5, 6];

export default function OnboardingModal() {
  const { currentUser, onboardingComplete, completeOnboarding } = useAppStore();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<TrainingGoal | "">("");
  const [level, setLevel] = useState<ExperienceLevel | "">("");
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<EquipmentType[]>(["dumbbells"]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    if (onboardingComplete) {
      setDone(true);
      return;
    }
    getProfile(currentUser.id).then((prof) => {
      if (prof?.onboardingComplete) {
        completeOnboarding();
        setDone(true);
      }
    });
  }, [currentUser, onboardingComplete, completeOnboarding]);

  if (!currentUser || onboardingComplete || done) return null;

  const steps = ["Objetivo", "Nivel", "Días", "Equipo", "Limitaciones"];

  const toggleEquipment = (value: EquipmentType) => {
    if (equipment.includes(value)) {
      setEquipment(equipment.filter((v) => v !== value));
    } else {
      setEquipment([...equipment, value]);
    }
  };

  const addRestriction = () => {
    const clean = restrictionInput.trim().toLowerCase();
    if (clean && !restrictions.includes(clean)) {
      setRestrictions([...restrictions, clean]);
      setRestrictionInput("");
    }
  };

  const removeRestriction = (r: string) => setRestrictions(restrictions.filter((x) => x !== r));

  const finish = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const profileData = {
        goal,
        level,
        daysPerWeek: days,
        equipment,
        restrictions,
        onboardingComplete: true,
      };

      await fetchWithAuth("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      const res = await fetchWithAuth("/api/coach/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      const { plan } = await res.json();

      const fullPlan = {
        ...makeSyncable(currentUser.id),
        ...plan,
        active: true,
        recommended: true,
      };
      await savePlan(fullPlan);

      const profile: UserProfile = {
        ...makeSyncable(currentUser.id),
        userId: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        avatarColor: currentUser.avatarColor,
        goal: profileData.goal || undefined,
        level: profileData.level || undefined,
        daysPerWeek: profileData.daysPerWeek,
        equipment: profileData.equipment,
        restrictions: profileData.restrictions,
        onboardingComplete: profileData.onboardingComplete,
        preferences: {
          audioMode: "full",
          voiceRate: 0.92,
          equipmentPreference: equipment.includes("dumbbells") ? "dumbbells" : "bodyweight",
          theme: "dark",
          highContrast: false,
          language: "es",
          restTimerAutoStart: true,
          restTimerAdaptive: false,
        },
      };
      await saveProfile(profile);
      await syncNow();
      completeOnboarding();
      setDone(true);
    } catch (err) {
      console.error("Onboarding error:", err);
      // Generate local plan as fallback
      const fallbackPlan = buildPlan({ goal: goal || undefined, level: level || undefined, daysPerWeek: days, equipment, restrictions });
      await savePlan({ ...makeSyncable(currentUser.id), ...fallbackPlan, active: true, recommended: true });
      completeOnboarding();
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="p-2 rounded-xl hover:bg-white/5 disabled:opacity-0 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= step ? "w-6 bg-primary" : "w-2 bg-surface-600"}`}
              />
            ))}
          </div>
          <div className="w-8" />
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-title-md text-white">¿Cuál es tu objetivo principal?</h2>
                <p className="text-body-sm text-text-secondary mt-1">El coach generará tu plan a medida.</p>
              </div>
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                    goal === g.value
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{g.label}</div>
                    <div className="text-body-sm text-text-secondary">{g.desc}</div>
                  </div>
                  {goal === g.value && <Check className="w-5 h-5 text-primary ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="level"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-cyan/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-accent-cyan" />
                </div>
                <h2 className="text-title-md text-white">¿Qué nivel de entrenamiento tienes?</h2>
              </div>
              {levels.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    level === l.value
                      ? "border-accent-cyan bg-accent-cyan/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="font-semibold text-white">{l.label}</div>
                  <div className="text-body-sm text-text-secondary">{l.desc}</div>
                </button>
              ))}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="days"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-violet/10 flex items-center justify-center mb-3">
                  <CalendarDays className="w-6 h-6 text-accent-violet" />
                </div>
                <h2 className="text-title-md text-white">¿Cuántos días por semana?</h2>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {daysOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`aspect-square rounded-2xl text-lg font-bold transition-all ${
                      days === d
                        ? "bg-accent-violet text-white shadow-glow-violet"
                        : "bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-center text-body-sm text-text-secondary">{days} días · distribuidos automáticamente</p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="equipment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-title-md text-white">¿Qué equipamiento tienes?</h2>
              </div>
              {equipmentOptions.map((e) => (
                <button
                  key={e.value}
                  onClick={() => toggleEquipment(e.value)}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                    equipment.includes(e.value)
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="font-semibold text-white">{e.label}</span>
                  {equipment.includes(e.value) && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="restrictions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-rose/10 flex items-center justify-center mb-3">
                  <ShieldAlert className="w-6 h-6 text-accent-rose" />
                </div>
                <h2 className="text-title-md text-white">¿Alguna limitación?</h2>
                <p className="text-body-sm text-text-secondary mt-1">Ej: rodilla, hombro, espalda baja...</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={restrictionInput}
                  onChange={(e) => setRestrictionInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRestriction()}
                  placeholder="Escribe y pulsa añadir"
                  className="flex-1 h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:border-primary focus:outline-none"
                />
                <button
                  onClick={addRestriction}
                  className="h-12 px-4 rounded-2xl bg-white/10 text-white font-semibold"
                >
                  Añadir
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {restrictions.map((r) => (
                  <button
                    key={r}
                    onClick={() => removeRestriction(r)}
                    className="px-3 py-1.5 rounded-full bg-accent-rose/10 border border-accent-rose/30 text-accent-rose text-sm"
                  >
                    {r} ×
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          disabled={
            loading ||
            (step === 0 && !goal) ||
            (step === 1 && !level) ||
            (step === 3 && equipment.length === 0)
          }
          onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            "Generando plan..."
          ) : step < steps.length - 1 ? (
            <>
              Siguiente <ChevronRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Crear mi plan <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
