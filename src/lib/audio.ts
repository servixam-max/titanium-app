// Audio utility using Web Audio API + Speech Synthesis
// Optimised for Capacitor WebView on Android (needs user-gesture unlock)

import { haptics } from "./haptics";

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let isMuted = false;
let voiceRate = 1.05;
let voicePitch = 1;
let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;
let voicesLoadAttempts = 0;

export type AudioMode = "full" | "beeps" | "voice" | "silent";
let audioMode: AudioMode = "full";

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
      }
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

function selectSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const esVoices = voices.filter((v) => v.lang.startsWith("es"));
  return (
    esVoices.find((v) => /neural|premium|enhanced|natural/i.test(v.name)) ||
    esVoices.find((v) => v.name.includes("Google")) ||
    esVoices.find((v) => v.lang === "es-ES" && v.localService) ||
    esVoices.find((v) => v.lang === "es-ES") ||
    esVoices.find((v) => v.lang.startsWith("es")) ||
    voices.find((v) => v.lang.startsWith("en") && /neural|Google/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0] ||
    null
  );
}

function loadVoicesNow(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length) {
    preferredVoice = selectSpanishVoice(voices);
    voicesLoaded = true;
    return true;
  }
  return false;
}

function preloadVoicesInternal(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (voicesLoaded) return;

  // Try immediately
  if (loadVoicesNow()) return;

  // Some Android WebViews never fire onvoiceschanged; poll a few times
  voicesLoadAttempts = 0;
  const poll = setInterval(() => {
    voicesLoadAttempts += 1;
    if (loadVoicesNow() || voicesLoadAttempts >= 8) {
      clearInterval(poll);
    }
  }, 350);

  window.speechSynthesis.onvoiceschanged = () => {
    loadVoicesNow();
    clearInterval(poll);
  };
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
      preloadVoicesInternal();
      const utter = new SpeechSynthesisUtterance(" ");
      utter.volume = 0.01;
      utter.rate = 1.5;
      window.speechSynthesis.speak(utter);
      // Do NOT cancel immediately on WebView; let the engine initialise
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }, 400);
    } catch {}
  }
}

// Attach listeners once
if (typeof window !== "undefined") {
  const events = ["touchstart", "touchend", "click", "pointerdown"];
  events.forEach((ev) => {
    window.addEventListener(ev, unlockAudio, { once: true, passive: true });
  });
  preloadVoicesInternal();
}

export function setAudioMode(mode: AudioMode): void {
  audioMode = mode;
  // Sync the legacy muted flag for consumers that still read getMuted()
  isMuted = mode === "silent";
}

export function getAudioMode(): AudioMode {
  return audioMode;
}

export function setVoiceRate(rate: number): void {
  voiceRate = Math.max(0.5, Math.min(2, rate));
}

export function getVoiceRate(): number {
  return voiceRate;
}

export function setVoicePitch(pitch: number): void {
  voicePitch = Math.max(0.5, Math.min(2, pitch));
}

export function setMuted(muted: boolean): void {
  isMuted = muted;
}

export function getMuted(): boolean {
  return isMuted;
}

export function preloadVoices(): void {
  preloadVoicesInternal();
}

export function areVoicesReady(): boolean {
  return voicesLoaded;
}

function isBeepAllowed(): boolean {
  return audioMode === "full" || audioMode === "beeps";
}

function isVoiceAllowed(): boolean {
  return audioMode === "full" || audioMode === "voice";
}

function isAudioSilent(): boolean {
  return audioMode === "silent" || isMuted;
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
  if (isAudioSilent() || !isBeepAllowed()) return;
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
  haptics.success();
}

export function playRestEndAlarm(): void {
  playTone(800, 0.2, "square", 0.15);
  setTimeout(() => playTone(800, 0.2, "square", 0.15), 250);
  setTimeout(() => playTone(1000, 0.3, "sine", 0.2, 1.5), 500);
  haptics.countdownEnd();
}

export function playExerciseStart(): void {
  playTone(880, 0.1, "sine", 0.2, 2);
  setTimeout(() => playTone(1100, 0.14, "sine", 0.25, 2), 100);
  haptics.light();
}

export function playRestStart(): void {
  playTone(500, 0.35, "sine", 0.15);
  haptics.restStart();
}

export function playCountdown(secondsLeft: number): void {
  const freq = 700 + (3 - secondsLeft) * 220;
  playTone(freq, 0.12, "sine", 0.28);
  haptics.tick();
}

export function playWorkoutComplete(): void {
  playTone(523, 0.15, "sine", 0.2, 2);
  setTimeout(() => playTone(659, 0.15, "sine", 0.2, 2), 150);
  setTimeout(() => playTone(784, 0.15, "sine", 0.2, 2), 300);
  setTimeout(() => playTone(1047, 0.45, "sine", 0.25, 2), 450);
  haptics.complete();
}

export function playSetFlash(): void {
  playTone(1320, 0.08, "sine", 0.15, 2);
  haptics.tick();
}

// ── Speech Synthesis Queue ──

interface SpeakJob {
  text: string;
  pitch: number;
  rate: number;
  volume: number;
}

const speakQueue: SpeakJob[] = [];
let isSpeaking = false;

