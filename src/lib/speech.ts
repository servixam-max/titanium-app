// Speech synthesis utility for workout voice guidance
// Uses native Web Speech API - works on Chrome and Safari iOS

let synth: SpeechSynthesis | null = null;

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (!synth) {
    synth = window.speechSynthesis;
  }
  return synth;
}

function getSpanishVoice(): SpeechSynthesisVoice | null {
  const s = getSynth();
  if (!s) return null;
  const voices = s.getVoices();
  // Prefer Spanish voices
  const esVoice =
    voices.find((v) => v.lang.startsWith("es") && v.name.includes("Google")) ||
    voices.find((v) => v.lang.startsWith("es") && v.name.includes("Chrome")) ||
    voices.find((v) => v.lang.startsWith("es")) ||
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    voices[0];
  return esVoice || null;
}

export function speak(text: string, rate: number = 1.1, pitch: number = 1.0): void {
  const s = getSynth();
  if (!s) return;

  // Cancel previous speech to avoid queue buildup
  s.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getSpanishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "es-ES";
  }
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = 1.0;

  s.speak(utterance);
}

export function stopSpeaking(): void {
  const s = getSynth();
  if (s) s.cancel();
}

export function announceRest(seconds: number): void {
  speak(`Descanso de ${seconds} segundos`);
}

export function announceCountdown(seconds: number): void {
  speak(String(seconds), 0.9, 1.2);
}

export function announceStart(): void {
  speak("¡A darle!", 1.0, 1.1);
}

export function announceExerciseComplete(): void {
  speak("Ejercicio completado", 1.0, 1.0);
}

export function announceExerciseStart(name: string): void {
  speak(`Vamos con: ${name}`);
}

export function announceNextExercise(name: string): void {
  speak(`Siguiente: ${name}`);
}

export function announceWorkoutComplete(): void {
  speak("Entrenamiento completado. Buen trabajo, guerrero.", 1.0, 1.0);
}

export function announceWarmupComplete(): void {
  speak("Calentamiento terminado. Preparado para el entrenamiento.", 1.0, 1.0);
}

// Preload voices (needed on some browsers)
export function preloadVoices(): void {
  const s = getSynth();
  if (s && s.getVoices().length === 0) {
    s.onvoiceschanged = () => {
      getSpanishVoice();
    };
  }
}
