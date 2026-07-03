"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { decodeRoleToken } from "../../lib/security";
import { EventBudgetCanvas } from "./EventBudgetCanvas";
import { EventTimelineCanvas } from "./EventTimelineCanvas";
import { EventGuestCanvas } from "./EventGuestCanvas";
import { EventCuratorsCanvas } from "./EventCuratorsCanvas";
import { EventApprovalsCanvas } from "./EventApprovalsCanvas";
import { Skeleton } from "../ui/Skeleton";

interface EventDetailPageClientProps {
  event: any;
  activeTab: string;
  proposalsData: any;
  timelineData: any;
  inviteesData: any;
  metricsData: any;
  curatorsData: any;
  componentsData: any;
  currentPage: number;
  currentSearch: string;
  accountRole?: string;
}

export const EventDetailPageClient: React.FC<EventDetailPageClientProps> = ({
  event,
  activeTab,
  proposalsData,
  timelineData,
  inviteesData,
  metricsData,
  curatorsData,
  componentsData,
  currentPage,
  currentSearch,
  accountRole,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [targetTab, setTargetTab] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isPending) {
      setTargetTab(null);
    }
  }, [isPending]);

  const handleTabClick = (tabName: string) => {
    setTargetTab(tabName);
    startTransition(() => {
      router.push(`/events/${event.id}?tab=${tabName}#tabs-container`, { scroll: false });
    });
  };

  const renderBudgetSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Skeleton variant="rectangular" className="h-10 w-full sm:w-64 rounded-xl" />
        <Skeleton variant="rectangular" className="h-10 w-36 rounded-xl" />
      </div>
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
        <Skeleton variant="text" className="h-4 w-40 mb-4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <Skeleton variant="text" className="h-3 w-1/3" />
            <div className="flex gap-4">
              <Skeleton variant="text" className="h-3 w-12" />
              <Skeleton variant="text" className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTimelineSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-2 w-48" />
        </div>
        <Skeleton variant="circular" className="w-12 h-12" />
      </div>
      <div className="flex justify-end">
        <Skeleton variant="rectangular" className="h-10 w-36 rounded-xl" />
      </div>
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">
            <Skeleton variant="circular" className="w-5 h-5 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-3 w-1/4" />
              <Skeleton variant="text" className="h-2 w-12" />
            </div>
            <div className="flex gap-2">
              <Skeleton variant="rectangular" className="w-8 h-8 rounded-lg" />
              <Skeleton variant="rectangular" className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGuestsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <Skeleton variant="rectangular" className="h-12 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="rectangular" className="h-10 w-32 rounded-xl" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-8 h-8" />
              <div className="space-y-1">
                <Skeleton variant="text" className="h-3 w-28" />
                <Skeleton variant="text" className="h-2 w-20" />
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <Skeleton variant="rectangular" className="h-6 w-16 rounded-full" />
              <Skeleton variant="rectangular" className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCuratorsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <Skeleton variant="rectangular" className="h-16 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#121214] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" className="w-12 h-12" />
              <div className="space-y-2 flex-1">
                <Skeleton variant="text" className="h-4 w-2/3" />
                <Skeleton variant="text" className="h-2 w-1/3" />
              </div>
            </div>
            <Skeleton variant="rectangular" className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderApprovalsSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <Skeleton variant="text" className="h-5 w-40 animate-pulse" />
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton variant="text" className="h-4 w-48" />
                <Skeleton variant="text" className="h-2 w-24" />
              </div>
              <Skeleton variant="rectangular" className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton variant="rectangular" className="h-12 w-full rounded-xl" />
            <div className="flex justify-end gap-3">
              <Skeleton variant="rectangular" className="h-9 w-20 rounded-xl" />
              <Skeleton variant="rectangular" className="h-9 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkeleton = () => {
    const currentTab = targetTab || activeTab;
    switch (currentTab) {
      case "timeline":
        return renderTimelineSkeleton();
      case "guests":
        return renderGuestsSkeleton();
      case "curators":
        return renderCuratorsSkeleton();
      case "approvals":
        return renderApprovalsSkeleton();
      case "budget":
      default:
        return renderBudgetSkeleton();
    }
  };

  const renderCanvasContent = () => {
    if (isPending) {
      return renderSkeleton();
    }

    const userRole = event.userRole;
    const decodedRole = decodeRoleToken(userRole);
    const isOwnerOrOrganizer = decodedRole === "OWNER" || decodedRole === "ORGANIZER";

    switch (activeTab) {
      case "timeline":
        return (
          <EventTimelineCanvas
            eventId={event.id}
            initialCompletedCount={timelineData?.completedCount || 0}
            initialTotalCount={timelineData?.totalCount || 0}
            initialItems={timelineData?.items || []}
            eventStartDate={event.startDate}
            eventEndDate={event.endDate}
            userRole={event.userRole}
            proposals={proposalsData || []}
          />
        );
      case "guests":
        return (
          <EventGuestCanvas
            eventId={event.id}
            initialInvitees={inviteesData?.content || []}
            initialTotalElements={inviteesData?.totalElements || 0}
            initialMetrics={metricsData || {
              totalInvited: 0,
              respondedCount: 0,
              acceptedCount: 0,
              declinedCount: 0,
              pendingCount: 0,
              totalAttendingHeadcount: 0
            }}
            currentPage={currentPage}
            currentSearch={currentSearch}
            userRole={event.userRole}
            accountRole={accountRole}
          />
        );
      case "curators":
        return (
          <EventCuratorsCanvas
            eventId={event.id}
            initialCurators={curatorsData || []}
            userRole={event.userRole}
          />
        );
      case "approvals":
        if (isOwnerOrOrganizer) {
          return (
            <EventApprovalsCanvas
              eventId={event.id}
              initialProposals={proposalsData || []}
              currency={event.currency}
            />
          );
        }
        // Fallback to budget canvas if not owner or organizer
        return (
          <EventBudgetCanvas
            eventId={event.id}
            initialComponents={componentsData?.components || []}
            initialTotalCost={componentsData?.totalEstimatedCost || 0}
            initialTotalActualSpent={componentsData?.totalActualSpent || 0}
            userRole={event.userRole}
            proposals={proposalsData || []}
            currency={event.currency}
          />
        );
      case "budget":
      default:
        return (
          <EventBudgetCanvas
            eventId={event.id}
            initialComponents={componentsData?.components || []}
            initialTotalCost={componentsData?.totalEstimatedCost || 0}
            initialTotalActualSpent={componentsData?.totalActualSpent || 0}
            userRole={event.userRole}
            proposals={proposalsData || []}
            currency={event.currency}
          />
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div id="tabs-container" className="flex gap-6 border-b border-white/5 pb-px overflow-x-auto no-scrollbar whitespace-nowrap -mx-4 px-4 md:mx-0 md:px-0 scroll-mt-24">
        {[
          { id: "budget", label: "Budget Canvas", color: "border-neon-cyan text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" },
          { id: "timeline", label: "Timeline Canvas", color: "border-neon-purple text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" },
          { id: "guests", label: "Guest Canvas", color: "border-neon-cyan text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" },
          { id: "curators", label: "Curators", color: "border-neon-purple text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.49)]" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            disabled={isPending}
            className={`pb-3 font-heading text-sm font-bold tracking-wider uppercase cursor-pointer border-b-2 transition-all block text-left bg-transparent ${activeTab === tab.id
                ? tab.color
                : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {tab.label}
          </button>
        ))}

        {((decodeRoleToken(event.userRole) === "OWNER" || decodeRoleToken(event.userRole) === "ORGANIZER")) && (
          <button
            type="button"
            onClick={() => handleTabClick("approvals")}
            disabled={isPending}
            className={`pb-3 font-heading text-sm font-bold tracking-wider uppercase cursor-pointer border-b-2 transition-all flex items-center gap-1.5 bg-transparent ${activeTab === "approvals"
                ? "border-neon-purple text-white drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
          >
            <span>Approvals</span>
            {proposalsData && proposalsData.length > 0 && (
              <span className="bg-neon-purple text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-neon-purple/50 shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                {proposalsData.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Canvas rendering content */}
      {renderCanvasContent()}
    </div>
  );
};
