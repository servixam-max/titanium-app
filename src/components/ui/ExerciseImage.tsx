"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ExerciseImageProps {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean;
}

export default function ExerciseImage({
  src,
  alt,
  className,
  containerClassName,
  fallbackIcon,
  priority = false,
}: ExerciseImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasTriedFallback(false);
    setError(false);
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    if (!hasTriedFallback && currentSrc) {
      setHasTriedFallback(true);
      if (currentSrc.endsWith(".webp")) {
        setCurrentSrc(currentSrc.replace(".webp", ".jpg"));
        return;
      }
      if (currentSrc.endsWith(".jpg")) {
        setCurrentSrc(currentSrc.replace(".jpg", ".webp"));
        return;
      }
    }
    setError(true);
  };

  const showFallback = !currentSrc || error;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-container flex items-center justify-center",
        containerClassName,
      )}
    >
      {!showFallback && (
        <img
          src={currentSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
          onError={handleError}
          onLoad={() => setLoaded(true)}
        />
      )}
      {(!loaded || showFallback) && (
        <div className="absolute inset-0 flex items-center justify-center text-primary-container/30">
          {fallbackIcon ?? (
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
