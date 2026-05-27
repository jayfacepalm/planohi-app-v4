import React from "react";
import { Check } from "lucide-react";

interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onChange, label, className = "", onClick, ...props }, ref) => {
    
    const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) onClick(e);
      onChange(!checked);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={handleToggle}
        className={`flex items-center gap-3 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/20 focus-visible:rounded-lg p-1 -m-1 ${className}`}
        {...props}
      >
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center transition-all group-focus-visible:border-neon-cyan group-focus-visible:shadow-[0_0_10px_rgba(6,182,212,0.4)] ${
            checked
              ? "bg-neon-cyan border-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              : "border-white/20 group-hover:border-neon-cyan/50"
          }`}
        >
          {checked && (
            <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />
          )}
        </div>
        {label && (
          <span className="text-sm text-zinc-300 font-sans select-none group-hover:text-white transition-colors">
            {label}
          </span>
        )}
      </button>
    );
  }
);

Checkbox.displayName = "Checkbox";
