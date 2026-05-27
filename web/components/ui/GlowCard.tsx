"use client";

import React, { useRef, useEffect } from "react";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: string;
  actions?: React.ReactNode;
}

export const GlowCard: React.FC<GlowCardProps> = ({ children, header, actions, className = "", ...props }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    };

    card.addEventListener("mousemove", handleMouseMove);
    return () => card.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`relative rounded-xl border border-white/5 overflow-visible transition-all duration-300 bg-[#121214] hover:border-neon-cyan/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_-15px_rgba(168,85,247,0.35)] before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 before:bg-[radial-gradient(400px_circle_at_var(--mouse-x,0px)_var(--mouse-y,0px),rgba(168,85,247,0.12)_0%,rgba(6,182,212,0.04)_50%,transparent_100%)] before:z-1 ${className}`}
      {...props}
    >
      <div className="relative z-10 p-6 flex flex-col h-full justify-between">
        <div>
          {header && (
            <h3 className="text-lg font-heading font-bold text-neon-cyan mb-4 uppercase tracking-wider">
              {header}
            </h3>
          )}
          {children}
        </div>
        {actions && (
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
