"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Skeleton } from "../ui/Skeleton";
import { MessageSquare, Send, Trash2, User, ChevronUp } from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { USER_ROLES } from "../../lib/constants";
import { decodeRoleToken } from "../../lib/security";

export interface WorkspaceCommentDto {
  id: string;
  eventId: string;
  targetType: string;
  targetId: string;
  userId: string;
  authorAlias: string;
  content: string;
  createdAt: string;
}

interface MilestoneCommentsAccordionProps {
  isOpen: boolean;
  eventId: string;
  targetId: string;
  canComment: boolean;
  userRole?: string;
  onCommentsCountChange?: (count: number) => void;
  onClose?: () => void;
}

export const MilestoneCommentsAccordion: React.FC<MilestoneCommentsAccordionProps> = ({
  isOpen,
  eventId,
  targetId,
  canComment,
  userRole,
  onCommentsCountChange,
  onClose,
}) => {
  const [comments, setComments] = useState<WorkspaceCommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<WorkspaceCommentDto | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodedRole = decodeRoleToken(userRole);
  const canDeleteAny = decodedRole === USER_ROLES.OWNER || decodedRole === USER_ROLES.ORGANIZER;

  const onCommentsCountChangeRef = useRef(onCommentsCountChange);
  useEffect(() => {
    onCommentsCountChangeRef.current = onCommentsCountChange;
  }, [onCommentsCountChange]);

  useEffect(() => {
    let isMounted = true;

    if (isOpen && eventId && targetId) {
      setLoading(true);
      setError(null);
      setCommentText("");

      fetchApi<WorkspaceCommentDto[]>(
        `/events/${eventId}/comments?targetType=TIMELINE&targetId=${targetId}`
      )
        .then((data) => {
          if (!isMounted) return;
          const loadedComments = data || [];
          setComments(loadedComments);
          onCommentsCountChangeRef.current?.(loadedComments.length);
        })
        .catch((err: any) => {
          if (!isMounted) return;
          console.error("Failed to load comments:", err);
          setError(err.message || "Failed to load milestone discussion.");
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    } else if (!isOpen) {
      setLoading(true);
      setComments([]);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, eventId, targetId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await fetchApi<WorkspaceCommentDto>(`/events/${eventId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          targetType: "TIMELINE",
          targetId: targetId,
          content: commentText.trim(),
        }),
      });

      const updatedComments = [...comments, created];
      setComments(updatedComments);
      setCommentText("");
      onCommentsCountChangeRef.current?.(updatedComments.length);
    } catch (err: any) {
      console.error("Failed to post comment:", err);
      setError(err.data?.msg || err.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const promptDeleteComment = (comment: WorkspaceCommentDto) => {
    setCommentToDelete(comment);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    const commentId = commentToDelete.id;
    setDeletingId(commentId);
    setError(null);
    try {
      await fetchApi(`/events/${eventId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const updatedComments = comments.filter((c) => c.id !== commentId);
      setComments(updatedComments);
      onCommentsCountChangeRef.current?.(updatedComments.length);
      setIsDeleteModalOpen(false);
      setCommentToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete comment:", err);
      setError(err.data?.msg || err.message || "Failed to delete comment.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="mt-2 bg-[#18181b]/90 border border-neon-purple/20 rounded-xl p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Accordion Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-neon-purple" />
          <span className="text-xs font-heading font-bold text-white tracking-wide uppercase">
            Discussion Thread{!loading && ` (${comments.length})`}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            title="Collapse discussion"
            aria-label="Collapse discussion"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 text-xs text-red-400 font-sans">
          {error}
        </div>
      )}

      {/* Discussion Thread List */}
      <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2 py-1">
            <Skeleton variant="rectangular" className="h-14 w-full" />
            <Skeleton variant="rectangular" className="h-14 w-full" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-black/20">
            <MessageSquare className="w-6 h-6 text-zinc-600 mx-auto mb-1 opacity-50" />
            <span className="text-[11px] text-zinc-500 italic block">
              No discussion comments on this milestone yet.
            </span>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-[#121214] border border-white/5 hover:border-white/10 rounded-xl p-3 transition-all space-y-1.5 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center text-neon-purple text-[9px] font-bold">
                    <User className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-xs font-heading font-semibold text-zinc-200">
                    {comment.authorAlias}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                  {(canDeleteAny || canComment) && (
                    <button
                      type="button"
                      onClick={() => promptDeleteComment(comment)}
                      disabled={deletingId === comment.id}
                      className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-50"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-300 font-sans leading-relaxed pl-7">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Comment Input or Read-Only Viewer Notice */}
      {canComment ? (
        <form onSubmit={handlePostComment} className="flex gap-2 pt-2 border-t border-white/5">
          <Input
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={submitting}
            className="flex-1 text-xs py-1.5"
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            disabled={!commentText.trim() || submitting}
            className="shrink-0 flex items-center gap-1 px-3 text-xs"
          >
            <Send className="w-3 h-3" />
            Post
          </Button>
        </form>
      ) : (
        <div className="pt-2 border-t border-white/5 text-center">
          <p className="text-[11px] text-zinc-500 italic">
            Viewers have read-only access and cannot post comments.
          </p>
        </div>
      )}

      {/* Confirmation Modal for Comment Deletion */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCommentToDelete(null);
        }}
        title="DELETE COMMENT"
        footer={
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setCommentToDelete(null);
              }}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={!!deletingId}
              isLoading={!!deletingId}
            >
              Confirm Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-sm text-zinc-300">
          <p>Are you sure you want to delete this comment? This action cannot be undone.</p>
          {commentToDelete && (
            <div className="bg-[#121214] border border-white/10 rounded-xl p-3 text-xs text-zinc-400 italic">
              "{commentToDelete.content}"
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
