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
      "bg-gradient-to-r from-primary to-emerald-400 text-black border-primary shadow-neon hover:brightness-110",
    secondary:
      "bg-gradient-to-br from-[#121620] to-[#151b28] text-white border-white/10 hover:border-primary/30 shadow-md",
    danger:
      "bg-gradient-to-br from-[#2a1515] to-[#1a1010] text-red-400 border-red-500/20 shadow-md",
    ghost:
      "bg-transparent text-zinc-400 border-transparent hover:text-white hover:bg-white/5",
  };

  const sizes = {
    sm: "h-[44px] text-sm",
    md: "h-[52px] text-base",
    lg: "h-[64px] text-lg",
  };

  return (
    <button
      className={cn(
        "font-mono font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 border",
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
