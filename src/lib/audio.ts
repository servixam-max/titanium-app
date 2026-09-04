// Audio utility using Web Audio API + Speech Synthesis
// Optimized for iOS / Android Capacitor WebView
// Designed with modern Apple-style acoustic chimes and bulletproof Spanish TTS.

import { haptics } from "./haptics";
import { registerPlugin, Capacitor } from "@capacitor/core";

export interface NativeTTSPluginInterface {
  speak(options: { text: string; rate?: number; pitch?: number; flush?: boolean }): Promise<{ success: boolean; id: string }>;
  stop(): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
}

export const NativeTTS = registerPlugin<NativeTTSPluginInterface>("NativeTTS");

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let isMuted = false;
let voiceRate = 0.98;
let voicePitch = 1.0;
let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;
let voicesLoadAttempts = 0;

export type AudioMode = "full" | "beeps" | "voice" | "silent";
let audioMode: AudioMode = "full";

// Prevent V8/Chromium from garbage collecting active utterances mid-speech
if (typeof window !== "undefined") {
  (window as any).__titaniumUtterances = new Set<SpeechSynthesisUtterance>();
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
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

function selectSpanishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const esVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("es"));
  if (esVoices.length > 0) {
    return (
      esVoices.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ||
      esVoices.find((v) => /google/i.test(v.name)) ||
      esVoices.find((v) => /monica|jorge|paulina|helena/i.test(v.name)) ||
      esVoices.find((v) => v.lang === "es-ES" && v.localService) ||
      esVoices.find((v) => v.lang === "es-ES") ||
      esVoices[0]
    );
  }
  return voices[0] || null;
}

function loadVoicesNow(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false;
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

  if (loadVoicesNow()) return;

  voicesLoadAttempts = 0;
  const poll = setInterval(() => {
    voicesLoadAttempts += 1;
    if (loadVoicesNow() || voicesLoadAttempts >= 10) {
      clearInterval(poll);
    }
  }, 250);

  window.speechSynthesis.onvoiceschanged = () => {
    loadVoicesNow();
    clearInterval(poll);
  };
}

// Unlock AudioContext and TTS engine on first user interaction
export function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  resumeContext().catch(() => {});

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      preloadVoicesInternal();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      const utter = new SpeechSynthesisUtterance("");
      utter.volume = 0.01;
      utter.rate = 2.0;
      utter.lang = "es-ES";
      window.speechSynthesis.speak(utter);
    } catch {}
  }
}

if (typeof window !== "undefined") {
  const events = ["touchstart", "touchend", "click", "pointerdown"];
  events.forEach((ev) => {
    window.addEventListener(ev, unlockAudio, {
      once: true,
      passive: true,
      capture: true,
    });
  });
  preloadVoicesInternal();
}

export function setAudioMode(mode: AudioMode): void {
  audioMode = mode;
  isMuted = mode === "silent";
}

export function getAudioMode(): AudioMode {
  return audioMode;
}

export function setVoiceRate(rate: number): void {
  voiceRate = Math.max(0.5, Math.min(1.6, rate));
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

// ─────────────────────────────────────────────────────────────
// ── Modern Acoustic Sound Design (Estilo Apple / Glass Chimes) ──
// ─────────────────────────────────────────────────────────────

/**
 * Creates an elegant, modern harmonic chime with acoustic resonance
 * instead of harsh 8-bit oscillator beeps.
 */
function playHarmonicChime(
  freq: number,
  duration: number = 0.4,
  volume: number = 0.25,
  overtoneMultiplier: number = 1.5,
) {
  if (isAudioSilent() || !isBeepAllowed()) return;
  try {
    resumeContext().then(() => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Lowpass filter to ensure sound is warm and smooth, never harsh
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3200, now);
      filter.connect(ctx.destination);

      // Primary tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(freq, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(volume, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start(now);
      osc1.stop(now + duration + 0.05);

      // Harmonic overtone for natural glass/marimba acoustic warmth
      if (overtoneMultiplier > 1) {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq * overtoneMultiplier, now);

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * 0.35, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

        osc2.connect(gain2);
        gain2.connect(filter);
        osc2.start(now);
        osc2.stop(now + duration * 0.75);
      }
    });
  } catch {}
}

