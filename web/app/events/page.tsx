import { cookies } from "next/headers";
import { fetchApi } from "../../lib/api-client";
import { EventsDashboardClient } from "../../components/features/EventsDashboardClient";
import React from "react";

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
  let invitations: any[] = [];
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

  try {
    invitations = await fetchApi<any[]>("/curators/invitations", { headers });
  } catch (err) {
    console.error("Failed to fetch pending invitations:", err);
  }

  const events = eventPageData?.content || [];
  const totalPages = eventPageData?.totalPages || 0;
  const totalElements = eventPageData?.totalElements || 0;
  const hasNext = eventPageData ? !eventPageData.last : false;
  const hasPrevious = eventPageData ? !eventPageData.first : false;

  return (
    <EventsDashboardClient
      events={events}
      invitations={invitations}
      page={page}
      totalPages={totalPages}
      totalElements={totalElements}
      hasNext={hasNext}
      hasPrevious={hasPrevious}
      search={search}
      errorMsg={errorMsg}
    />
  );
}
