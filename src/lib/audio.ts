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
export function unlockAudio() {
  if (audioUnlocked) return;
  resumeContext().then(() => {
    audioUnlocked = true;
  });
  // Also warm up speech synthesis
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
      const utter = new SpeechSynthesisUtterance(" ");
      utter.volume = 0;
      window.speechSynthesis.speak(utter);
      window.speechSynthesis.cancel();
    } catch {}
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

// ── Rich Web Audio Tones ──

function envelope(
  ctx: AudioContext,
  gain: GainNode,
  attack: number,
  sustain: number,
  release: number,
  peak: number
) {
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.setValueAtTime(peak, now + attack + sustain);
  gain.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);
}

export function playTone(
  frequency: number = 880,
  duration: number = 0.2,
  type: OscillatorType = "sine",
  volume: number = 0.25,
  harmonic?: number
): void {
  try {
    resumeContext().then(() => {
      const ctx = getAudioContext();
      if (!ctx) return;

      const master = ctx.createGain();
      master.gain.setValueAtTime(volume, ctx.currentTime);
      master.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      envelope(ctx, gain, 0.01, duration * 0.6, duration * 0.35, 1);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.05);

      if (harmonic) {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(frequency * harmonic, ctx.currentTime);
        envelope(ctx, gain2, 0.02, duration * 0.4, duration * 0.5, 0.5);
        osc2.connect(gain2);
        gain2.connect(master);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + duration + 0.05);
      }
    });
  } catch {}
}

export function playBeep(
  frequency: number = 880,
  duration: number = 0.15,
  type: OscillatorType = "sine",
  volume: number = 0.3
): void {
  playTone(frequency, duration, type, volume);
}

export function playDoubleBeep(): void {
  playTone(880, 0.12, "sine", 0.2, 1.5);
  setTimeout(() => playTone(1100, 0.12, "sine", 0.22, 1.5), 130);
}

export function playTripleBeep(): void {
  playTone(880, 0.08, "sine", 0.25, 2);
  setTimeout(() => playTone(1100, 0.08, "sine", 0.25, 2), 100);
  setTimeout(() => playTone(1320, 0.15, "sine", 0.25, 2), 200);
}

export function playCompletionTone(): void {
  playTone(523, 0.18, "sine", 0.2, 2);
  setTimeout(() => playTone(659, 0.18, "sine", 0.2, 2), 180);
  setTimeout(() => playTone(784, 0.18, "sine", 0.2, 2), 360);
  setTimeout(() => playTone(1047, 0.35, "sine", 0.25, 2), 540);
  vibrateIfAvailable([100, 50, 100]);
}

export function playRestEndAlarm(): void {
  playTone(800, 0.2, "square", 0.15);
  setTimeout(() => playTone(800, 0.2, "square", 0.15), 250);
  setTimeout(() => playTone(1000, 0.3, "sine", 0.2, 1.5), 500);
  vibrateIfAvailable([200, 100, 200]);
}

export function playExerciseStart(): void {
  playTone(880, 0.1, "sine", 0.2, 2);
  setTimeout(() => playTone(1100, 0.14, "sine", 0.25, 2), 100);
  vibrateIfAvailable(50);
}

export function playRestStart(): void {
  playTone(500, 0.35, "sine", 0.15);
  vibrateIfAvailable(60);
}

export function playCountdown(secondsLeft: number): void {
  const freq = 700 + (3 - secondsLeft) * 220;
  playTone(freq, 0.12, "sine", 0.28);
  vibrateIfAvailable(30);
}

export function playWorkoutComplete(): void {
  playTone(523, 0.15, "sine", 0.2, 2);
  setTimeout(() => playTone(659, 0.15, "sine", 0.2, 2), 150);
  setTimeout(() => playTone(784, 0.15, "sine", 0.2, 2), 300);
  setTimeout(() => playTone(1047, 0.45, "sine", 0.25, 2), 450);
  vibrateIfAvailable(300);
}

export function playSetFlash(): void {
  playTone(1320, 0.08, "sine", 0.15, 2);
  vibrateIfAvailable(40);
}

// ── Speech Synthesis ──

function getSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const esVoices = voices.filter((v) => v.lang.startsWith("es"));

  return (
    // Prioridad 1: voces neural/premium (suenan más naturales)
    esVoices.find((v) => /neural|premium|enhanced|natural/i.test(v.name)) ||
    // Prioridad 2: Google (buena calidad en Android WebView)
    esVoices.find((v) => v.name.includes("Google")) ||
    // Prioridad 3: voz local en español de España
    esVoices.find((v) => v.lang === "es-ES" && v.localService) ||
    // Prioridad 4: cualquier español de España
    esVoices.find((v) => v.lang === "es-ES") ||
    // Prioridad 5: cualquier voz en español
    esVoices[0] ||
    // Fallback: inglés neural/Google, luego la primera disponible
    voices.find((v) => v.lang.startsWith("en") && /neural|Google/i.test(v.name)) ||
    voices[0] ||
    null
  );
}

export function speak(text: string, pitch: number = 1, rate: number = 1.05): void {
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
  speak("Serie completada", 1, 1.0);
}

export function announceExerciseStart(name: string, sets?: number, reps?: string, weight?: number): void {
  playExerciseStart();
  const weightText = weight ? ` a ${weight} kilos` : "";
  const setsText = sets ? `${sets} series de ${reps || "repeticiones"}` : "";
  // Coma tras el nombre para que el TTS haga una pausa natural
  speak(`${name}, ${setsText}${weightText}`, 1, 0.98);
}

export function announceNextExercise(name?: string): void {
  playDoubleBeep();
  vibrateIfAvailable([50, 30, 80]);
  if (name) speak(`Siguiente ejercicio: ${name}`, 1, 1.0);
}

export function announceWorkoutComplete(): void {
  playWorkoutComplete();
  speak("Entrenamiento completado. Buen trabajo.", 1, 0.95);
}

export function announceRest(seconds?: number): void {
  playRestStart();
  if (seconds && seconds > 0) {
    speak(`Descansa ${seconds} segundos`, 1, 1.0);
  }
}

export function announceCountdown(seconds: number): void {
  playCountdown(seconds);
  if (seconds <= 3 && seconds > 0) {
    const words: Record<number, string> = { 3: "tres", 2: "dos", 1: "uno" };
    speak(words[seconds] || String(seconds), 1.05, 1.15);
  }
}

// Aviso hablado a los 10 segundos restantes (solo voz, sin tono invasivo)
export function announceTenSecondsLeft(): void {
  speak("Diez segundos", 1, 1.05);
  vibrateIfAvailable(40);
}

// Aviso a mitad del descanso largo (>= 60s)
export function announceHalfRest(secondsLeft: number): void {
  speak(`Quedan ${secondsLeft} segundos de descanso`, 1, 1.05);
}

// Aviso de preparación al final del calentamiento
export function announceGetReady(name?: string): void {
  playTripleBeep();
  speak(name ? `Prepárate. ${name}` : "Prepárate", 1, 1.0);
}

export function announceStart(): void {
  playExerciseStart();
  speak("A entrenar.", 1.05, 1.0);
}

export function announceWarmupComplete(): void {
  playCompletionTone();
  speak("Calentamiento completado.");
}

export function announceSetFlash(): void {
  playSetFlash();
}
