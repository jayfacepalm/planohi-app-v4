import React from "react";
import { Metadata } from "next";
import { fetchApi } from "@/lib/api-client";
import { RsvpClient } from "./RsvpClient";
import { XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Invitation RSVP | Plano.hi",
  description: "Record your attendance response for this event workspace.",
};

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublicRsvpPage({ params }: PageProps) {
  const { token } = await params;
  
  let details: any = null;
  let errorMsg: string | null = null;

  try {
    // Call public lookup endpoint (runs server-side calling backend container directly)
    details = await fetchApi<any>(`/public/rsvp/${token}`);
  } catch (err: any) {
    console.error(`Failed to load public RSVP for token: ${token}`, err);
    errorMsg = err.message || "Invitation link is invalid, deactivated, or expired.";
  }

  if (errorMsg || !details) {
    return (
      <div className="min-h-screen bg-[#070708] relative overflow-hidden flex flex-col justify-center items-center px-4 py-12">
        {/* Glow red backdrops */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* SVG grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-40" />

        <div className="w-full max-w-md relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] font-mono tracking-widest uppercase">
            Security Blocked
          </div>

          <div className="bg-[#121214]/90 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-heading font-bold text-white uppercase tracking-wider">
                Invalid Request
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {errorMsg || "The invitation link you followed is invalid, deactivated, or does not exist."}
              </p>
            </div>
          </div>

          <div className="text-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            PLANO.HI SECURITY PROTOCOL
          </div>
        </div>
      </div>
    );
  }

  return <RsvpClient initialDetails={details} token={token} />;
}
