import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "cyan" | "purple" | "amber" | "red";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "cyan",
  className = ""
}) => {
  const variantStyles = {
    cyan: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20",
    purple: "bg-neon-purple/10 text-neon-purple border-neon-purple/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
