// Audio utility using Web Audio API + Speech Synthesis
// Optimised for Capacitor WebView on Android (needs user-gesture unlock)
// Includes pre-recorded MP3 voice fallback because WebView TTS is unreliable.

import { haptics } from "./haptics";

const VOICE_BASE_PATH = "/audio/voice/";
const voiceCache = new Map<string, AudioBuffer>();

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let isMuted = false;
let voiceRate = 0.92;
let voicePitch = 1.0;
let preferredVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;
let voicesLoadAttempts = 0;

export type AudioMode = "full" | "beeps" | "voice" | "silent";
let audioMode: AudioMode = "full";

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

async function loadVoiceFile(name: string): Promise<AudioBuffer | null> {
  if (typeof window === "undefined") return null;
  if (voiceCache.has(name)) return voiceCache.get(name) || null;
  const ctx = getAudioContext();
  if (!ctx) return null;
  try {
    const resp = await fetch(`${VOICE_BASE_PATH}${name}.mp3`);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(buf);
    voiceCache.set(name, audioBuf);
    return audioBuf;
  } catch {
    return null;
  }
}

async function playVoiceFile(name: string, volume: number = 1): Promise<void> {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  await resumeContext();
  const buf = await loadVoiceFile(name);
  if (!buf) return;
  const source = ctx.createBufferSource();
  source.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
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
  const esVoices = voices.filter((v) => v.lang.startsWith("es"));
  return (
    esVoices.find((v) => /neural|premium|enhanced|natural/i.test(v.name)) ||
    esVoices.find((v) => v.name.includes("Google")) ||
    esVoices.find((v) => v.lang === "es-ES" && v.localService) ||
    esVoices.find((v) => v.lang === "es-ES") ||
    esVoices.find((v) => v.lang.startsWith("es")) ||
    voices.find(
      (v) => v.lang.startsWith("en") && /neural|Google/i.test(v.name),
    ) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0] ||
    null
  );
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
  audioUnlocked = true;

  resumeContext().catch(() => {});

  // Warm up speech synthesis with a real but tiny utterance inside the user gesture.
  // WebView allows subsequent speaks from timers once the engine has been primed.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      preloadVoicesInternal();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      const utter = new SpeechSynthesisUtterance("ok");
      utter.volume = 0.01;
      utter.rate = 1.8;
      if (preferredVoice) utter.voice = preferredVoice;
      utter.lang = preferredVoice?.lang || "es-ES";
      // No cancel — cancel often deadlocks WebView TTS.
      window.speechSynthesis.speak(utter);
    } catch {}
  }
}

// Attach listeners once
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
  peak: number,
) {
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.setValueAtTime(peak, now + attack + sustain);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + attack + sustain + release,
  );
}

export function playTone(
  frequency: number = 880,
  duration: number = 0.2,
  type: OscillatorType = "sine",
  volume: number = 0.25,
  harmonic?: number,
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
  volume: number = 0.3,
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

export function playBoxingBell(volume: number = 0.3): void {
  if (isAudioSilent() || !isBeepAllowed()) return;
  try {
    resumeContext().then(() => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Synthesized metallic boxing bell harmonics: fundamental (587Hz / D5), octave, 3rd, and strike tone
      const freqs = [587, 1174, 1761, 293];
      const gains = [volume * 0.7, volume * 0.4, volume * 0.2, volume * 0.8];
      
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 3 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(gains[idx], now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.9);
      });
    });
  } catch {}
}

export function playRestEndAlarm(): void {
  playBoxingBell(0.35);
  setTimeout(() => playBoxingBell(0.38), 280);
  haptics.countdownEnd();
}

export function playExerciseStart(): void {
  playTone(880, 0.12, "sine", 0.25, 2);
  setTimeout(() => playTone(1175, 0.18, "sine", 0.3, 2), 120);
  haptics.light();
}

