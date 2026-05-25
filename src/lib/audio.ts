// Audio utility using Web Audio API - generates tones without external files
// Compatible with all modern browsers and mobile devices

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function resumeContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    return ctx.resume();
  }
  return Promise.resolve();
}

export function playBeep(
  frequency: number = 880,
  duration: number = 0.15,
  type: OscillatorType = "sine",
  volume: number = 0.3
): void {
  try {
    resumeContext().then(() => {
      const ctx = getAudioContext();
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
  } catch {
    // Audio not available, ignore silently
  }
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
  // Victory arpeggio
  playBeep(523, 0.15, "sine", 0.2);   // C5
  setTimeout(() => playBeep(659, 0.15, "sine", 0.2), 150);  // E5
  setTimeout(() => playBeep(784, 0.15, "sine", 0.2), 300);  // G5
  setTimeout(() => playBeep(1047, 0.3, "sine", 0.2), 450); // C6
}

export function playRestEndAlarm(): void {
  // Insistent alarm for rest ending
  playBeep(800, 0.2, "square", 0.15);
  setTimeout(() => playBeep(800, 0.2, "square", 0.15), 250);
  setTimeout(() => playBeep(1000, 0.3, "sine", 0.2), 500);
}

export function playExerciseStart(): void {
  // "Let's go" - two quick ascending beeps
  playBeep(880, 0.08, "sine", 0.2);
  setTimeout(() => playBeep(1100, 0.12, "sine", 0.25), 100);
}

export function playRestStart(): void {
  // Deep "relax" tone
  playBeep(500, 0.3, "sine", 0.15);
}

export function playCountdown(secondsLeft: number): void {
  // Increasing pitch as countdown gets closer
  const freq = 600 + (3 - secondsLeft) * 200; // 800, 1000, 1200
  playBeep(freq, 0.12, "sine", 0.25);
}

export function playWorkoutComplete(): void {
  // Victory fanfare
  playBeep(523, 0.15, "sine", 0.2);
  setTimeout(() => playBeep(659, 0.15, "sine", 0.2), 150);
  setTimeout(() => playBeep(784, 0.15, "sine", 0.2), 300);
  setTimeout(() => playBeep(1047, 0.4, "sine", 0.25), 450);
}
