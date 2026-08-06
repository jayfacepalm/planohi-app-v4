"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { EditEventModal } from "./EditEventModal";
import { Edit, Trash2, Share2 } from "lucide-react";
import { fetchApi, setRoleToken } from "../../lib/api-client";
import { USER_ROLES } from "../../lib/constants";
import { decodeRoleToken } from "../../lib/security";

interface TimelineItemShareDto {
  title: string;
  dueAt?: string;
  isDone: boolean;
}

interface ComponentBudgetShareDto {
  name: string;
  estimatedCost: number;
  actualSpent: number;
}

interface EventShareSummaryDto {
  eventId: string;
  title: string;
  description?: string;
  currency?: string;
  shareUrl: string;
  totalPlannedCost: number;
  totalActualSpent: number;
  timeline: TimelineItemShareDto[];
  components: ComponentBudgetShareDto[];
}

interface EventWorkspaceHeaderActionsProps {
  event: {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    bannerUrl?: string;
    userRole?: string;
    currency?: string;
  };
}

export const EventWorkspaceHeaderActions: React.FC<EventWorkspaceHeaderActionsProps> = ({ event }) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [shareLoading, setShareLoading] = useState(false);
  const [shareSuccessModalOpen, setShareSuccessModalOpen] = useState(false);

  useEffect(() => {
    if (event.userRole) {
      setRoleToken(event.userRole);
    }
  }, [event.userRole]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await fetchApi<any>(`/events/${event.id}`, {
        method: "DELETE",
      });
      // Redirect to events dashboard page on successful delete
      window.location.href = "/events";
    } catch (err: any) {
      if (err.data && err.data.msg) {
        setDeleteError(err.data.msg);
      } else {
        setDeleteError(err.message || "Failed to delete event workspace");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatShareText = (summary: EventShareSummaryDto) => {
    const currency = summary.currency || event.currency || "USD";
    const formattedPlanned = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(summary.totalPlannedCost || 0);
    const formattedActual = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(summary.totalActualSpent || 0);

    const timelineSection = (summary.timeline || []).map((item) => {
      const status = item.isDone ? "[✓]" : "[ ]";
      const dateStr = item.dueAt ? new Date(item.dueAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      return `${status} ${item.title}${dateStr ? ` (${dateStr})` : ""}`;
    }).join("\n");

    const componentsSection = (summary.components || []).map((c) => {
      const est = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(c.estimatedCost || 0);
      const act = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(c.actualSpent || 0);
      return `• ${c.name}: Planned ${est} | Spent ${act}`;
    }).join("\n");

    return `🎉 ${summary.title}
${summary.description ? summary.description + "\n" : ""}
📌 TIMELINE MILESTONES:
${timelineSection || "No milestones specified."}

💰 BUDGET & SPENDING SUMMARY:
Total Planned: ${formattedPlanned} | Total Actual: ${formattedActual}

📊 COMPONENTS BREAKDOWN:
${componentsSection || "No budget components specified."}

🔗 Make your own plan in Plano.hi: https://planohi.bossgamergg.com/`;
  };

  const handleSharePlan = async () => {
    setShareLoading(true);
    try {
      const summary = await fetchApi<EventShareSummaryDto>(`/events/${event.id}/share-summary`);
      const shareText = formatShareText(summary);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setShareSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Failed to share event plan:", err);
    } finally {
      setShareLoading(false);
    }
  };

  const handleEditSuccess = () => {
    // Reload page to fetch updated event data on Server Component
    window.location.reload();
  };

  const decodedRole = decodeRoleToken(event.userRole);
  const showEdit = decodedRole === USER_ROLES.OWNER || decodedRole === USER_ROLES.ORGANIZER;
  const showDelete = decodedRole === USER_ROLES.OWNER;

  return (
    <>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button
          variant="ghost"
          onClick={handleSharePlan}
          disabled={shareLoading}
          isLoading={shareLoading}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-neon-cyan/30 hover:border-neon-cyan text-neon-cyan px-4 py-2"
        >
          <Share2 className="w-4 h-4" />
          Share Plan
        </Button>

        {showEdit && (
          <Button
            variant="ghost"
            onClick={() => setIsEditOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 px-4 py-2"
          >
            <Edit className="w-4 h-4 text-zinc-400" />
            Edit Workspace
          </Button>
        )}
        {showDelete && (
          <Button
            variant="ghost"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 text-red-400 hover:text-red-300 px-4 py-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Workspace
          </Button>
        )}
      </div>

      {/* Edit Event Details Modal */}
      <EditEventModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        event={event}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="DELETE EVENT WORKSPACE"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 font-sans text-sm text-zinc-300">
          <p className="leading-relaxed">
            Are you sure you want to delete <strong className="text-white">"{event.title}"</strong>?
          </p>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 leading-relaxed font-sans">
            <strong>WARNING:</strong> This action is permanent. Deleting this workspace will cascade delete all budgeting components, timelines, and guest lists, and purge the banner from storage.
          </div>
          {deleteError && (
            <p className="text-xs text-red-400 font-medium">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>

      {/* Share Plan Success Modal */}
      <Modal
        isOpen={shareSuccessModalOpen}
        onClose={() => setShareSuccessModalOpen(false)}
        title="EVENT PLAN COPIED"
        footer={
          <Button variant="primary" onClick={() => setShareSuccessModalOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-3 font-sans text-sm text-zinc-300">
          <p className="leading-relaxed">
            🎉 Event plan copied to clipboard! Ready to share with friends and family on WhatsApp, Telegram, X, or email.
          </p>
        </div>
      </Modal>
    </>
  );
};
