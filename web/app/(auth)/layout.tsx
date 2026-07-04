import React from "react";
import { Footer } from "@/components/ui/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070708] text-[#f4f4f5] selection:bg-neon-purple selection:text-white relative overflow-hidden">
      {/* Background Decorative Cyber-Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Thin grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center items-center px-1 md:px-6 py-12 relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold font-heading tracking-wider bg-gradient-to-r from-neon-purple to-neon-cyan bg-clip-text text-transparent">
            PLANO.HI
          </h1>
          <span className="text-xs text-zinc-500 font-mono tracking-widest mt-1 block uppercase">
            Event Coordination Network
          </span>
        </div>

        {children}
      </main>

      <Footer />
    </div>
  );
}