export function playRestStart(): void {
  playTone(440, 0.25, "triangle", 0.2, 1.5);
  setTimeout(() => playTone(330, 0.35, "sine", 0.18), 100);
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

// ── Speech Synthesis (WebView-safe) ──

function doSpeak(text: string, pitch: number, rate: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (isAudioSilent() || !isVoiceAllowed()) return;

  // Load voices and unlock audio context
  if (!voicesLoaded) {
    loadVoicesNow();
    preloadVoicesInternal();
  }
  unlockAudio();
  resumeContext().then(() => {
    try {
      // Android WebView TTS works better when we do NOT cancel first.
      // Cancelling often kills the engine state and the next utterance is dropped.
      const utter = new SpeechSynthesisUtterance(text);
      if (preferredVoice) utter.voice = preferredVoice;
      utter.lang = preferredVoice?.lang || "es-ES";
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = 1;

      // Force resume (required for Chrome/WebView)
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();

      window.speechSynthesis.speak(utter);
    } catch {
      // WebView TTS is unreliable; silently fail and rely on MP3 fallback
    }
  });
}

export function speak(
  text: string,
  pitch: number = voicePitch,
  rate: number = voiceRate,
): void {
  // Prefer pre-recorded MP3 voice files — WebView TTS is too unreliable.
  if (typeof window === "undefined") return;
  const map: Record<string, string> = {
    "Serie completada": "serie_completada",
    "Última serie, dalo todo": "ultima_serie",
    "Quedan 2 series": "quedan_dos",
    "Entrenamiento completado. Buen trabajo.": "entrenamiento_completado",
    "Calentamiento completado.": "calentamiento_completado",
    Prepárate: "preparate",
    tres: "tres",
    dos: "dos",
    uno: "uno",
    "Siguiente ejercicio": "siguiente_ejercicio",
    "A entrenar.": "a_entrenar",
    "Diez segundos": "diez_segundos",
    "Faltan 30 segundos": "faltan_30",
    "Vas por la mitad del entrenamiento. Sigue así.": "vas_por_la_mitad",
    "¡Trabajo!": "trabajo",
    "¡Tiempo!": "tiempo",
    "Circuito uno": "circuito_uno",
    "Circuito dos": "circuito_dos",
    "Circuito tres": "circuito_tres",
    "Último circuito. ¡Dalo todo!": "ultimo_circuito",
  };
  const key = map[text.trim()];
  if (key) {
    playVoiceFile(key).catch(() => doSpeak(text, pitch, rate));
    return;
  }
  // For dynamic text (names, reps, weights) fall back to TTS
  doSpeak(text, pitch, rate);
}

export function speakWithQueue(
  text: string,
  priority: "normal" | "high" = "normal",
): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  if (priority === "high") {
    stopSpeaking();
  }
  speak(text);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// ── Announcements (voice + beep + vibration) ──

const MOTIVATION_COMPLETE_CALLS = [
  "¡Buena serie! Tómate tu descanso.",
  "¡Serie completada, gran esfuerzo!",
  "¡Excelente trabajo! Recupérate.",
  "¡Serie lista, a por la siguiente!",
];

export function announceExerciseComplete(): void {
  playCompletionTone();
  const phrase =
    MOTIVATION_COMPLETE_CALLS[
      Math.floor(Math.random() * MOTIVATION_COMPLETE_CALLS.length)
    ];
  speak(phrase, voicePitch, 0.94);
}

export function announceExerciseStart(): void {
  if (isAudioSilent()) return;
  playExerciseStart();
}

export function announceNextExercise(name?: string): void {
  if (isAudioSilent()) return;
  playDoubleBeep();
  haptics.doubleTick();
  if (isVoiceAllowed()) {
    if (name) {
      speak(`Siguiente: ${name}`, voicePitch, 0.92);
    } else {
      playVoiceFile("siguiente_ejercicio");
    }
  }
}

export function announceWorkoutComplete(): void {
  playWorkoutComplete();
  speak("Entrenamiento completado. Buen trabajo.", voicePitch, 0.90);
}

export function announceRest(seconds?: number): void {
  playRestStart();
  if (seconds && seconds > 0 && isVoiceAllowed()) {
    speak(`Descansa ${seconds} segundos`, voicePitch, 0.92);
  }
}

export function announceCountdown(seconds: number): void {
  playCountdown(seconds);
  if (seconds <= 3 && seconds > 0 && isVoiceAllowed()) {
    const words: Record<number, string> = { 3: "tres", 2: "dos", 1: "uno" };
    speak(words[seconds] || String(seconds), voicePitch, 0.92);
  }
}

// Aviso hablado a los 10 segundos restantes (solo voz, sin tono invasivo)
export function announceTenSecondsLeft(): void {
  if (isAudioSilent()) return;
  haptics.tick();
  speak("Diez segundos", voicePitch, 0.92);
}

// Aviso a mitad del descanso largo (>= 60s)
export function announceHalfRest(secondsLeft: number): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  speak(`Quedan ${secondsLeft} segundos de descanso`, voicePitch, 0.92);
}

