"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EventCard } from "./EventCard";
import { SearchInput } from "./SearchInput";
import { DashboardPagination } from "./DashboardPagination";
import { Button } from "../ui/Button";
import { CreateEventModal } from "./CreateEventModal";
import { Calendar } from "lucide-react";
import { InvitationsBanner } from "./InvitationsBanner";
import { AdSlot } from "../ui/AdSlot";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  bannerUrl?: string;
  totalEstimatedCost: number;
  createdAt: string;
}

interface InvitationItem {
  id: string;
  eventId: string;
  eventTitle: string;
  inviterAlias: string;
  role: string;
  status: string;
}

interface EventsDashboardClientProps {
  events: EventItem[];
  invitations: InvitationItem[];
  page: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  search: string;
  errorMsg: string | null;
  userRole?: string;
}

export const EventsDashboardClient: React.FC<EventsDashboardClientProps> = ({
  events,
  invitations,
  page,
  totalPages,
  totalElements,
  hasNext,
  hasPrevious,
  search,
  errorMsg,
  userRole,
}) => {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  let dashboardContent: React.ReactNode;

  if (errorMsg) {
    dashboardContent = (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <h4 className="text-red-400 font-heading font-semibold text-sm mb-2">Connection Error</h4>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">{errorMsg}</p>
      </div>
    );
  } else if (events.length === 0) {
    dashboardContent = (
      <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center bg-[#121214]/30">
        <div className="w-12 h-12 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 flex items-center justify-center text-neon-cyan mx-auto mb-4">
          <Calendar className="w-6 h-6" />
        </div>

        <h4 className="text-md font-heading font-bold text-white mb-2">
          {search ? "No events found matching your query" : "No active event workspaces"}
        </h4>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed mb-6">
          {search
            ? "Try adjusting your filters or query parameters to search other titles or descriptions."
            : "Launch your first event workspace profile to begin timelines scheduling and guest RSVP tracking."}
        </p>

        <Button
          variant="gradient"
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2 font-semibold text-xs tracking-wide uppercase h-auto"
        >
          Create Event
        </Button>
      </div>
    );
  } else {
    dashboardContent = (
      <div className="space-y-8">
        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          <AdSlot variant="card" slotId="0294859102" userRole={userRole} />
        </div>

        {/* Pagination */}
        <DashboardPagination
          pageNumber={page}
          totalPages={totalPages}
          totalElements={totalElements}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 space-y-8">
      {/* Header controls strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white tracking-wide">
            Event Management Canvas
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Monitor event budgets, timeline milestones, and coordinate guest RSVPs.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput />
          {userRole === "NORMAL" && totalElements >= 3 ? (
            <Link href="/activate-voucher">
              <Button
                variant="secondary"
                className="px-5 py-2 font-semibold text-xs tracking-wide uppercase h-auto border-neon-purple/50 text-[#d8b4fe] hover:bg-neon-purple/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300"
              >
                Upgrade to Premium
              </Button>
            </Link>
          ) : (
            <Button
              variant="gradient"
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2 font-semibold text-xs tracking-wide uppercase h-auto"
            >
              Create Event
            </Button>
          )}
        </div>
      </div>

      {userRole === "NORMAL" && (
        <div className="bg-[#0f0f15]/50 border border-white/5 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${totalElements >= 3 ? "bg-neon-purple animate-pulse" : "bg-neon-cyan"}`} />
            <span className="text-zinc-400 font-sans">
              Account Workspace Quota: <strong className="text-white">{totalElements} / 3 events</strong> created
            </span>
          </div>
          {totalElements >= 3 ? (
            <span className="text-zinc-400 font-sans flex items-center">
              Event cap reached.
              <Link href="/activate-voucher" className="text-neon-cyan hover:underline font-semibold ml-1.5 flex items-center gap-0.5">
                Upgrade to Premium to create more &rarr;
              </Link>
            </span>
          ) : (
            <Link href="/activate-voucher" className="text-zinc-400 hover:text-white hover:underline transition-colors font-medium">
              Upgrade to Premium for unlimited events & guests
            </Link>
          )}
        </div>
      )}

      <InvitationsBanner invitations={invitations} />

      {dashboardContent}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
};
