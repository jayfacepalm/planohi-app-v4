"use client";

import React, { useState, useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { AddTimelineItemModal } from "./AddTimelineItemModal";
import { EditTimelineItemModal } from "./EditTimelineItemModal";
import { MilestoneCommentsAccordion } from "./MilestoneCommentsAccordion";
import { Modal } from "../ui/Modal";
import { Calendar, Plus, AlertCircle, CheckCircle2, Circle, Edit, Trash2, MessageSquare } from "lucide-react";
import { fetchApi, setRoleToken } from "../../lib/api-client";
import { UserRole, USER_ROLES, PROPOSAL_STATUSES, PROPOSAL_ACTIONS, PROPOSAL_TARGETS } from "../../lib/constants";
import { decodeRoleToken } from "../../lib/security";

interface TimelineItemDto {
  id: string;
  eventId: string;
  title: string;
  dueAt: string;
  isDone: boolean;
  isPendingCreate?: boolean;
  pendingToggle?: any;
  pendingUpdate?: any;
  pendingDelete?: any;
}

interface EventTimelineCanvasProps {
  eventId: string;
  initialCompletedCount: number;
  initialTotalCount: number;
  initialItems: TimelineItemDto[];
  eventStartDate: string;
  eventEndDate: string;
  userRole?: string;
  proposals?: any[];
}

export const EventTimelineCanvas: React.FC<EventTimelineCanvasProps> = ({
  eventId,
  initialCompletedCount,
  initialTotalCount,
  initialItems,
  eventStartDate,
  eventEndDate,
  userRole,
  proposals: initialProposals = [],
}) => {
  const [items, setItems] = useState<TimelineItemDto[]>(initialItems);
  const [completedCount, setCompletedCount] = useState<number>(initialCompletedCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [proposals, setProposals] = useState<any[]>(initialProposals);
  React.useEffect(() => {
    if (userRole) {
      setRoleToken(userRole);
    }
  }, [userRole]);

  const decodedRole = decodeRoleToken(userRole);
  const canEdit = decodedRole === USER_ROLES.OWNER || decodedRole === USER_ROLES.ORGANIZER || decodedRole === USER_ROLES.COLLABORATOR;
  const canComment = decodedRole !== USER_ROLES.VIEWER && decodedRole !== null;

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const toggleCommentsAccordion = (itemId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleCommentsCountChange = React.useCallback((itemId: string, count: number) => {
    setCommentCounts((prev) => {
      if (prev[itemId] === count) return prev;
      return { ...prev, [itemId]: count };
    });
  }, []);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItemDto | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const activeTogglesCount = useRef(0);
  
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Combine real items with pending creations
  const pendingCreations = (proposals || [])
    .filter((p) => p.targetType === PROPOSAL_TARGETS.TIMELINE_ITEM && p.actionType === PROPOSAL_ACTIONS.CREATE && p.status === PROPOSAL_STATUSES.PENDING)
    .map((p) => ({
      id: `pending-create-${p.id}`,
      eventId,
      title: p.proposedData?.title || "Pending Milestone",
      dueAt: p.proposedData?.dueAt || new Date().toISOString(),
      isDone: false,
      isPendingCreate: true,
      proposal: p,
    }));

  const processedItems = items.map((item) => {
    const pendingToggle = (proposals || []).find(
      (p) => p.targetType === PROPOSAL_TARGETS.TIMELINE_ITEM && p.actionType === PROPOSAL_ACTIONS.UPDATE && p.targetId === item.id && p.status === PROPOSAL_STATUSES.PENDING && p.proposedData?.isDone !== undefined
    );

    const pendingUpdate = (proposals || []).find(
      (p) => p.targetType === PROPOSAL_TARGETS.TIMELINE_ITEM && p.actionType === PROPOSAL_ACTIONS.UPDATE && p.targetId === item.id && p.status === PROPOSAL_STATUSES.PENDING && (p.proposedData?.title !== undefined || p.proposedData?.dueAt !== undefined)
    );

    const pendingDelete = (proposals || []).find(
      (p) => p.targetType === PROPOSAL_TARGETS.TIMELINE_ITEM && p.actionType === PROPOSAL_ACTIONS.DELETE && p.targetId === item.id && p.status === PROPOSAL_STATUSES.PENDING
    );

    return {
      ...item,
      pendingToggle,
      pendingUpdate,
      pendingDelete,
    };
  });

  const allRenderItems: TimelineItemDto[] = [...processedItems, ...pendingCreations];

  const formatDueAt = (dateString: string) => {
    if (!mounted) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const isOverdue = (item: TimelineItemDto) => {
    if (item.isDone) return false;
    return new Date(item.dueAt) < new Date();
  };

  const refreshTimeline = async () => {
    try {
      const [timelineRes, proposalsRes] = await Promise.all([
        fetchApi<{ completedCount: number; totalCount: number; items: TimelineItemDto[] }>(
          `/events/${eventId}/timeline`
        ),
        fetchApi<any[]>(`/events/${eventId}/proposals`).catch((err) => {
          console.error("Failed to refresh proposals:", err);
          return [];
        }),
      ]);
      setItems(timelineRes.items || []);
      setCompletedCount(timelineRes.completedCount || 0);
      setTotalCount(timelineRes.totalCount || 0);
      setProposals(proposalsRes || []);
    } catch (err) {
      console.error("Failed to refresh timeline:", err);
    }
  };

  const handleToggle = async (itemId: string, currentChecked: boolean) => {
    const targetDone = !currentChecked;
    const previousItems = [...items];
    const previousCompleted = completedCount;

    // Optimistically update the UI state instantly
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, isDone: targetDone } : item
      )
    );
    setCompletedCount((prev) => (targetDone ? prev + 1 : prev - 1));
    setTogglingIds((prev) => ({ ...prev, [itemId]: true }));
    activeTogglesCount.current += 1;

    try {
      const response = await fetchApi<any>(`/timeline/${itemId}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ isDone: targetDone }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      activeTogglesCount.current -= 1;
      setTogglingIds((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      if (response && response.targetType) {
        setInfoModalMessage("Change proposal submitted: Milestone checklist toggle queued for Organizer review.");
        setInfoModalOpen(true);
        // Rollback optimistic UI update as it is pending review
        setItems(previousItems);
        setCompletedCount(previousCompleted);
      } else {
        // Only refresh from backend if there are no more active toggles in flight
        if (activeTogglesCount.current === 0) {
          refreshTimeline();
        }
      }
    } catch (err) {
      console.error("Failed to toggle milestone:", err);
      activeTogglesCount.current -= 1;
      // Rollback on failure
      setItems(previousItems);
      setCompletedCount(previousCompleted);
      setTogglingIds((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setErrorMessage("Failed to update status. Please try again.");
      setErrorModalOpen(true);
    }
  };

  const handleEditClick = (item: TimelineItemDto) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (itemId: string) => {
    setDeletingId(itemId);
    setDeleteError(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await fetchApi<any>(`/timeline/${deletingId}`, {
        method: "DELETE",
      });
      if (response && response.targetType) {
        setInfoModalMessage("Change proposal submitted: Milestone deletion queued for Organizer review.");
        setInfoModalOpen(true);
      }
      setIsDeleteConfirmOpen(false);
      setDeletingId(null);
      refreshTimeline();
    } catch (err: any) {
      if (err.data && err.data.msg) {
        setDeleteError(err.data.msg);
      } else {
        setDeleteError(err.message || "Failed to delete timeline milestone");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  // Summary Metrics calculations
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const overdueCount = items.filter(isOverdue).length;
  const pendingCount = totalCount - completedCount;

  // SVG calculations for radial progress
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;



  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto">
      {/* Timeline Items Checklist column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neon-purple" />
            <h3 className="text-lg font-heading font-bold text-white tracking-wide">
              Timeline Milestones & Checklist
            </h3>
          </div>
          {canEdit && (
            <Button
              variant="gradient"
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-1.5 font-heading text-xs tracking-wider uppercase flex items-center gap-1 h-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Milestone
            </Button>
          )}
        </div>

        {allRenderItems.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-12 text-center bg-[#121214]/20">
            <span className="text-xs text-zinc-500 italic block">
              No timeline milestones defined for this event yet.
            </span>
            {canEdit && (
              <Button
                variant="ghost"
                onClick={() => setIsAddOpen(true)}
                className="mt-4 text-xs font-semibold text-neon-purple hover:underline"
              >
                Add your first planner milestone
              </Button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
            {allRenderItems.map((item) => {
              const overdue = isOverdue(item);
              
              return (
                <div key={item.id} className="relative flex items-start gap-4 group">
                  {/* Timeline bullet indicator node */}
                  <div className="absolute -left-6 mt-1.5 flex items-center justify-center">
                    {item.isPendingCreate ? (
                      <div className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/50 flex items-center justify-center text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)] z-10 animate-pulse">
                        <Circle className="w-3 h-3 text-yellow-500" />
                      </div>
                    ) : item.pendingToggle ? (
                      <div className="w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/50 flex items-center justify-center text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)] z-10">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                      </div>
                    ) : item.isDone ? (
                      <div className="w-6 h-6 rounded-full bg-neon-purple/10 border border-neon-purple flex items-center justify-center text-neon-purple shadow-[0_0_8px_rgba(168,85,247,0.3)] z-10">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : overdue ? (
                      <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500 flex items-center justify-center text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)] z-10 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#121214] border border-white/20 flex items-center justify-center text-zinc-500 z-10 group-hover:border-neon-purple/50 transition-colors">
                        <Circle className="w-3 h-3" />
                      </div>
                    )}
                  </div>
 
                  {/* Node content block */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className={`bg-[#121214] border rounded-xl p-4 flex items-center justify-between gap-4 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${
                      item.isPendingCreate 
                        ? "border-yellow-500/20 bg-yellow-500/2 border-dashed"
                        : item.pendingToggle
                          ? "border-yellow-500/20 bg-yellow-500/2"
                          : item.isDone 
                            ? "border-white/5 opacity-60" 
                            : overdue 
                              ? "border-red-500/20 bg-red-950/2" 
                              : "border-white/5 hover:border-white/10"
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-sans font-medium transition-all ${
                            item.isDone ? "text-zinc-500 line-through" : "text-white"
                          }`}>
                            {item.title}
                          </span>
                          {overdue && (
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                              Overdue
                            </span>
                          )}
                          {item.isPendingCreate && (
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 shadow-[0_0_5px_rgba(234,179,8,0.2)]">
                              Pending Creation
                            </span>
                          )}
                          {item.pendingToggle && (
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 shadow-[0_0_5px_rgba(234,179,8,0.2)]">
                              Pending Check Toggle ({item.pendingToggle.proposedData?.isDone === true || item.pendingToggle.proposedData?.isDone === "true" ? "Complete" : "Incomplete"})
                            </span>
                          )}
                          {item.pendingUpdate && (
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 shadow-[0_0_5px_rgba(234,179,8,0.2)]">
                              Pending Detail Update
                            </span>
                          )}
                          {item.pendingDelete && (
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-[0_0_5px_rgba(239,68,68,0.2)]">
                              Pending Deletion
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-550 block">
                          Due: {formatDueAt(item.dueAt)}
                        </span>
                      </div>
   
                      <div className="flex items-center gap-2 shrink-0">
                        {!item.isPendingCreate && (
                          <button
                            type="button"
                            onClick={() => toggleCommentsAccordion(item.id)}
                            className={`p-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-mono ${
                              expandedComments[item.id]
                                ? "bg-neon-purple/10 border-neon-purple/40 text-neon-purple"
                                : "text-zinc-500 border-transparent hover:border-neon-purple/20 hover:bg-neon-purple/5 hover:text-neon-purple"
                            }`}
                            aria-label="Milestone discussion"
                            title={expandedComments[item.id] ? "Collapse Discussion" : "Expand Discussion"}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {commentCounts[item.id] !== undefined && commentCounts[item.id] > 0 && (
                              <span className="text-[9px] bg-neon-purple/20 text-neon-purple px-1.5 py-0.5 rounded-full font-bold">
                                {commentCounts[item.id]}
                              </span>
                            )}
                          </button>
                        )}
                        {canEdit && !item.isPendingCreate && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditClick(item)}
                              disabled={!!togglingIds[item.id] || item.isPendingCreate || !!item.pendingToggle || !!item.pendingUpdate || !!item.pendingDelete}
                              className="text-zinc-500 hover:text-neon-cyan p-1 rounded-lg border border-transparent hover:border-neon-cyan/20 hover:bg-neon-cyan/5 transition-all cursor-pointer disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
                              aria-label="Edit milestone"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(item.id)}
                              disabled={!!togglingIds[item.id] || item.isPendingCreate || !!item.pendingToggle || !!item.pendingUpdate || !!item.pendingDelete}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/5 transition-all cursor-pointer disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent mr-1"
                              aria-label="Delete milestone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <Checkbox
                          checked={item.isDone}
                          disabled={!!togglingIds[item.id] || !canEdit || item.isPendingCreate || !!item.pendingToggle || !!item.pendingUpdate || !!item.pendingDelete}
                          onChange={() => handleToggle(item.id, item.isDone)}
                        />
                      </div>
                    </div>

                    {/* Accordion Component Parented directly to this milestone item */}
                    {!item.isPendingCreate && (
                      <MilestoneCommentsAccordion
                        isOpen={!!expandedComments[item.id]}
                        eventId={eventId}
                        targetId={item.id}
                        canComment={canComment}
                        userRole={userRole}
                        onCommentsCountChange={(count) => handleCommentsCountChange(item.id, count)}
                        onClose={() => toggleCommentsAccordion(item.id)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Analytics Card column */}
      <div className="space-y-6">
        <GlowCard header="TIMELINE PLANNER SUMMARY" className={percent === 100 ? "border-neon-purple/30" : "border-neon-purple/10"}>
          <div className="space-y-6 flex flex-col items-center w-full">
            
            {/* Radial SVG circle Progress Chart */}
            <div className="relative w-36 h-36 flex items-center justify-center mt-2">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="stroke-zinc-850 fill-transparent"
                  strokeWidth={strokeWidth}
                />
                {/* Active progress ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="stroke-neon-purple fill-transparent transition-all duration-500 ease-out"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.4))" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-heading font-extrabold text-white tracking-tighter">
                  {percent}%
                </span>
                <span className="text-[9px] text-zinc-500 font-heading uppercase tracking-widest font-bold">
                  Completed
                </span>
              </div>
            </div>

            {/* Overdue Warning Alert */}
            {overdueCount > 0 && (
              <div className="w-full flex gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3.5 text-red-400 shadow-[0_4px_12px_rgba(239,68,68,0.05)]">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-heading font-extrabold uppercase tracking-wide block">
                    Pending Deficits
                  </span>
                  <p className="text-[10px] text-red-400/80 font-sans leading-relaxed">
                    Warning: You have {overdueCount} scheduled planning task{overdueCount > 1 ? "s" : ""} that {overdueCount > 1 ? "are" : "is"} currently past due.
                  </p>
                </div>
              </div>
            )}

            {/* Checklist Metrics List */}
            <div className="w-full space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-zinc-400">Total Milestones</span>
                <span className="text-white font-mono font-medium">{totalCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-zinc-400">Completed Tasks</span>
                <span className="text-neon-purple font-mono font-medium">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-zinc-400">Pending Tasks</span>
                <span className="text-zinc-300 font-mono font-medium">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-zinc-400">Overdue Tasks</span>
                <span className={`font-mono font-medium ${overdueCount > 0 ? "text-red-400" : "text-zinc-500"}`}>
                  {overdueCount}
                </span>
              </div>
            </div>

            <p className="w-full text-[10px] text-zinc-500 font-sans leading-relaxed pt-2 border-t border-white/5">
              Timelines track readiness checklist targets. Create tasks that align within the start and end dates of this event.
            </p>
          </div>
        </GlowCard>
      </div>

      {/* Add Milestone Modal popup */}
      <AddTimelineItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        eventId={eventId}
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
        onSuccess={refreshTimeline}
      />

      {/* Edit Milestone Modal popup */}
      <EditTimelineItemModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedItem(null);
        }}
        eventId={eventId}
        item={selectedItem}
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
        onSuccess={refreshTimeline}
      />

      {/* Delete Milestone Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="DELETE TIMELINE MILESTONE"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-zinc-300">
          Are you sure you want to delete this milestone? This action cannot be undone.
        </p>
        {deleteError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 font-sans mt-3">
            {deleteError}
          </div>
        )}
      </Modal>

      {/* Info / Proposal Confirmation Modal */}
      <Modal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="Change Proposal Submitted"
        footer={
          <Button variant="primary" onClick={() => setInfoModalOpen(false)}>
            Got it
          </Button>
        }
      >
        <p className="text-sm text-zinc-300">
          {infoModalMessage}
        </p>
      </Modal>

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