function processSpeakQueue(): void {
  if (isSpeaking || speakQueue.length === 0) return;
  if (isAudioSilent() || !isVoiceAllowed()) {
    speakQueue.length = 0;
    return;
  }
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const job = speakQueue.shift();
  if (!job) return;
  isSpeaking = true;

  // Resume/unlock audio context FIRST, then load voices, then speak
  Promise.resolve()
    .then(() => unlockAudio())
    .then(() => resumeContext())
    .then(() => {
      if (!voicesLoaded) {
        loadVoicesNow();
        preloadVoicesInternal();
      }

      const utter = new SpeechSynthesisUtterance(job.text);
      if (preferredVoice) utter.voice = preferredVoice;
      utter.lang = preferredVoice?.lang || "es-ES";
      utter.pitch = job.pitch;
      utter.rate = job.rate;
      utter.volume = job.volume;

      const safetyTimeout = setTimeout(() => {
        isSpeaking = false;
        processSpeakQueue();
      }, 6000);

      utter.onend = () => {
        clearTimeout(safetyTimeout);
        isSpeaking = false;
        setTimeout(processSpeakQueue, 80);
      };
      utter.onerror = (e) => {
        clearTimeout(safetyTimeout);
        console.warn("TTS error:", e);
        isSpeaking = false;
        setTimeout(processSpeakQueue, 80);
      };

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch (err) {
        clearTimeout(safetyTimeout);
        console.warn("Speech synthesis error:", err);
        isSpeaking = false;
        processSpeakQueue();
      }
    });
}

export function speak(text: string, pitch: number = voicePitch, rate: number = voiceRate): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // Ensure audio context is unlocked
  unlockAudio();
  resumeContext();

  // WebView sometimes returns empty voices on first call; try to load now
  if (!voicesLoaded && !loadVoicesNow()) {
    preloadVoicesInternal();
  }

  speakQueue.push({ text, pitch, rate, volume: 1 });
  if (!isSpeaking) {
    processSpeakQueue();
  }
}

export function speakWithQueue(text: string, priority: "normal" | "high" = "normal"): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  if (priority === "high") {
    // Clear queue and interrupt current speech for urgent announcements
    stopSpeaking();
    speakQueue.length = 0;
    speak(text);
  } else {
    speak(text);
  }
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  speakQueue.length = 0;
}

// ── Announcements (voice + beep + vibration) ──

export function announceExerciseComplete(): void {
  playCompletionTone();
  speak("Serie completada", voicePitch, 1.0);
}

export function announceExerciseStart(name: string, sets?: number, reps?: string, weight?: number): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  if (!isVoiceAllowed()) return;
  const weightText = weight ? ` a ${weight} kilos` : "";
  const setsText = sets ? `${sets} series de ${reps || "repeticiones"}` : "";
  // Coma tras el nombre para que el TTS haga una pausa natural
  speak(`${name}, ${setsText}${weightText}`, voicePitch, voiceRate);
}

export function announceNextExercise(name?: string): void {
  if (isAudioSilent()) return;
  playDoubleBeep();
  haptics.doubleTick();
  if (name && isVoiceAllowed()) speak(`Siguiente ejercicio: ${name}`, voicePitch, 1.0);
}

export function announceWorkoutComplete(): void {
  playWorkoutComplete();
  speak("Entrenamiento completado. Buen trabajo.", voicePitch, 0.95);
}

export function announceRest(seconds?: number): void {
  playRestStart();
  if (seconds && seconds > 0 && isVoiceAllowed()) {
    speak(`Descansa ${seconds} segundos`, voicePitch, 1.0);
  }
}

export function announceCountdown(seconds: number): void {
  playCountdown(seconds);
  if (seconds <= 3 && seconds > 0 && isVoiceAllowed()) {
    const words: Record<number, string> = { 3: "tres", 2: "dos", 1: "uno" };
    speak(words[seconds] || String(seconds), voicePitch, 1.15);
  }
}

// Aviso hablado a los 10 segundos restantes (solo voz, sin tono invasivo)
export function announceTenSecondsLeft(): void {
  if (isAudioSilent()) return;
  haptics.tick();
  speak("Diez segundos", voicePitch, 1.05);
}

// Aviso a mitad del descanso largo (>= 60s)
export function announceHalfRest(secondsLeft: number): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  speak(`Quedan ${secondsLeft} segundos de descanso`, voicePitch, 1.05);
}

// Aviso de preparación al final del calentamiento
export function announceGetReady(name?: string): void {
  if (isAudioSilent()) return;
  playTripleBeep();
  if (isVoiceAllowed()) speak(name ? `Prepárate. ${name}` : "Prepárate", voicePitch, 1.0);
}

export function announceStart(): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  speak("A entrenar.", voicePitch, 1.0);
}

export function announceWarmupComplete(): void {
  playCompletionTone();
  speak("Calentamiento completado.", voicePitch, 1.0);
}

export function announceSetFlash(): void {
  playSetFlash();
}

// ── Contextual workout announcements (Task B2) ──

export function announceSetsRemaining(remaining: number): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (remaining === 2) speak("Quedan 2 series", voicePitch, 1.05);
  else if (remaining === 1) speak("Última serie, dalo todo", voicePitch, 1.05);
}

export function announcePrepareNext(nextName: string, restSeconds?: number): void {
  if (isAudioSilent()) return;
  playDoubleBeep();
  haptics.doubleTick();
  if (!isVoiceAllowed()) return;
  const restText = restSeconds ? `Descanso de ${restSeconds} segundos. ` : "";
  speak(`${restText}Prepara ${nextName}`, voicePitch, 1.0);
}

export function announceThirtySecondsLeft(): void {
  if (isAudioSilent()) return;
  haptics.tick();
  speak("Faltan 30 segundos", voicePitch, 1.05);
}

export function announceHalfwayWorkout(): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  speak("Vas por la mitad del entrenamiento. Sigue así.", voicePitch, 1.0);
}
