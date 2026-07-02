import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { Button } from "@/components/ui/Button";
import { GlowCard } from "@/components/ui/GlowCard";
import { PiggyBank, Calendar, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const actions = (
    <div className="flex items-center gap-3">
      <Link href="/login">
        <Button variant="ghost" className="px-4 py-1.5 text-xs h-auto cursor-pointer">
          Sign In
        </Button>
      </Link>
      <Link href="/register">
        <Button variant="gradient" className="px-4 py-1.5 text-xs h-auto cursor-pointer">
          Create Account
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070708] text-[#f4f4f5] selection:bg-neon-purple selection:text-white relative overflow-hidden">
      {/* Background Decorative Cyber-Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Thin grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Navbar header */}
      <Navbar actions={actions} />

      {/* Main hero section */}
      <main className="flex-1 flex flex-col items-center px-1 md:px-6 py-16 md:py-24 relative z-10 w-full max-w-7xl mx-auto">
        <div className="text-center max-w-3xl space-y-6 mb-16 md:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan text-xs font-mono font-medium tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Event Coordination
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-extrabold text-white tracking-tight leading-[1.1] md:leading-[1.15]">
            Coordinate Events. <br />
            <span className="bg-gradient-to-r from-neon-purple via-pink-500 to-neon-cyan bg-clip-text text-transparent">
              Master Your Budgets.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 font-sans leading-relaxed max-w-2xl mx-auto">
            Plano.hi is a premium workspace for organizing milestones, managing component budgets, and tracking guest RSVPs with dynamic aggregation and zero N+1 latency.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link href="/register">
              <Button variant="gradient" className="px-8 py-3 text-sm font-semibold tracking-wider uppercase h-auto flex items-center gap-2 group cursor-pointer">
                Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="px-8 py-3 text-sm font-semibold tracking-wider uppercase h-auto border border-white/10 hover:border-white/20 cursor-pointer">
                Sign In to Canvas
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
          <GlowCard className="border border-white/5 bg-[#121214]/60 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center text-neon-purple">
                <PiggyBank className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Dynamic Budgeting</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Define custom categories (Venue, Catering, AV Setup) and estimate costs. Budgets compute dynamically on the database level via aggregated left-join queries.
              </p>
            </div>
          </GlowCard>

          <GlowCard className="border border-white/5 bg-[#121214]/60 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Interactive Workspaces</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Track dates using single-day or multi-day range pickers, debounced search filters, and secure local file uploads for cover banners.
              </p>
            </div>
          </GlowCard>

          <GlowCard className="border border-white/5 bg-[#121214]/60 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Protected Assets</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Secure your files with cookie authorization for workspaces, and dynamic guest tokens that grant access specifically to public invitation pages.
              </p>
            </div>
          </GlowCard>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
