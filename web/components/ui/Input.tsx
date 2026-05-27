import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={id} 
            className="text-xs text-zinc-400 block mb-1.5 font-heading tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full bg-[#18181b] border rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none transition-all font-sans text-sm
            ${error 
              ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.25)]" 
              : "border-white/10 focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 mt-1.5 font-medium flex items-center gap-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
