import { cookies } from "next/headers";
import { fetchApi } from "../../lib/api-client";
import { EventCard } from "../../components/features/EventCard";
import { SearchInput } from "../../components/features/SearchInput";
import { DashboardPagination } from "../../components/features/DashboardPagination";
import { Button } from "../../components/ui/Button";
import Link from "next/link";
import React from "react";
import { Calendar } from "lucide-react";

interface PageProps {
  readonly searchParams: Promise<{
    readonly page?: string;
    readonly size?: string;
    readonly search?: string;
  }>;
}

export default async function EventsPage({ searchParams }: Readonly<PageProps>) {
  const resolvedSearchParams = await searchParams;
  const page = Number.parseInt(resolvedSearchParams.page || "0", 10);
  const size = Number.parseInt(resolvedSearchParams.size || "9", 10);
  const search = resolvedSearchParams.search || "";

  // Forward the active session token
  const cookieStore = await cookies();
  const token = cookieStore.get("AUTH_TOKEN")?.value;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Cookie"] = `AUTH_TOKEN=${token}`;
  }

  let eventPageData: any = null;
  let errorMsg: string | null = null;

  try {
    eventPageData = await fetchApi<any>("/events", {
      params: {
        page: page.toString(),
        size: size.toString(),
        search: search,
      },
      headers,
    });
  } catch (err: any) {
    console.error("Failed to load events list:", err);
    if (err && typeof err.status === "number" && err.status >= 400 && err.status < 500) {
      errorMsg = err.message;
    } else {
      errorMsg = "An unexpected error occurred while loading workspace canvases. Please try again later.";
    }
  }

  const events = eventPageData?.content || [];
  const totalPages = eventPageData?.totalPages || 0;
  const totalElements = eventPageData?.totalElements || 0;
  const hasNext = eventPageData ? !eventPageData.last : false;
  const hasPrevious = eventPageData ? !eventPageData.first : false;

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

        <Link href="/events/create">
          <Button variant="gradient" className="px-5 py-2 font-semibold text-xs tracking-wide uppercase h-auto">
            Create Event
          </Button>
        </Link>
      </div>
    );
  } else {
    dashboardContent = (
      <div className="space-y-8">
        {/* Workspaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
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
          <Link href="/events/create">
            <Button variant="gradient" className="px-5 py-2 font-semibold text-xs tracking-wide uppercase h-auto">
              Create Event
            </Button>
          </Link>
        </div>
      </div>

      {dashboardContent}
    </div>
  );
}
