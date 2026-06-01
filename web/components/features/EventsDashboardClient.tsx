"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EventCard } from "./EventCard";
import { SearchInput } from "./SearchInput";
import { DashboardPagination } from "./DashboardPagination";
import { Button } from "../ui/Button";
import { CreateEventModal } from "./CreateEventModal";
import { Calendar } from "lucide-react";
import { InvitationsBanner } from "./InvitationsBanner";

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
          <Button
            variant="gradient"
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2 font-semibold text-xs tracking-wide uppercase h-auto"
          >
            Create Event
          </Button>
        </div>
      </div>

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
