"use client";

import { ReactNode } from "react";
import Atropos from "atropos/react";
import "atropos/css";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  activeOffset?: number;
  shadow?: boolean;
  highlight?: boolean;
  rotateXMax?: number;
  rotateYMax?: number;
}

export default function Card3D({
  children,
  className = "",
  activeOffset = 25,
  shadow = false,
  highlight = true,
  rotateXMax = 8,
  rotateYMax = 8,
}: Card3DProps) {
  return (
    <Atropos
      className={`atropos-custom select-none ${className}`}
      activeOffset={activeOffset}
      shadow={shadow}
      highlight={highlight}
      rotateXMax={rotateXMax}
      rotateYMax={rotateYMax}
    >
      {children}
    </Atropos>
  );
}