/**
 * Modern iOS-style acoustic woodblock/droplet tick for countdowns
 */
function playSoftTick(freq: number = 600, volume: number = 0.18) {
  if (isAudioSilent() || !isBeepAllowed()) return;
  try {
    resumeContext().then(() => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.04);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    });
  } catch {}
}

// Backward-compatible alias
export function playTone(
  frequency: number = 880,
  duration: number = 0.2,
  _type: OscillatorType = "sine",
  volume: number = 0.25,
): void {
  playHarmonicChime(frequency, duration, volume);
}

export function playBeep(
  frequency: number = 880,
  duration: number = 0.15,
  _type: OscillatorType = "sine",
  volume: number = 0.25,
): void {
  playHarmonicChime(frequency, duration, volume);
}

/**
 * Modern iOS Dual Chime
 */
export function playDoubleBeep(): void {
  playHarmonicChime(987.77, 0.25, 0.22, 1.5); // B5
  setTimeout(() => playHarmonicChime(1318.51, 0.35, 0.25, 1.5), 110); // E6
}

export function playTripleBeep(): void {
  playHarmonicChime(880, 0.2, 0.2);
  setTimeout(() => playHarmonicChime(1100, 0.2, 0.2), 90);
  setTimeout(() => playHarmonicChime(1320, 0.35, 0.25), 180);
}

/**
 * Apple Watch style rest-end double glass chime
 */
export function playRestEndAlarm(): void {
  playHarmonicChime(1174.66, 0.45, 0.28, 2); // D6
  setTimeout(() => playHarmonicChime(1760.0, 0.55, 0.32, 1.5), 160); // A6
  haptics.countdownEnd();
}

/**
 * Exercise start chime
 */
export function playExerciseStart(): void {
  playHarmonicChime(880, 0.25, 0.22, 1.5);
  setTimeout(() => playHarmonicChime(1318.51, 0.4, 0.26, 1.5), 100);
  haptics.light();
}

/**
 * Calming rest start chime
 */
export function playRestStart(): void {
  playHarmonicChime(784.0, 0.35, 0.2, 1.5); // G5
  setTimeout(() => playHarmonicChime(587.33, 0.45, 0.18, 1.5), 120); // D5
  haptics.restStart();
}

/**
 * Non-annoying, organic countdown tick (3, 2, 1)
 */
export function playCountdown(secondsLeft: number): void {
  const pitch = 550 + (3 - secondsLeft) * 120;
  playSoftTick(pitch, 0.16);
  haptics.tick();
}

/**
 * Uplifting Apple-achievement style acoustic arpeggio
 */
export function playWorkoutComplete(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playHarmonicChime(freq, 0.55, 0.24, 1.5);
    }, idx * 130);
  });
  haptics.complete();
}

export function playCompletionTone(): void {
  playHarmonicChime(784.0, 0.25, 0.2, 1.5);
  setTimeout(() => playHarmonicChime(1046.5, 0.45, 0.25, 1.5), 130);
  haptics.success();
}

export function playSetFlash(): void {
  playSoftTick(880, 0.15);
  haptics.tick();
}

export function playBoxingBell(): void {
  playRestEndAlarm();
}

// ─────────────────────────────────────────────────────────────
// ── Robust Speech Synthesis Engine for Android / iOS WebView ──
// ─────────────────────────────────────────────────────────────

let speechQueue: { text: string; pitch: number; rate: number; onEnd?: () => void }[] = [];
let isSpeakingNow = false;

