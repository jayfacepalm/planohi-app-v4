"use client";

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { fetchApi } from "../../lib/api-client";
import { Modal } from "../ui/Modal";
import { Check, X, ShieldAlert } from "lucide-react";

interface Invitation {
  id: string;
  eventId: string;
  eventTitle: string;
  inviterAlias: string;
  role: string;
  status: string;
}

interface InvitationsBannerProps {
  invitations: Invitation[];
}

export const InvitationsBanner: React.FC<InvitationsBannerProps> = ({ invitations: initialInvitations }) => {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (invitations.length === 0) return null;

  const handleRespond = async (invitationId: string, accept: boolean) => {
    setLoadingId(invitationId);
    try {
      await fetchApi<any>(`/curators/invitations/${invitationId}/respond`, {
        method: "POST",
        body: JSON.stringify({ accept }),
      });
      // Remove from list
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      // Reload page to reflect accepted events in listing
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to respond to invitation:", err);
      setErrorMessage(err.message || "Failed to respond to invitation. Please try again.");
      setErrorModalOpen(true);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="relative overflow-hidden rounded-2xl border border-neon-purple/20 bg-gradient-to-r from-neon-purple/10 via-[#0c0a12]/80 to-neon-cyan/5 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_20px_rgba(168,85,247,0.15)] animate-in fade-in slide-in-from-top-4 duration-300"
        >
          {/* Glassmorphism gradient accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-cyan/5 rounded-full blur-[50px] pointer-events-none" />

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center text-neon-purple shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-heading font-extrabold text-white tracking-wide">
                Workspace Invitation
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                <strong className="text-white">{inv.inviterAlias}</strong> has invited you to join the event workspace{" "}
                <strong className="text-neon-cyan">"{inv.eventTitle}"</strong> as a{" "}
                <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                  {inv.role.toLowerCase()}
                </span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <Button
              variant="ghost"
              onClick={() => handleRespond(inv.id, false)}
              disabled={loadingId === inv.id}
              className="px-4 py-1.5 border border-white/5 hover:border-red-500/20 hover:bg-red-500/5 text-zinc-400 hover:text-red-400 text-xs font-semibold uppercase tracking-wider h-auto flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </Button>
            <Button
              variant="gradient"
              onClick={() => handleRespond(inv.id, true)}
              disabled={loadingId === inv.id}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider h-auto flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              <Check className="w-3.5 h-3.5" />
              Accept Access
            </Button>
          </div>
        </div>
      ))}

      {/* Error Alert Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Action Failed"
        footer={
          <Button variant="primary" onClick={() => setErrorModalOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="text-sm text-zinc-300">
          {errorMessage}
        </p>
      </Modal>
    </div>
  );
};
