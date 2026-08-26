"use client";

import { useState } from "react";
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
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const showFallback = !src || error;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-container flex items-center justify-center",
        containerClassName,
      )}
    >
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
          onError={() => setError(true)}
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
