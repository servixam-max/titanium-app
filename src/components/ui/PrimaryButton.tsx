"use client";

import { cn } from "@/lib/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Botón del sistema: texto en caja baja y tipografía normal (antes iba en
 * monoespaciada mayúscula con tracking amplio, que es lo que daba el aire de
 * panel de control). Sin borde: la jerarquía la marca el relleno.
 */
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
    primary: "bg-primary text-black font-semibold",
    secondary: "fx-inset text-foreground font-semibold",
    danger: "bg-red-500/12 text-red-600 dark:text-red-400 font-semibold",
    ghost: "bg-transparent text-[color:var(--text-secondary)] hover:text-foreground font-medium",
  };

  const sizes = {
    sm: "h-[44px] text-[15px]",
    md: "h-[50px] text-[16px]",
    lg: "h-[54px] text-[17px]",
  };

  return (
    <button
      className={cn(
        "fx-press flex items-center justify-center gap-2 rounded-[var(--fx-radius-control)] disabled:opacity-50",
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
