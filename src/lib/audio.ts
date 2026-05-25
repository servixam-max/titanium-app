// Audio utility using Web Audio API + Speech Synthesis
// Optimised for Capacitor WebView on Android (needs user-gesture unlock)

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function resumeContext(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return Promise.resolve();
  if (ctx.state === "suspended") return ctx.resume();
  return Promise.resolve();
}

// Unlock AudioContext on first user interaction (required by Android WebView)
function unlockAudio() {
  if (audioUnlocked) return;
  resumeContext().then(() => {
    audioUnlocked = true;
  });
  // Also warm up speech synthesis
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance("");
    utter.volume = 0;
    try { window.speechSynthesis.speak(utter); } catch {}
  }
}

// Attach listeners once
if (typeof window !== "undefined") {
  const events = ["touchstart", "touchend", "click", "pointerdown"];
  events.forEach((ev) => {
    window.addEventListener(ev, unlockAudio, { once: true, passive: true });
  });
}

function vibrateIfAvailable(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

// ── Web Audio Beeps ──

export function playBeep(
  frequency: number = 880,
  duration: number = 0.15,
  type: OscillatorType = "sine",
  volume: number = 0.3
): void {
  try {
    resumeContext().then(() => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    });
  } catch {}
}

export function playDoubleBeep(): void {
  playBeep(880, 0.1, "sine", 0.2);
  setTimeout(() => playBeep(1100, 0.1, "sine", 0.2), 120);
}

export function playTripleBeep(): void {
  playBeep(880, 0.08, "sine", 0.25);
  setTimeout(() => playBeep(1100, 0.08, "sine", 0.25), 100);
  setTimeout(() => playBeep(1320, 0.15, "sine", 0.25), 200);
}

export function playCompletionTone(): void {
  playBeep(523, 0.15, "sine", 0.2);
  setTimeout(() => playBeep(659, 0.15, "sine", 0.2), 150);
  setTimeout(() => playBeep(784, 0.15, "sine", 0.2), 300);
  setTimeout(() => playBeep(1047, 0.3, "sine", 0.2), 450);
  vibrateIfAvailable([100, 50, 100]);
}

export function playRestEndAlarm(): void {
  playBeep(800, 0.2, "square", 0.15);
  setTimeout(() => playBeep(800, 0.2, "square", 0.15), 250);
  setTimeout(() => playBeep(1000, 0.3, "sine", 0.2), 500);
  vibrateIfAvailable([200, 100, 200]);
}

export function playExerciseStart(): void {
  playBeep(880, 0.08, "sine", 0.2);
  setTimeout(() => playBeep(1100, 0.12, "sine", 0.25), 100);
  vibrateIfAvailable(50);
}

export function playRestStart(): void {
  playBeep(500, 0.3, "sine", 0.15);
  vibrateIfAvailable(60);
}

export function playCountdown(secondsLeft: number): void {
  const freq = 600 + (3 - secondsLeft) * 200;
  playBeep(freq, 0.12, "sine", 0.25);
  vibrateIfAvailable(30);
}

export function playWorkoutComplete(): void {
  playBeep(523, 0.15, "sine", 0.2);
  setTimeout(() => playBeep(659, 0.15, "sine", 0.2), 150);
  setTimeout(() => playBeep(784, 0.15, "sine", 0.2), 300);
  setTimeout(() => playBeep(1047, 0.4, "sine", 0.25), 450);
  vibrateIfAvailable(300);
}

// ── Speech Synthesis ──

function getSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith("es")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0] ||
    null
  );
}

function speak(text: string, pitch: number = 1, rate: number = 1.1): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  
  // Ensure audio context is unlocked
  unlockAudio();
  resumeContext();

  const utter = new SpeechSynthesisUtterance(text);
  const voice = getSpanishVoice();
  if (voice) utter.voice = voice;
  utter.lang = voice?.lang || "es-ES";
  utter.pitch = pitch;
  utter.rate = rate;
  utter.volume = 1;

  // Cancel any current speech and speak new
  window.speechSynthesis.cancel();
  try {
    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ── Announcements (voice + beep + vibration) ──

export function announceExerciseComplete(): void {
  playCompletionTone();
  speak("Serie completada");
}

export function announceExerciseStart(): void {
  playExerciseStart();
}

export function announceNextExercise(name?: string): void {
  playDoubleBeep();
  vibrateIfAvailable([50, 30, 80]);
  if (name) speak(`Siguiente ejercicio: ${name}`);
}

export function announceWorkoutComplete(): void {
  playWorkoutComplete();
  speak("Entrenamiento completado. Buen trabajo.");
}

export function announceRest(seconds?: number): void {
  playRestStart();
  if (seconds && seconds > 0) {
    speak(`Descanso de ${seconds} segundos`);
  }
}

export function announceCountdown(seconds: number): void {
  playCountdown(seconds);
  if (seconds <= 3 && seconds > 0) {
    speak(String(seconds));
  }
}

export function announceStart(): void {
  playExerciseStart();
  speak("A entrenar.");
}

export function announceWarmupComplete(): void {
  playCompletionTone();
  speak("Calentamiento completado.");
}
