"use client";

import React, { useEffect } from "react";
import { GlowCard } from "../../../components/ui/GlowCard";
import { Button } from "../../../components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface RegisterErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RegisterError({ error, reset }: RegisterErrorProps) {
  useEffect(() => {
    // Log the error for debugging or reporting
    console.error("Register route error captured:", error);
  }, [error]);

  return (
    <div className="w-full max-w-md">
      <GlowCard header="ERROR / DEVIATION DETECTED">
        <div className="space-y-6 text-center py-4">
          <div className="flex flex-col items-center">
            {/* Cyberpunk hazard/error symbol */}
            <div className="w-16 h-16 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold font-heading text-white">Interface Load Failure</h2>
            <p className="text-xs text-zinc-400 mt-2 font-sans max-w-xs leading-relaxed">
              An error occurred during registration routing:
            </p>
            <div className="w-full mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-[10px] text-red-400 font-mono text-left break-all select-all">
              {error.message || "Unknown routing failure"}
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => reset()}
              variant="gradient"
              className="w-full py-2.5 font-sans font-semibold tracking-wide"
            >
              Reinitialize Registration
            </Button>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
