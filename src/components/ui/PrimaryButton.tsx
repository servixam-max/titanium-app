"use client";

import { cn } from "@/lib/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function PrimaryButton({
  variant = "primary",
  size = "lg",
  fullWidth = true,
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}: PrimaryButtonProps) {
  const variants = {
    primary:
      "bg-primary-container text-on-primary border-primary-container shadow-neon hover:shadow-neon-strong",
    secondary:
      "bg-surface-container-high text-on-surface border-surface-container-highest hover:border-surface-variant",
    danger:
      "bg-surface-container-high text-error border-surface-container-highest",
    ghost:
      "bg-transparent text-on-surface-variant border-transparent hover:text-on-surface",
  };

  const sizes = {
    sm: "h-[44px] text-sm",
    md: "h-[52px] text-base",
    lg: "h-[64px] text-lg",
  };

  return (
    <button
      className={cn(
        "font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 border",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