function processQueue() {
  if (speechQueue.length === 0) {
    isSpeakingNow = false;
    return;
  }
  if (isAudioSilent() || !isVoiceAllowed()) {
    speechQueue = [];
    isSpeakingNow = false;
    return;
  }

  isSpeakingNow = true;
  const item = speechQueue.shift();
  if (!item) return;

  // 1. Android Native TTS Engine (Google Neural Spanish with Navigation Guidance Focus)
  if (Capacitor.isNativePlatform()) {
    NativeTTS.speak({
      text: item.text,
      rate: item.rate,
      pitch: item.pitch,
      flush: false,
    })
      .then(() => {
        if (item.onEnd) item.onEnd();
      })
      .catch((err) => {
        console.warn("NativeTTS error:", err);
      })
      .finally(() => {
        setTimeout(processQueue, 160);
      });
    return;
  }

  // 2. Web Speech API Fallback (Desktop / Browser dev)
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    if (!voicesLoaded) {
      loadVoicesNow();
      preloadVoicesInternal();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utter = new SpeechSynthesisUtterance(item.text);
    if (preferredVoice) {
      utter.voice = preferredVoice;
    }
    utter.lang = preferredVoice?.lang || "es-ES";
    utter.pitch = item.pitch;
    utter.rate = item.rate;
    utter.volume = 1.0;

    // Retain in global Set to prevent Chromium V8 garbage collection
    const globalSet = (window as any).__titaniumUtterances as Set<SpeechSynthesisUtterance>;
    if (globalSet) globalSet.add(utter);

    let finished = false;
    const finishUtterance = () => {
      if (finished) return;
      finished = true;
      if (globalSet) globalSet.delete(utter);
      if (item.onEnd) item.onEnd();
      setTimeout(processQueue, 140);
    };

    utter.onend = finishUtterance;
    utter.onerror = () => finishUtterance();

    // Safety timeout: if TTS engine hangs, unblock after 6s
    setTimeout(() => {
      if (!finished) finishUtterance();
    }, 6000);

    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.warn("TTS error:", err);
    setTimeout(processQueue, 100);
  }
}

export function speak(
  text: string,
  pitch: number = voicePitch,
  rate: number = voiceRate,
  clearQueueFirst = false,
): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (!text || !text.trim()) return;

  unlockAudio();

  if (clearQueueFirst) {
    speechQueue = [];
    if (Capacitor.isNativePlatform()) {
      NativeTTS.stop().catch(() => {});
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    isSpeakingNow = false;
  }

  speechQueue.push({ text: text.trim(), pitch, rate });
  if (!isSpeakingNow) {
    processQueue();
  }
}

export function speakWithQueue(
  text: string,
  priority: "normal" | "high" = "normal",
): void {
  speak(text, voicePitch, voiceRate, priority === "high");
}

