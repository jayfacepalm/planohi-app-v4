"use client";

import React, { useState } from "react";
import { Navbar } from "../ui/Navbar";
import { Footer } from "../ui/Footer";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { GlowCard } from "../ui/GlowCard";
import { Shield, Sparkles, AlertTriangle, CheckCircle, Copy, Key, Calendar } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

interface VoucherDetails {
  id: string;
  code: string;
  createdByAlias: string;
  activatedByAlias: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface AdminVouchersClientProps {
  initialVouchers: VoucherDetails[];
  userAlias?: string;
  userRole?: string;
}

export const AdminVouchersClient: React.FC<AdminVouchersClientProps> = ({
  initialVouchers,
  userAlias,
  userRole
}) => {
  const [vouchers, setVouchers] = useState<VoucherDetails[]>(initialVouchers);
  const [quantity, setQuantity] = useState("1");
  const [expiryOption, setExpiryOption] = useState("never");
  const [customExpiry, setCustomExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity of 1 or more.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setNewCodes([]);

    let expiresAt: string | null = null;
    if (expiryOption === "24h") {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (expiryOption === "7d") {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiryOption === "30d") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiryOption === "custom" && customExpiry) {
      expiresAt = customExpiry.toISOString();
    }

    try {
      const response = await fetchApi<any>("/vouchers/generate", {
        method: "POST",
        body: JSON.stringify({
          quantity: qty,
          expiresAt
        }),
      });

      setNewCodes(response || []);
      setSuccess(`Successfully generated ${qty} premium voucher codes!`);
      
      // Refresh list
      const updatedList = await fetchApi<VoucherDetails[]>("/vouchers");
      setVouchers(updatedList);
    } catch (err: any) {
      console.error("Voucher generation failed:", err);
      setError(err.data?.msg || err.message || "Failed to generate vouchers.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const navItems = [
    { label: "Dashboard", href: "/events" },
    { label: "Admin Panel", href: "/admin/vouchers", active: true }
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
      <main className="flex-1 flex flex-col justify-start items-center px-6 py-12 relative z-10 w-full max-w-5xl mx-auto space-y-12">
        
        {/* Admin Header */}
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-neon-purple">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Admin Console</span>
            </div>
            <h1 className="text-2xl font-heading font-extrabold tracking-wider bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent uppercase">
              Voucher Management
            </h1>
            <p className="text-xs text-zinc-400 font-sans">
              Generate and track premium activation keys for platform users.
            </p>
          </div>
        </div>

        {/* Top Grid: Generate panel & New codes list */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Column 1: Generation Form */}
          <GlowCard header="Generate Vouchers" className="md:col-span-5 relative z-20">

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6 text-xs text-red-400 font-sans flex items-start gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-6 text-xs text-emerald-400 font-sans flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-5">
              <Input
                id="quantity"
                label="Number of Codes"
                type="number"
                min="1"
                max="50"
                placeholder="e.g. 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={loading}
                required
              />

              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-sans">
                  Expiration Policy
                </label>
                <select
                  value={expiryOption}
                  onChange={(e) => setExpiryOption(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-zinc-300 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 transition-colors"
                >
                  <option value="never">Never Expire</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              {expiryOption === "custom" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <DatePicker
                    label="Custom Expiry Date"
                    selected={customExpiry}
                    onChange={(date) => setCustomExpiry(date)}
                    placeholder="Select expiry date"
                  />
                </div>
              )}

              <Button
                type="submit"
                variant="gradient"
                className="w-full py-2.5 bg-gradient-to-r from-neon-purple to-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] text-xs uppercase"
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Codes"}
              </Button>
            </form>
          </GlowCard>

          {/* Column 2: Newly Generated Codes Output */}
          <GlowCard header="Generated Codes" className="md:col-span-7 flex flex-col justify-start">
            
            {newCodes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-xl bg-[#07070a]/20">
                <span className="text-xs text-zinc-500 font-sans">
                  Generated codes will appear here for you to copy.
                </span>
              </div>
            ) : (
              <div className="flex-1 space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {newCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#0a0a0f] border border-white/5 rounded-lg px-4 py-2.5 font-mono text-xs text-zinc-300 hover:border-white/10 transition-colors"
                  >
                    <span className="tracking-wider select-all">{code}</span>
                    <button
                      onClick={() => handleCopy(code, idx)}
                      className="text-zinc-500 hover:text-neon-cyan p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copiedIndex === idx ? (
                        <span className="text-[10px] font-sans font-bold text-neon-cyan">Copied!</span>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlowCard>
        </div>

        {/* Voucher History Log */}
        <GlowCard header="Voucher Activation Log" className="w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-500 font-bold font-sans">
                  <th className="pb-3 pl-2">Created</th>
                  <th className="pb-3">Voucher Code</th>
                  <th className="pb-3">Expires At</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2">Activation User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-zinc-300 font-sans">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No voucher codes found.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => {
                    const createdDate = new Date(v.createdAt).toLocaleDateString();
                    const expiryDate = v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : "Never";
                    
                    let statusLabel = "Available";
                    let statusClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                    const isExpired = v.expiresAt ? new Date(v.expiresAt).getTime() < Date.now() : false;

                    if (v.activatedByAlias) {
                      statusLabel = "Activated";
                      statusClass = "bg-zinc-500/10 text-zinc-400 border-zinc-500/10";
                    } else if (isExpired) {
                      statusLabel = "Expired";
                      statusClass = "bg-red-500/10 text-red-400 border-red-500/20";
                    }

                    return (
                      <tr key={v.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3.5 pl-2 text-zinc-400">{createdDate}</td>
                        <td className="py-3.5 font-mono text-zinc-100 font-medium tracking-wide">{v.code}</td>
                        <td className="py-3.5 text-zinc-400">{expiryDate}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2">
                          {v.activatedByAlias ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-300">{v.activatedByAlias}</span>
                              <span className="text-[10px] text-zinc-500">
                                {v.activatedAt ? new Date(v.activatedAt).toLocaleDateString() : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GlowCard>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
