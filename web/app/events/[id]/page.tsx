import { cookies } from "next/headers";
import { fetchApi } from "../../../lib/api-client";
import { Badge } from "../../../components/ui/Badge";
import { EventWorkspaceHeaderActions } from "../../../components/features/EventWorkspaceHeaderActions";
import { LocalEventDates } from "../../../components/ui/LocalEventDates";
import { EventDetailPageClient } from "../../../components/features/EventDetailPageClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Details Canvas | Plano.hi",
  description: "Manage event components and dynamic budgeting plans.",
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    search?: string;
  }>;
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab, page, search } = await searchParams;
  const activeTab = tab || "budget";
  const currentPage = page ? Number(page) : 0;
  const currentSearch = search || "";

  // Forward the active session token
  const cookieStore = await cookies();
  const token = cookieStore.get("AUTH_TOKEN")?.value;
  const headers: Record<string, string> = {};
  let accountRole: string | undefined = undefined;

  if (token) {
    headers["Cookie"] = `AUTH_TOKEN=${token}`;
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const claims = JSON.parse(payloadJson);
      accountRole = claims.role;
    } catch (e) {
      console.error("Failed to decode user role from token", e);
    }
  }

  let event: any = null;
  let componentsData: any = null;
  let timelineData: any = null;
  let inviteesData: any = null;
  let metricsData: any = null;
  let curatorsData: any = null;
  let proposalsData: any = null;
  let errorMsg: string | null = null;

  try {
    const eventPromise = fetchApi<any>(`/events/${id}`, { headers });
    const proposalsPromise = fetchApi<any>(`/events/${id}/proposals`, { headers }).catch(err => {
      console.error("Failed to fetch proposals for user preview:", err);
      return [];
    });
    let tabPromise;

    if (activeTab === "timeline") {
      tabPromise = fetchApi<any>(`/events/${id}/timeline`, { headers });
    } else if (activeTab === "guests") {
      tabPromise = Promise.all([
        fetchApi<any>(`/events/${id}/invitees?page=${currentPage}&size=10&search=${encodeURIComponent(currentSearch)}`, { headers }),
        fetchApi<any>(`/events/${id}/metrics`, { headers }),
      ]);
    } else if (activeTab === "curators") {
      tabPromise = fetchApi<any>(`/events/${id}/curators`, { headers });
    } else if (activeTab === "approvals") {
      tabPromise = Promise.resolve(null);
    } else {
      tabPromise = fetchApi<any>(`/events/${id}/budget-summary`, { headers });
    }

    const [eventRes, proposalsRes, tabRes] = await Promise.all([
      eventPromise,
      proposalsPromise,
      tabPromise,
    ]);

    event = eventRes;
    proposalsData = proposalsRes;

    if (activeTab === "timeline") {
      timelineData = tabRes;
    } else if (activeTab === "guests") {
      inviteesData = tabRes[0];
      metricsData = tabRes[1];
    } else if (activeTab === "curators") {
      curatorsData = tabRes;
    } else if (activeTab === "approvals") {
      // proposalsData is set above
    } else {
      componentsData = tabRes;
    }
  } catch (err: any) {
    console.error(`Failed to load event details for ${id}:`, err);
    if (err && typeof err.status === "number" && err.status >= 400 && err.status < 500) {
      errorMsg = err.message;
    } else {
      errorMsg = "An unexpected error occurred while loading this workspace. Please try again later.";
    }
  }

  if (errorMsg || !event) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <h4 className="text-red-400 font-heading font-semibold text-sm mb-2">Workspace Load Failure</h4>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">{errorMsg || "Workspace not found."}</p>
          <Link href="/events">
            <span className="text-neon-cyan hover:underline text-xs font-heading tracking-wide uppercase flex items-center justify-center gap-1.5 cursor-pointer">
              <ChevronLeft className="w-4 h-4" /> Return to Canvas List
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const isSingleDay = () => {
    const start = formatDate(event.startDate);
    const end = formatDate(event.endDate);
    return start === end;
  };

  const bannerUrl = event.bannerUrl || null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 space-y-8">
      {/* Back button link */}
      <div>
        <Link href="/events">
          <span className="text-zinc-500 hover:text-neon-cyan text-xs font-heading font-semibold tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-colors w-fit">
            <ChevronLeft className="w-4 h-4" /> Return to Workspace Dashboard
          </span>
        </Link>
      </div>

      {/* Banner Cover / Title Block */}
      {bannerUrl ? (
        <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden border border-white/10 relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#070708]/60 to-transparent flex flex-col justify-end p-6 md:p-8" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5 border border-white/5 rounded-2xl flex flex-col justify-end p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        </div>
      )}

      {/* Header Info Strip */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="cyan" className="text-[10px] uppercase py-0.5 px-2.5">
              Active Workspace
            </Badge>
            <LocalEventDates startDate={event.startDate} endDate={event.endDate} />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-white tracking-wide leading-tight">
            {event.title}
          </h1>
          {event.description ? (
            <p className="text-sm text-zinc-400 font-sans leading-relaxed">
              {event.description}
            </p>
          ) : (
            <p className="text-sm text-zinc-650 font-sans italic">
              No description configured for this workspace...
            </p>
          )}
        </div>
        <EventWorkspaceHeaderActions event={event} />
      </div>

      {/* Event Details Client Tabs & Canvas Container */}
      <EventDetailPageClient
        event={event}
        activeTab={activeTab}
        proposalsData={proposalsData}
        timelineData={timelineData}
        inviteesData={inviteesData}
        metricsData={metricsData}
        curatorsData={curatorsData}
        componentsData={componentsData}
        currentPage={currentPage}
        currentSearch={currentSearch}
        accountRole={accountRole}
      />
    </div>
  );
}
