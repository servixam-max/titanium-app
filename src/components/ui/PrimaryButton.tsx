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
      "bg-primary hover:brightness-105 text-white border-primary/40 shadow-sm font-bold",
    secondary:
      "bg-white dark:bg-[#131626] text-slate-800 dark:text-white border-slate-200 dark:border-white/10 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#181d2e] shadow-sm",
    danger:
      "bg-red-50 dark:bg-gradient-to-br dark:from-[#2a1515] dark:to-[#1a1010] text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 shadow-sm",
    ghost:
      "bg-transparent text-slate-700 dark:text-slate-300 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5",
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