export function stopSpeaking(): void {
  speechQueue = [];
  isSpeakingNow = false;
  if (Capacitor.isNativePlatform()) {
    NativeTTS.stop().catch(() => {});
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────
// ── Contextual Announcements (Voice + Chime Separation) ──────
// ─────────────────────────────────────────────────────────────

const MOTIVATION_CALLS = [
  "¡Buena serie! Tómate tu descanso.",
  "¡Serie lista! Respira hondo.",
  "¡Excelente trabajo! Recupérate.",
  "¡Bien hecho! Vamos a por la siguiente.",
];

export function announceExerciseComplete(): void {
  playCompletionTone();
  if (isVoiceAllowed() && !isAudioSilent()) {
    const phrase = MOTIVATION_CALLS[Math.floor(Math.random() * MOTIVATION_CALLS.length)];
    setTimeout(() => speak(phrase, voicePitch, 0.94), 220);
  }
}

export function announceExerciseStart(exerciseName?: string): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  if (isVoiceAllowed() && exerciseName) {
    setTimeout(() => speak(`A por ${exerciseName}`, voicePitch, 0.92), 220);
  }
}

export function announceNextExercise(name?: string): void {
  if (isAudioSilent()) return;
  playDoubleBeep();
  haptics.doubleTick();
  if (isVoiceAllowed() && name) {
    setTimeout(() => speak(`Siguiente ejercicio: ${name}`, voicePitch, 0.92), 220);
  }
}

export function announceWorkoutComplete(): void {
  playWorkoutComplete();
  if (isVoiceAllowed() && !isAudioSilent()) {
    setTimeout(() => speak("Entrenamiento completado. ¡Gran esfuerzo!", voicePitch, 0.90), 350);
  }
}

export function announceRest(seconds?: number): void {
  playRestStart();
  if (seconds && seconds > 0 && isVoiceAllowed()) {
    setTimeout(() => speak(`Descansa ${seconds} segundos`, voicePitch, 0.92), 200);
  }
}

export function announceCountdown(seconds: number): void {
  playCountdown(seconds);
  if (seconds <= 3 && seconds > 0 && isVoiceAllowed()) {
    const words: Record<number, string> = { 3: "tres", 2: "dos", 1: "uno" };
    speak(words[seconds] || String(seconds), voicePitch, 1.0, true);
  }
}

export function announceTenSecondsLeft(nextExerciseName?: string): void {
  if (isAudioSilent()) return;
  haptics.tick();
  if (isVoiceAllowed()) {
    const msg = nextExerciseName
      ? `Diez segundos. Prepárate para ${nextExerciseName}`
      : "Diez segundos";
    speak(msg, voicePitch, 0.94);
  }
}

export function announceHalfRest(secondsLeft: number): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  speak(`Quedan ${secondsLeft} segundos`, voicePitch, 0.92);
}

export function announceGetReady(name?: string): void {
  if (isAudioSilent()) return;
  playTripleBeep();
  if (isVoiceAllowed()) {
    speak(name ? `Prepárate para ${name}` : "Prepárate", voicePitch, 0.92);
  }
}

export function announceStart(): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  if (isVoiceAllowed()) {
    setTimeout(() => speak("¡A entrenar!", voicePitch, 0.96), 180);
  }
}

export function announceWarmupComplete(): void {
  playCompletionTone();
  if (isVoiceAllowed()) {
    setTimeout(() => speak("Calentamiento completado.", voicePitch, 0.92), 200);
  }
}

export function announceSetFlash(): void {
  playSetFlash();
}

export function announceWorkStart(): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  if (isVoiceAllowed()) {
    setTimeout(() => speak("¡Trabajo!", voicePitch, 0.94), 150);
  }
}

export function announceWorkEnd(): void {
  if (isAudioSilent()) return;
  playRestStart();
  if (isVoiceAllowed()) {
    setTimeout(() => speak("¡Tiempo!", voicePitch, 0.94), 150);
  }
}

export function announceCircuit(
  circuitNumber: number,
  totalCircuits: number,
): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (circuitNumber === totalCircuits && circuitNumber > 1) {
    speak("Último circuito. ¡Dalo todo!", voicePitch, 0.92);
  } else {
    speak(`Circuito ${circuitNumber} de ${totalCircuits}`, voicePitch, 0.92);
  }
}

export function announceSetsRemaining(remaining: number): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (remaining === 2) speak("Quedan 2 series", voicePitch, 0.92);
  else if (remaining === 1) speak("Última serie, dalo todo", voicePitch, 0.92);
}

export function announcePrepareNext(
  nextName: string,
  restSeconds?: number,
): void {
  if (isAudioSilent()) return;
  playDoubleBeep();
  haptics.doubleTick();
  if (!isVoiceAllowed()) return;
  const restText = restSeconds ? `Descanso de ${restSeconds} segundos. ` : "";
  speak(`${restText}Siguiente ejercicio: ${nextName}`, voicePitch, 0.92);
}

export function announceThirtySecondsLeft(): void {
  if (isAudioSilent()) return;
  haptics.tick();
  if (isVoiceAllowed()) {
    speak("Faltan 30 segundos", voicePitch, 0.92);
  }
}

export function announceHalfwayWorkout(): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  speak("Vas por la mitad del entrenamiento. Sigue así.", voicePitch, 0.90);
}
