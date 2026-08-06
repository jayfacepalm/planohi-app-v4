"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Skeleton } from "../ui/Skeleton";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
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

interface MilestoneCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  targetId: string;
  milestoneTitle: string;
  canComment: boolean;
  userRole?: string;
  onCommentsCountChange?: (count: number) => void;
}

export const MilestoneCommentsModal: React.FC<MilestoneCommentsModalProps> = ({
  isOpen,
  onClose,
  eventId,
  targetId,
  milestoneTitle,
  canComment,
  userRole,
  onCommentsCountChange,
}) => {
  const [comments, setComments] = useState<WorkspaceCommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decodedRole = decodeRoleToken(userRole);
  const canDeleteAny = decodedRole === USER_ROLES.OWNER || decodedRole === USER_ROLES.ORGANIZER;

  const onCommentsCountChangeRef = React.useRef(onCommentsCountChange);
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

  const handleDeleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    setError(null);
    try {
      await fetchApi(`/events/${eventId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const updatedComments = comments.filter((c) => c.id !== commentId);
      setComments(updatedComments);
      onCommentsCountChangeRef.current?.(updatedComments.length);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MILESTONE DISCUSSION"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Header summary of milestone title */}
        <div className="bg-[#18181b] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-semibold">
              Milestone Item
            </span>
            <h4 className="text-sm font-heading font-bold text-white leading-tight">
              {milestoneTitle}
            </h4>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-sans">
            {error}
          </div>
        )}

        {/* Discussion thread container */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton variant="rectangular" className="h-16 w-full" />
              <Skeleton variant="rectangular" className="h-16 w-full" />
              <Skeleton variant="rectangular" className="h-16 w-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-black/20">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
              <span className="text-xs text-zinc-500 italic block">
                No discussion comments on this milestone yet.
              </span>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-[#18181b]/80 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center text-neon-purple text-[10px] font-bold">
                      <User className="w-3 h-3" />
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
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deletingId === comment.id}
                        className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer disabled:opacity-50"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed pl-8">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input box or viewer restricted notice */}
        {canComment ? (
          <form onSubmit={handlePostComment} className="flex gap-2 pt-2 border-t border-white/5">
            <Input
              placeholder="Add a comment to this milestone..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={submitting}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              disabled={!commentText.trim() || submitting}
              className="shrink-0 flex items-center gap-1 px-4"
            >
              <Send className="w-3.5 h-3.5" />
              Post
            </Button>
          </form>
        ) : (
          <div className="pt-2 border-t border-white/5 text-center">
            <p className="text-xs text-zinc-500 italic">
              Viewers have read-only access and cannot post comments.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
