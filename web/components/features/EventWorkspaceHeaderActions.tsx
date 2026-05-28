"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { EditEventModal } from "./EditEventModal";
import { Edit, Trash2 } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

interface EventWorkspaceHeaderActionsProps {
  event: {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    bannerUrl?: string;
  };
}

export const EventWorkspaceHeaderActions: React.FC<EventWorkspaceHeaderActionsProps> = ({ event }) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleEditSuccess = () => {
    // Reload page to fetch updated event data on Server Component
    window.location.reload();
  };

  return (
    <>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button
          variant="ghost"
          onClick={() => setIsEditOpen(true)}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 px-4 py-2"
        >
          <Edit className="w-4 h-4 text-zinc-400" />
          Edit Workspace
        </Button>
        <Button
          variant="ghost"
          onClick={() => setIsDeleteConfirmOpen(true)}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 text-red-400 hover:text-red-300 px-4 py-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Workspace
        </Button>
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
    </>
  );
};
