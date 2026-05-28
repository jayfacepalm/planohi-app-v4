"use client";

import React, { useState, useRef } from "react";
import { Checkbox } from "../ui/Checkbox";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { AddTimelineItemModal } from "./AddTimelineItemModal";
import { Calendar, Plus, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { fetchApi } from "../../lib/api-client";

interface TimelineItemDto {
  id: string;
  eventId: string;
  title: string;
  dueAt: string;
  isDone: boolean;
}

interface EventTimelineCanvasProps {
  eventId: string;
  initialCompletedCount: number;
  initialTotalCount: number;
  initialItems: TimelineItemDto[];
  eventStartDate: string;
  eventEndDate: string;
}

export const EventTimelineCanvas: React.FC<EventTimelineCanvasProps> = ({
  eventId,
  initialCompletedCount,
  initialTotalCount,
  initialItems,
  eventStartDate,
  eventEndDate,
}) => {
  const [items, setItems] = useState<TimelineItemDto[]>(initialItems);
  const [completedCount, setCompletedCount] = useState<number>(initialCompletedCount);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const activeTogglesCount = useRef(0);

  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
      const response = await fetchApi<{ completedCount: number; totalCount: number; items: TimelineItemDto[] }>(
        `/events/${eventId}/timeline`
      );
      setItems(response.items || []);
      setCompletedCount(response.completedCount || 0);
      setTotalCount(response.totalCount || 0);
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
      await fetchApi(`/timeline/${itemId}/toggle`, {
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
      // Only refresh from backend if there are no more active toggles in flight
      if (activeTogglesCount.current === 0) {
        refreshTimeline();
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
      alert("Failed to update status. Please try again.");
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
          <Button
            variant="gradient"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-1.5 font-heading text-xs tracking-wider uppercase flex items-center gap-1 h-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Milestone
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-12 text-center bg-[#121214]/20">
            <span className="text-xs text-zinc-500 italic block">
              No timeline milestones defined for this event yet.
            </span>
            <Button
              variant="ghost"
              onClick={() => setIsAddOpen(true)}
              className="mt-4 text-xs font-semibold text-neon-purple hover:underline"
            >
              Add your first planner milestone
            </Button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
            {items.map((item) => {
              const overdue = isOverdue(item);
              
              return (
                <div key={item.id} className="relative flex items-start gap-4 group">
                  {/* Timeline bullet indicator node */}
                  <div className="absolute -left-6 mt-1.5 flex items-center justify-center">
                    {item.isDone ? (
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
                  <div className={`flex-1 bg-[#121214] border rounded-xl p-4 flex items-center justify-between gap-4 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${
                    item.isDone 
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
                      </div>
                      <span className="text-[10px] font-mono text-zinc-550 block">
                        Due: {formatDueAt(item.dueAt)}
                      </span>
                    </div>

                    <div className="flex items-center shrink-0">
                      <Checkbox
                        checked={item.isDone}
                        disabled={!!togglingIds[item.id]}
                        onChange={() => handleToggle(item.id, item.isDone)}
                      />
                    </div>
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
    </div>
  );
};
