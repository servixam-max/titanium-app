// Haptic feedback utility with fallback for unsupported devices
// Patterns: success, error, tick, countdown, complete, light, doubleTick, restStart

export type HapticPattern =
  | "success"
  | "error"
  | "tick"
  | "countdown"
  | "complete"
  | "light"
  | "doubleTick"
  | "restStart";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  success: [80, 40, 80],
  error: [120, 60, 120, 60, 120],
  tick: 30,
  countdown: [50, 30, 50, 30, 100],
  complete: 300,
  light: 50,
  doubleTick: [40, 30, 40],
  restStart: 60,
};

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore unsupported vibration errors
  }
}

export function haptic(pattern: HapticPattern): void {
  vibrate(PATTERNS[pattern]);
}

// Convenience exports used by audio.ts and components
export const haptics = {
  success: () => haptic("success"),
  error: () => haptic("error"),
  tick: () => haptic("tick"),
  countdownEnd: () => haptic("countdown"),
  complete: () => haptic("complete"),
  light: () => haptic("light"),
  doubleTick: () => haptic("doubleTick"),
  restStart: () => haptic("restStart"),
};

export default haptics;
