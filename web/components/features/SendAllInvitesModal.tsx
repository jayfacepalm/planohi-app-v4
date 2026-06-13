"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { DatePicker } from "../ui/DatePicker";
import { Send, Calendar, Clock, AlertTriangle } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

interface SendAllInvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess: () => void;
  pendingCount: number;
}

export const SendAllInvitesModal: React.FC<SendAllInvitesModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  pendingCount,
}) => {
  const [sendMode, setSendMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    
    let scheduledTimeStr: string | null = null;

    if (sendMode === "scheduled") {
      if (!scheduledDate) {
        setError("Please select a date and time for the schedule");
        return;
      }
      if (scheduledDate.getTime() <= Date.now()) {
        setError("Scheduled date and time must be in the future");
        return;
      }
      scheduledTimeStr = scheduledDate.toISOString();
    }

    setLoading(true);

    try {
      await fetchApi<any>(`/events/${eventId}/invitees/send-all`, {
        method: "POST",
        body: JSON.stringify({
          scheduledTime: scheduledTimeStr,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.data && err.data.msg) {
        setError(err.data.msg);
      } else {
        setError(err.message || "Failed to process bulk invitation request");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setScheduledDate(null);
    setSendMode("immediate");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="SEND ALL INVITATIONS"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={loading || pendingCount === 0}
            className="flex items-center gap-1.5 font-semibold"
          >
            <Send className="w-4 h-4" />
            {loading ? "Sending..." : sendMode === "immediate" ? "Send Now" : "Schedule"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-zinc-400 font-sans leading-relaxed">
          Send RSVP invitation emails to all <span className="text-neon-cyan font-bold font-mono">{pendingCount}</span> pending guests with configured email addresses.
        </p>

        {pendingCount === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex gap-2 text-xs text-yellow-400 font-sans">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">No pending guests found:</span> You don't have any guests with "Pending" status who have email addresses.
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {/* Send Immediately Option */}
          <button
            type="button"
            onClick={() => setSendMode("immediate")}
            disabled={loading}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all cursor-pointer ${
              sendMode === "immediate"
                ? "bg-neon-cyan/5 border-neon-cyan text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "bg-[#121214] border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
            }`}
          >
            <Send className={`w-5 h-5 ${sendMode === "immediate" ? "text-neon-cyan" : "text-zinc-400"}`} />
            <div className="text-left w-full">
              <span className="text-xs font-bold block mb-0.5">Send Immediately</span>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Deliver invitations to all pending guests right away.
              </span>
            </div>
          </button>

          {/* Schedule Option */}
          <button
            type="button"
            onClick={() => setSendMode("scheduled")}
            disabled={loading}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all cursor-pointer ${
              sendMode === "scheduled"
                ? "bg-neon-purple/5 border-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                : "bg-[#121214] border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200"
            }`}
          >
            <Clock className={`w-5 h-5 ${sendMode === "scheduled" ? "text-neon-purple" : "text-zinc-400"}`} />
            <div className="text-left w-full">
              <span className="text-xs font-bold block mb-0.5">Schedule for Later</span>
              <span className="text-[10px] text-zinc-500 block leading-tight">
                Pick a future date and time to trigger the invitation dispatch.
              </span>
            </div>
          </button>
        </div>

        {/* Date Picker (Shown only if Schedule is selected) */}
        {sendMode === "scheduled" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <label className="text-xs font-heading font-semibold text-zinc-400 uppercase tracking-wider block">
              Choose Delivery Date & Time
            </label>
            <DatePicker
              selected={scheduledDate}
              onChange={(date) => setScheduledDate(date)}
              label="Scheduled Time"
              placeholder="Select schedule date and time"
              minDate={new Date()}
            />
            <p className="text-[10px] text-zinc-500 font-sans italic">
              Delivery will be handled by the server's Quartz queue. You can cancel at any time before it triggers.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
