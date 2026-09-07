"use client";

import React, { useRef, useState, ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  activeOffset?: number;
  shadow?: boolean;
  highlight?: boolean;
  rotateXMax?: number;
  rotateYMax?: number;
}

export default function Card3D({
  children,
  className = "",
  onClick,
  highlight = true,
  rotateXMax = 7,
  rotateYMax = 7,
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth spring physics for natural tactile tilt
  const springConfig = { damping: 20, stiffness: 260 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [rotateXMax, -rotateXMax]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-rotateYMax, rotateYMax]);

  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const normX = clientX / rect.width - 0.5;
    const normY = clientY / rect.height - 0.5;

    x.set(normX);
    y.set(normY);

    if (highlight) {
      setGlarePos({
        x: (clientX / rect.width) * 100,
        y: (clientY / rect.height) * 100,
        opacity: 0.2,
      });
    }
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
    if (highlight) {
      setGlarePos((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  return (
    <div style={{ perspective: 1000 }} className={`relative ${className}`}>
      <motion.div
        ref={cardRef}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={onClick}
        whileTap={{ scale: 0.985 }}
        className="w-full relative select-none"
      >
        {children}

        {/* Dynamic Glare Overlay - pointer-events-none prevents blocking clicks */}
        {highlight && (
          <div
            className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300 z-20"
            style={{
              opacity: glarePos.opacity,
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 65%)`,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
