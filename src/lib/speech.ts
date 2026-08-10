// Re-export everything from audio.ts for backward compatibility
export * from "./audio";
// Ensure voices preloaded is still exported as no-op
export function preloadVoices(): void {}
