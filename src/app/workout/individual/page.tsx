"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Timer, ArrowLeft, ArrowRight, Weight, Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { playBeep, playRestEndAlarm } from "@/lib/audio";
import {
  announceRest,
  announceCountdown,
  announceStart,
  announceExerciseComplete,
  announceNextExercise,
  announceWorkoutComplete,
} from "@/lib/speech";

export default function IndividualWorkout() {
  const router = useRouter();
  
  const {
    activeWorkout,
    completeSet,
    startRest,
    finishWorkout,
    setWorkoutExerciseIndex,
    setWorkoutSet,
    setWorkoutWeight,
    skipRest,
    audioEnabled,
    toggleAudio,
    saveProgress,
  } = useAppStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [startIndexLoaded, setStartIndexLoaded] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [localWeight, setLocalWeight] = useState<number | undefined>(undefined);

  const isBodyweightHIIT = activeWorkout.routine?.type === "hiit" && activeWorkout.equipmentPref === "bodyweight";

  // Load start exercise index from URL
  useEffect(() => {
    if (!activeWorkout.routine) {
      router.push("/");
      return;
    }
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const startIndex = Number(params.get("exercise")) || 0;
      setCurrentExerciseIndex(startIndex);
      setWorkoutExerciseIndex(startIndex);
      setStartIndexLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout.routine, router]);

  // Show weight prompt if no global weight set (skip for bodyweight HIIT)
  useEffect(() => {
    if (startIndexLoaded && activeWorkout.workoutWeight === undefined && !isBodyweightHIIT) {
      setShowWeightPrompt(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndexLoaded]);

  // Sync current set from store
  useEffect(() => {
    if (!activeWorkout.session) return;
    const storeSets = activeWorkout.session.exercises[currentExerciseIndex]?.sets || [];
    const nextSet = storeSets.length + 1;
    const maxSets = activeWorkout.routine?.exercises[currentExerciseIndex]?.sets || 1;
    setCurrentSet(Math.min(nextSet, maxSets));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout.session, currentExerciseIndex]);

  // Rest timer countdown with audio
  useEffect(() => {
    if (!showRest || restTime <= 0) return;

    // Announce rest start
    if (audioEnabled && restTime === currentExercise.restSeconds) {
      announceRest(currentExercise.restSeconds);
    }

    const timer = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          setShowRest(false);
          if (audioEnabled) {
            playRestEndAlarm();
            announceStart();
          }
          return 0;
        }
        // Countdown beeps and voice: 3, 2, 1
        if (audioEnabled && prev <= 3) {
          announceCountdown(prev - 1);
          playBeep(1000, 0.12, "sine", 0.25);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRest, restTime, audioEnabled]);

  if (!activeWorkout.routine) return null;
  if (!startIndexLoaded) return null;

  const currentExercise = activeWorkout.routine.exercises[currentExerciseIndex];
  if (!currentExercise) return null;

  const totalExercises = activeWorkout.routine.exercises.length;
  const storeSets = activeWorkout.session?.exercises[currentExerciseIndex]?.sets || [];
  const exerciseWeight = localWeight ?? activeWorkout.workoutWeight;

  const handleSetWeight = () => {
    const w = Number(weightInput);
    if (w > 0) {
      setWorkoutWeight(w);
      setLocalWeight(w);
      setShowWeightPrompt(false);
      setWeightInput("");
    }
  };

  const handleChangeWeight = () => {
    setWeightInput(exerciseWeight?.toString() || "");
    setShowWeightPrompt(true);
  };

  const handleComplete = () => {
    // Bodyweight HIIT: no weight needed
    if (!isBodyweightHIIT && !exerciseWeight) return;

    completeSet(currentExerciseIndex, currentSet, isBodyweightHIIT ? undefined : exerciseWeight);

    if (audioEnabled) {
      announceExerciseComplete();
    }
    
    if (currentSet >= currentExercise.sets) {
      // Exercise complete - auto-save progress
      saveProgress();
      
      if (currentExerciseIndex >= totalExercises - 1) {
        if (audioEnabled) {
          announceWorkoutComplete();
        }
        finishWorkout();
        router.push("/history");
      } else {
        const nextIndex = currentExerciseIndex + 1;
        const nextEx = activeWorkout.routine?.exercises[nextIndex];
        setCurrentExerciseIndex(nextIndex);
        setWorkoutExerciseIndex(nextIndex);
        setCurrentSet(1);
        setWorkoutSet(1);
        if (audioEnabled && nextEx) {
          announceNextExercise(nextEx.name);
        }
      }
    } else {
      const nextSet = currentSet + 1;
      setCurrentSet(nextSet);
      setWorkoutSet(nextSet);
      // Start rest
      setRestTime(currentExercise.restSeconds);
      setShowRest(true);
      startRest();
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {/* Weight Prompt Overlay */}
      {showWeightPrompt && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mx-auto mb-6">
              <Weight className="w-8 h-8 text-primary-container" />
            </div>
            <h2 className="font-headline-lg text-headline-lg text-center mb-2">
              ¿Qué peso usas?
            </h2>
            <p className="text-on-surface-variant text-center mb-6 text-sm">
              Introduce el peso para este entrenamiento. Podrás cambiarlo después.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                className="flex-1 bg-surface-container-high border border-surface-container-highest rounded-xl h-[56px] text-center font-bold text-on-surface text-2xl focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                type="number"
                placeholder="0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetWeight()}
                autoFocus
              />
              <span className="font-bold text-on-surface-variant text-lg">kg</span>
            </div>
            <button
              className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              onClick={handleSetWeight}
              disabled={!weightInput || Number(weightInput) <= 0}
            >
              EMPEZAR ENTRENAMIENTO
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 h-[56px] border-b border-surface-container-highest flex items-center justify-between px-4 bg-background/80 backdrop-blur-md">
        <button 
          onClick={() => router.back()}
          className="flex items-center justify-center w-10 h-10 text-on-surface hover:opacity-80 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-headline-sm text-headline-sm font-bold text-primary-container uppercase tracking-wider absolute left-1/2 -translate-x-1/2">
          {currentExercise.name}
        </h1>
        <button 
          onClick={toggleAudio}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-surface active:scale-95"
          title={audioEnabled ? "Desactivar audio" : "Activar audio"}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 px-4 py-2 gap-2">
        {/* Exercise Image */}
        <div className="flex-shrink-0 flex-1 min-h-0 relative rounded-xl overflow-hidden border border-surface-container-highest my-1">
          {currentExercise.image ? (
            <img
              src={currentExercise.image}
              alt={currentExercise.name}
              className="w-full h-full object-contain bg-surface-container"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container">
              <svg className="w-16 h-16 text-primary-container opacity-30" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
              </svg>
            </div>
          )}
        </div>

        {/* Exercise Info + Weight */}
        <div className="flex-shrink-0 flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            {currentExercise.sets} series · {currentExercise.reps} reps · {currentExercise.restSeconds}s
          </span>
          <div className="flex items-center gap-2">
            {!isBodyweightHIIT && exerciseWeight !== undefined && (
              <button
                onClick={handleChangeWeight}
                className="flex items-center gap-1 px-2 py-1 bg-surface-container-high rounded-lg border border-surface-container-highest active:scale-95"
              >
                <Weight className="w-3 h-3 text-primary-container" />
                <span className="font-bold text-primary-container text-sm">{exerciseWeight}kg</span>
              </button>
            )}
            <span className="font-label-caps text-label-caps text-primary-container">
              {currentExerciseIndex + 1}/{totalExercises}
            </span>
          </div>
        </div>

        {/* Sets Table */}
        <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto">
          <div className="flex items-center justify-between text-label-caps font-label-caps text-on-surface-variant px-2">
            <span className="w-12">SERIE</span>
            {!isBodyweightHIIT && <span className="flex-1 text-center">PESO</span>}
            <span className="w-8"></span>
          </div>

          {Array.from({ length: currentExercise.sets }).map((_, i) => {
            const setNum = i + 1;
            const storeSet = storeSets.find(s => s.setNumber === setNum);
            const isCompleted = !!storeSet;
            const isCurrent = setNum === currentSet;

            if (isCompleted && storeSet) {
              return (
                <div key={setNum} className="flex-shrink-0 h-[44px] flex items-center justify-between px-3 bg-surface-container border border-surface-container-highest rounded-lg">
                  <span className="w-12 font-bold text-primary-container">{setNum}</span>
                  {!isBodyweightHIIT && (
                    <span className="flex-1 text-center font-bold text-on-surface">{storeSet.weight}kg</span>
                  )}
                  <CheckCircle className="w-5 h-5 text-primary-container" />
                </div>
              );
            }

            if (isCurrent) {
              return (
                <div key={setNum} className="flex-shrink-0 h-[52px] flex items-center justify-between px-3 bg-surface-container-high border-2 border-primary-container rounded-lg">
                  <span className="w-12 font-bold text-primary-container">{setNum}</span>
                  {!isBodyweightHIIT && (
                    <span className="flex-1 text-center font-bold text-on-surface text-lg">
                      {exerciseWeight !== undefined ? `${exerciseWeight}kg` : "--"}
                    </span>
                  )}
                  <Circle className="w-5 h-5 text-primary-container" />
                </div>
              );
            }

            return (
              <div key={setNum} className="flex-shrink-0 h-[44px] flex items-center justify-between px-3 bg-surface-container border border-surface-container-highest rounded-lg opacity-40">
                <span className="w-12 font-bold text-on-surface-variant">{setNum}</span>
                {!isBodyweightHIIT && <span className="flex-1 text-center">--</span>}
                <div className="w-5" />
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Actions */}
      <footer className="flex-shrink-0 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 bg-background border-t border-surface-container-highest">
        <button
          className="w-full h-[52px] bg-primary-container text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 font-headline-sm"
          onClick={handleComplete}
          disabled={!isBodyweightHIIT && !exerciseWeight}
        >
          COMPLETAR SERIE
          <Timer className="w-5 h-5" />
        </button>

        <div className="flex gap-2 mt-2">
          {currentExerciseIndex > 0 && (
            <button
              onClick={() => {
                const prev = currentExerciseIndex - 1;
                setCurrentExerciseIndex(prev);
                setWorkoutExerciseIndex(prev);
                setCurrentSet(1);
                setWorkoutSet(1);
              }}
              className="flex-1 h-[44px] bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />ANT
            </button>
          )}
          {currentExerciseIndex < totalExercises - 1 && (
            <button
              onClick={() => {
                const next = currentExerciseIndex + 1;
                setCurrentExerciseIndex(next);
                setWorkoutExerciseIndex(next);
                setCurrentSet(1);
                setWorkoutSet(1);
              }}
              className="flex-1 h-[44px] bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95"
            >
              SIG<ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          )}
        </div>
      </footer>

      {/* Rest Timer Overlay */}
      {showRest && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-center">
            <span className="font-label-caps text-label-caps text-primary-container tracking-widest">DESCANSO</span>
            <div className="mt-4 relative w-40 h-40 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="72" fill="none" stroke="#1f1f1f" strokeWidth="6" />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="#ccff00"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 72}`}
                  strokeDashoffset={`${2 * Math.PI * 72 * (1 - restTime / currentExercise.restSeconds)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display-timer text-[40px] text-primary-container">{restTime}</span>
              </div>
            </div>
            <p className="font-headline-md text-headline-md text-on-surface mt-4">
              Serie {currentSet} completada
            </p>
            <button
              onClick={() => {
                setShowRest(false);
                skipRest();
              }}
              className="mt-6 h-[48px] px-8 bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded-lg border border-surface-container-highest active:scale-95"
            >
              Saltar descanso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
