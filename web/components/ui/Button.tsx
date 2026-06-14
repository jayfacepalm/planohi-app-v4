import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className = "",
  disabled,
  isLoading = false,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-heading font-medium text-sm transition-all duration-200 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-50";
  
  const variantStyles = {
    primary: "bg-neon-purple text-white hover:bg-neon-purple/90 shadow-[0_0_15px_rgba(168,85,247,0.35)] hover:shadow-[0_0_22px_rgba(168,85,247,0.65)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none",
    secondary: "bg-neon-cyan text-[#070708] hover:bg-neon-cyan/90 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_22px_rgba(6,182,212,0.65)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none",
    ghost: "text-zinc-400 hover:text-white hover:bg-white/5",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.35)] hover:shadow-[0_0_22px_rgba(239,68,68,0.65)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none",
    gradient: "bg-gradient-to-r from-neon-purple to-neon-cyan text-white hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.01] disabled:from-zinc-850 disabled:to-zinc-900 disabled:text-zinc-500 disabled:shadow-none",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
      {children}
    </button>
  );
};