// Aviso de preparación al final del calentamiento
export function announceGetReady(name?: string): void {
  if (isAudioSilent()) return;
  playTripleBeep();
  if (isVoiceAllowed())
    speak(name ? `Prepárate. ${name}` : "Prepárate", voicePitch, 0.92);
}

export function announceStart(): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  speak("A entrenar.", voicePitch, 0.92);
}

export function announceWarmupComplete(): void {
  playCompletionTone();
  speak("Calentamiento completado.", voicePitch, 0.92);
}

export function announceSetFlash(): void {
  playSetFlash();
}

// ── HIIT work-interval cues ──

/** "¡Trabajo!" — plays at the start of a timed work interval */
export function announceWorkStart(): void {
  if (isAudioSilent()) return;
  playExerciseStart();
  if (isVoiceAllowed())
    playVoiceFile("trabajo").catch(() => doSpeak("¡Trabajo!", voicePitch, 0.92));
}

/** "¡Tiempo!" — plays when a timed work interval ends */
export function announceWorkEnd(): void {
  if (isAudioSilent()) return;
  playRestStart();
  if (isVoiceAllowed())
    playVoiceFile("tiempo").catch(() => doSpeak("¡Tiempo!", voicePitch, 0.92));
}

/** Circuit cue for HIIT: "Circuito uno/dos/tres", last one says "¡Dalo todo!" */
export function announceCircuit(
  circuitNumber: number,
  totalCircuits: number,
): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  const keys: Record<number, string> = {
    1: "circuito_uno",
    2: "circuito_dos",
    3: "circuito_tres",
  };
  const fallback = `Circuito ${circuitNumber}`;
  if (circuitNumber === totalCircuits && circuitNumber > 1) {
    playVoiceFile("ultimo_circuito").catch(() =>
      doSpeak("Último circuito. ¡Dalo todo!", voicePitch, 0.92),
    );
    return;
  }
  const key = keys[circuitNumber];
  if (key) playVoiceFile(key).catch(() => doSpeak(fallback, voicePitch, 0.92));
  else
    doSpeak(`Circuito ${circuitNumber} de ${totalCircuits}`, voicePitch, 0.92);
}

// ── Contextual workout announcements (Task B2) ──

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
  speak(`${restText}Prepara ${nextName}`, voicePitch, 0.92);
}

export function announceThirtySecondsLeft(): void {
  if (isAudioSilent()) return;
  haptics.tick();
  speak("Faltan 30 segundos", voicePitch, 0.92);
}

export function announceHalfwayWorkout(): void {
  if (isAudioSilent() || !isVoiceAllowed()) return;
  speak("Vas por la mitad del entrenamiento. Sigue así.", voicePitch, 0.90);
}
