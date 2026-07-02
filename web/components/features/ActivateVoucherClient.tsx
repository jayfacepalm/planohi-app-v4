"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "../ui/Navbar";
import { Footer } from "../ui/Footer";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Gift, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

interface ActivateVoucherClientProps {
  userAlias?: string;
  userRole?: string;
}

export const ActivateVoucherClient: React.FC<ActivateVoucherClientProps> = ({
  userAlias,
  userRole
}) => {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a voucher code.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchApi<any>("/vouchers/activate", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });

      setSuccess(response?.msg || "Premium features activated successfully!");
      setCode("");
      
      // Delay routing to let the success state render
      setTimeout(() => {
        // Force session cookies sync and redirect
        window.location.href = "/events";
      }, 2000);
    } catch (err: any) {
      console.error("Voucher activation failed:", err);
      if (err.data && err.data.msg) {
        setError(err.data.msg);
      } else {
        setError(err.message || "Failed to activate voucher. Please check code validity.");
      }
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/events" },
    { label: "Activate Voucher", href: "/activate-voucher", active: true }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070708] text-[#f4f4f5] selection:bg-neon-purple selection:text-white relative overflow-hidden">
      {/* Background Decorative Cyber-Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Thin grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Navbar header */}
      <Navbar navItems={navItems} userAlias={userAlias} userRole={userRole} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-1 md:px-6 py-16 relative z-10 w-full max-w-md mx-auto">
        <div className="w-full border border-white/5 bg-[#0f0f15]/60 backdrop-blur-xl rounded-2xl p-8 shadow-[0_15px_35px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          {/* Card Ambient Glow Line */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent group-hover:via-neon-cyan transition-all duration-500" />
          
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan shadow-[0_0_15px_rgba(6,182,212,0.1)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all duration-300">
              <Gift className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl font-heading font-extrabold tracking-wider bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent uppercase">
              Activate Voucher
            </h1>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed px-2">
              Upgrade your account tier. Enter your alphanumeric code to lift event caps and guest limit guardrails instantly.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mb-6 text-xs text-red-400 font-sans flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 mb-6 text-xs text-emerald-400 font-sans flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold">Upgrade Success!</span>
                <span className="text-[10px] text-zinc-400 mt-1">Syncing session and redirecting you to your events...</span>
              </div>
            </div>
          )}

          <form onSubmit={handleActivate} className="space-y-6">
            <Input
              id="voucher-code"
              label="Voucher Code"
              type="text"
              placeholder="e.g. PLANOHI-PREM-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading || success !== null}
              className="text-center font-mono uppercase tracking-widest text-sm"
              required
            />

            <Button
              type="submit"
              variant="gradient"
              className="w-full flex items-center justify-center gap-2 py-2.5"
              disabled={loading || success !== null}
            >
              {loading ? "Verifying code..." : success ? "Activated!" : "Upgrade to Premium"}
              {!loading && !success && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
