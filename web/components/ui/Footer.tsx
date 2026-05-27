"use client";

import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto w-full border-t border-white/5 bg-black/40 py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500 font-mono">
        <span>&copy; {new Date().getFullYear()} PLANO.HI. ALL RIGHTS RESERVED.</span>
        <div className="flex items-center gap-6">
          <span className="hover:text-neon-cyan cursor-pointer transition-colors">STATUS: OPERATIONAL</span>
          <span className="hover:text-neon-purple cursor-pointer transition-colors">V4.0.0-BETA</span>
        </div>
      </div>
    </footer>
  );
};
