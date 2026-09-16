"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ExerciseImageProps {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  priority?: boolean;
  size?: "sm" | "default";
}

export default function ExerciseImage({
  src,
  alt,
  className,
  containerClassName,
  fallbackIcon,
  priority = true,
  size = "default",
}: ExerciseImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync with incoming src changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasTriedFallback(false);
    setError(false);
    setIsLoaded(false);
  }, [src]);

  const handleError = useCallback(() => {
    if (!hasTriedFallback && currentSrc) {
      setHasTriedFallback(true);
      // If a thumbnail failed, try original screen.webp
      if (currentSrc.includes("-sm.")) {
        setCurrentSrc(currentSrc.replace("-sm.", "."));
        return;
      }
    }
    setError(true);
  }, [hasTriedFallback, currentSrc]);

  // Handle immediate cache hits or loaded state
  const checkLoadedState = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      if (img.complete) {
        if (img.naturalWidth > 0) {
          setIsLoaded(true);
        } else if (img.naturalWidth === 0 && img.src) {
          handleError();
        }
      }
    },
    [handleError],
  );

  // Ref callback to detect instantly cached images on mount
  const setImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node) {
        checkLoadedState(node);
      }
    },
    [checkLoadedState],
  );

  // Re-check when currentSrc changes
  useEffect(() => {
    if (imgRef.current) {
      checkLoadedState(imgRef.current);
    }
  }, [currentSrc, checkLoadedState]);

  // Safety watchdog timer: never leave the user stuck with an infinite loading shimmer
  useEffect(() => {
    if (isLoaded || error || !currentSrc) return;

    const timer = setTimeout(() => {
      if (imgRef.current) {
        if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setIsLoaded(true);
        } else {
          // If after 1.5s the image still didn't load, display fallback icon
          setError(true);
        }
      } else {
        setError(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoaded, error, currentSrc]);

  const showFallback = !currentSrc || error;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#0d101a] flex items-center justify-center rounded-[inherit]",
        containerClassName,
      )}
    >
      {!showFallback ? (
        <>
          {/* Shimmer loading skeleton until image finishes loading */}
          {!isLoaded && (
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-[#131626] via-[#1a2238] to-[#131626] bg-[length:200%_100%] rounded-[inherit] z-0" />
          )}
          <img
            ref={setImgRef}
            src={currentSrc}
            alt={alt}
            loading={priority ? "eager" : "eager"}
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            className={cn(
              "w-full h-full object-cover block will-change-transform transition-opacity duration-300 rounded-[inherit] relative z-10",
              isLoaded ? "opacity-100" : "opacity-0",
              className,
            )}
            srcSet={
              size === "sm" && currentSrc?.includes("/images/exercises/") && !currentSrc.includes("-sm.")
                ? `${currentSrc.replace("/screen.", "/screen-sm.")} 1x, ${currentSrc} 2x`
                : undefined
            }
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-primary/40 rounded-[inherit]">
          {fallbackIcon ?? (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14L4.14 5.57L2 7.71L3.43 9.14L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22L14.86 20.57L16.29 22L18.43 19.86L19.86 21.29L21.29 19.86L19.86 18.43L22 16.29L20.57 14.86Z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
