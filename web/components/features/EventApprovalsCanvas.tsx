"use client";

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { Check, X, ShieldAlert, Layers, DollarSign, Calendar } from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { ProposalStatus, ProposalAction, ProposalTarget, PROPOSAL_STATUSES } from "../../lib/constants";

interface ProposalItem {
  id: string;
  eventId: string;
  proposedBy: string;
  proposerAlias: string;
  targetType: ProposalTarget;
  actionType: ProposalAction;
  targetId: string | null;
  proposedData: Record<string, any>;
  status: ProposalStatus;
  createdAt: string;
}

interface EventApprovalsCanvasProps {
  eventId: string;
  initialProposals: ProposalItem[];
}

export const EventApprovalsCanvas: React.FC<EventApprovalsCanvasProps> = ({
  eventId,
  initialProposals,
}) => {
  const [proposals, setProposals] = useState<ProposalItem[]>(
    initialProposals.filter((p) => p.status === PROPOSAL_STATUSES.PENDING)
  );
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getProposalDescription = (proposal: ProposalItem) => {
    const { targetType, actionType, proposedData } = proposal;
    const data = proposedData || {};

    if (targetType === "COMPONENT") {
      if (actionType === "CREATE") {
        return `Create budget category "${data.name}" with an estimated cost of ${formatCurrency(data.estimatedCost || 0)}.`;
      }
      if (actionType === "UPDATE") {
        return `Update budget category to name "${data.name}" and estimated cost ${formatCurrency(data.estimatedCost || 0)}.`;
      }
      if (actionType === "DELETE") {
        return `Delete budget category "${data.name || "Unknown Component"}".`;
      }
    }

    if (targetType === "SPENDING") {
      if (actionType === "CREATE") {
        return `Log spending of ${formatCurrency(data.amount || 0)} for "${data.description}" on ${data.spentAt ? formatDate(data.spentAt) : "specified date"}.`;
      }
      if (actionType === "UPDATE") {
        return `Update spending transaction description to "${data.description}", amount ${formatCurrency(data.amount || 0)}, on ${data.spentAt ? formatDate(data.spentAt) : "specified date"}.`;
      }
      if (actionType === "DELETE") {
        return `Delete spending transaction "${data.description || "Unknown Expense"}".`;
      }
    }

    if (targetType === "TIMELINE_ITEM") {
      if (actionType === "CREATE") {
        return `Create timeline milestone "${data.title}" due on ${data.dueAt ? formatDate(data.dueAt) : "specified date"}.`;
      }
      if (actionType === "UPDATE") {
        const isDone = data.isDone === true || data.isDone === "true";
        return `Toggle timeline milestone check status to ${isDone ? "Completed" : "Incomplete"}.`;
      }
    }

    return `Perform ${actionType} action on ${targetType}.`;
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case "COMPONENT":
        return <Layers className="w-4 h-4 text-neon-purple shrink-0" />;
      case "SPENDING":
        return <DollarSign className="w-4 h-4 text-neon-cyan shrink-0" />;
      case "TIMELINE_ITEM":
        return <Calendar className="w-4 h-4 text-neon-purple shrink-0" />;
      default:
        return <Layers className="w-4 h-4 text-zinc-400 shrink-0" />;
    }
  };

  const handleReview = async (proposalId: string, action: "APPROVED" | "REJECTED") => {
    setActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    setError(null);

    try {
      await fetchApi(`/proposals/${proposalId}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });

      // Remove the proposal from state list on success
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      
      // Reload the page after review to sync all event details tabs with updated components/timeline items
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to process change proposal");
      setActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-md font-heading font-bold text-white flex items-center gap-2">
          Collaborator Approvals Queue ({proposals.length})
        </h3>
        <p className="text-xs text-zinc-400 mt-1 font-sans">
          Review and approve changes proposed by Collaborators before they are applied live.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-400 font-sans flex gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center bg-[#121214]/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <span className="text-xs text-zinc-500 italic block font-sans">
            No pending collaborator change proposals awaiting review.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {proposals.map((proposal) => (
            <GlowCard
              key={proposal.id}
              className="p-5 border border-white/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {getTargetIcon(proposal.targetType)}
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-white/5 font-mono">
                    {proposal.targetType} / {proposal.actionType}
                  </span>
                  <span className="text-xs text-zinc-500 font-sans">
                    Proposed by <strong className="text-zinc-300 font-medium">{proposal.proposerAlias}</strong> on {formatDate(proposal.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-zinc-100 font-sans leading-relaxed">
                  {getProposalDescription(proposal)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Button
                  variant="ghost"
                  disabled={actionLoading[proposal.id]}
                  onClick={() => handleReview(proposal.id, "REJECTED")}
                  className="px-3 py-1.5 h-auto text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </Button>
                <Button
                  variant="gradient"
                  disabled={actionLoading[proposal.id]}
                  onClick={() => handleReview(proposal.id, "APPROVED")}
                  className="px-3 py-1.5 h-auto text-xs flex items-center gap-1 uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </Button>
              </div>
            </GlowCard>
          ))}
        </div>
      )}
    </div>
  );
};
