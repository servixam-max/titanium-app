"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseWorkoutVoiceCommand, formatVoiceConfirmation, ParsedVoiceWorkout } from "@/lib/voice-parser";
import { speak } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface VoiceLoggerButtonProps {
  onParsed: (data: ParsedVoiceWorkout) => void;
  className?: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
    isFinal?: boolean;
  };
  length: number;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

interface IWindowSpeech {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export default function VoiceLoggerButton({ onParsed, className }: VoiceLoggerButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);

  const handleStop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = () => {
    const win = typeof window !== "undefined" ? (window as unknown as IWindowSpeech) : {};
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFeedbackMsg("Voz no disponible en este navegador");
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    try {
      handleStop();
      haptics.tick();

      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
        setFeedbackMsg(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = Array.from({ length: event.results.length })
          .map((_, idx) => event.results[idx][0].transcript)
          .join("");
        setTranscript(text);

        // If final result
        if (event.results[0]?.isFinal) {
          const parsed = parseWorkoutVoiceCommand(text);
          onParsed(parsed);

          const confirmation = formatVoiceConfirmation(parsed);
          setFeedbackMsg(confirmation);
          speak(confirmation, 1.0, 0.96);
          haptics.success();

          setTimeout(() => {
            setFeedbackMsg(null);
            setTranscript("");
          }, 3500);
        }
      };

      recognition.onerror = (err: { error: string }) => {
        console.warn("Speech recognition error:", err);
        handleStop();
        if (err.error === "not-allowed") {
          setFeedbackMsg("Permiso de micrófono denegado");
        } else if (err.error !== "no-speech") {
          setFeedbackMsg("No se pudo reconocer el audio");
        }
        setTimeout(() => setFeedbackMsg(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      handleStop();
      haptics.light();
    } else {
      startListening();
    }
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggleListening}
        className={cn(
          "relative flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer",
          isListening
            ? "bg-primary text-black border-primary shadow-[0_0_16px_rgba(0,214,143,0.8)] animate-pulse"
            : "bg-[#141b26] border-white/10 text-zinc-300 hover:text-white hover:border-primary/40"
        )}
        title={isListening ? "Detener micrófono" : "Dictar serie por voz (ej. '12 reps con 20 kilos')"}
        aria-label="Dictar por voz"
      >
        {isListening ? (
          <>
            <motion.div
              className="absolute -inset-1 rounded-xl border border-primary pointer-events-none"
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <Mic className="w-3.5 h-3.5 animate-bounce text-black" />
            <span className="tracking-wide">Escuchando...</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Dictar</span>
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
          </>
        )}
      </button>

      {/* Floating live transcript / feedback badge */}
      <AnimatePresence>
        {(transcript || feedbackMsg) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute left-0 -top-8 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e131d] border border-primary/40 shadow-xl text-[11px] font-mono text-white whitespace-nowrap pointer-events-none"
          >
            {feedbackMsg ? (
              <>
                <Check className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-primary font-bold">{feedbackMsg}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping flex-shrink-0" />
                <span className="text-zinc-300 italic truncate max-w-[200px]">
                  &ldquo;{transcript || "Habla ahora..."}&rdquo;
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
