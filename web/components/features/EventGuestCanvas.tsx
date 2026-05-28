"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { Badge } from "../ui/Badge";
import { AddInviteeModal } from "./AddInviteeModal";
import { Search, UserPlus, Link2, Check, AlertTriangle, Users, CheckSquare, XOctagon, HelpCircle } from "lucide-react";

interface InviteeDto {
  id: string;
  eventId: string;
  name: string;
  token: string;
  allowedGuests: number;
  attendingGuests: number;
  status: string;
  respondedAt: string | null;
}

interface InviteeMetricsDto {
  totalInvited: number;
  respondedCount: number;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  totalAttendingHeadcount: number;
}

interface EventGuestCanvasProps {
  eventId: string;
  initialInvitees: InviteeDto[];
  initialTotalElements: number;
  initialMetrics: InviteeMetricsDto;
  currentPage?: number;
  currentSearch?: string;
}

export const EventGuestCanvas: React.FC<EventGuestCanvasProps> = ({
  eventId,
  initialInvitees,
  initialTotalElements,
  initialMetrics,
  currentPage = 0,
  currentSearch = "",
}) => {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(currentSearch);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchVal]);

  // Sync debounced search to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "0"); // Reset page index on search
    router.push(`?${params.toString()}`);
  }, [debouncedSearch, router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleCopyLink = async (inviteeId: string, token: string) => {
    const absoluteLink = `${window.location.origin}/rsvp/${token}`;
    try {
      await navigator.clipboard.writeText(absoluteLink);
      setCopiedId(inviteeId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy invitation link:", err);
    }
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const totalPages = Math.ceil(initialTotalElements / 10);
  const hasNext = currentPage < totalPages - 1;
  const hasPrevious = currentPage > 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Invited */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider">Parties Invited</span>
            <span className="text-base font-heading font-extrabold text-white">{initialMetrics.totalInvited}</span>
          </div>
        </div>

        {/* Total Headcount */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider">Attending Headcount</span>
            <span className="text-base font-heading font-extrabold text-neon-cyan drop-shadow-[0_0_6px_rgba(6,182,212,0.4)]">{initialMetrics.totalAttendingHeadcount}</span>
          </div>
        </div>

        {/* Responded */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider">Responses Recv</span>
            <span className="text-base font-heading font-extrabold text-white">{initialMetrics.respondedCount}</span>
          </div>
        </div>

        {/* Accepted */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center justify-center text-green-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider">Accepted Parties</span>
            <span className="text-base font-heading font-extrabold text-green-400">{initialMetrics.acceptedCount}</span>
          </div>
        </div>

        {/* Declined */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-center text-red-400">
            <XOctagon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider">Declined Parties</span>
            <span className="text-base font-heading font-extrabold text-red-400">{initialMetrics.declinedCount}</span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider">Pending Parties</span>
            <span className="text-base font-heading font-extrabold text-amber-400">{initialMetrics.pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#121214] border border-white/5 rounded-xl p-6 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        
        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search guests by name..."
              className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs font-sans text-white focus:outline-none focus:border-neon-cyan/50 placeholder-zinc-650 transition-colors"
            />
          </div>

          {/* Action Trigger button */}
          <Button
            variant="gradient"
            onClick={() => setIsAddOpen(true)}
            className="w-full sm:w-auto px-4 py-2 font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 h-auto"
          >
            <UserPlus className="w-4 h-4" />
            Add Guest Invitation
          </Button>
        </div>

        {/* Data list Table */}
        {initialTotalElements === 0 ? (
          /* Empty state UX resolution */
          <div className="border border-dashed border-white/10 rounded-xl py-16 px-4 text-center bg-[#121214]/20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center text-neon-cyan">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <span className="text-sm font-heading font-semibold text-white tracking-wide block">
                No Guest Invitations Found
              </span>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                Invite guests or families, allocate maximum headcount limits per party, and copy personalized secure lookup RSVP links.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setIsAddOpen(true)}
              className="mt-2 text-xs font-heading tracking-wider uppercase flex items-center gap-1.5 h-auto py-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Quick Add Guest
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/10">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 text-[10px] font-heading text-zinc-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Guest Party Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Allowed limit</th>
                    <th className="p-4 text-center">attending</th>
                    <th className="p-4">Responded at</th>
                    <th className="p-4 pr-6 text-right">Invitation Link</th>
                  </tr>
                </thead>
                <tbody>
                  {initialInvitees.map((guest) => (
                    <tr key={guest.id} className="border-b border-white/5 hover:bg-white/1 text-zinc-300 transition-colors">
                      <td className="p-4 pl-6 font-medium text-white">{guest.name}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            guest.status === "ACCEPTED"
                              ? "cyan"
                              : guest.status === "DECLINED"
                              ? "red"
                              : "amber"
                          }
                          className="py-0.5 px-2 text-[9px]"
                        >
                          {guest.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center font-mono font-bold">{guest.allowedGuests}</td>
                      <td className="p-4 text-center font-mono text-zinc-400">
                        {guest.status === "ACCEPTED" ? (
                          <span className="text-neon-cyan font-bold">{guest.attendingGuests}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="p-4 text-zinc-500 font-mono">
                        {guest.respondedAt ? formatDate(guest.respondedAt) : "--"}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(guest.id, guest.token)}
                          className={`inline-flex items-center gap-1 text-[10px] font-heading uppercase tracking-wider py-1.5 px-2.5 rounded border transition-all cursor-pointer ${
                            copiedId === guest.id
                              ? "bg-green-500/10 border-green-500/20 text-green-400"
                              : "bg-[#121214] border-white/5 text-zinc-400 hover:text-white hover:border-white/10"
                          }`}
                        >
                          {copiedId === guest.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3 h-3" />
                              Copy Link
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 pt-6 w-full text-xs font-sans text-zinc-500">
                <span>
                  Total of <span className="text-zinc-300 font-medium">{initialTotalElements}</span> guest invitees
                </span>

                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!hasPrevious}
                    variant="ghost"
                    className="px-3 py-1.5 h-auto text-xs hover:text-white cursor-pointer"
                  >
                    ← Previous
                  </Button>
                  <span className="text-zinc-400 font-mono">
                    Page <span className="text-white font-medium">{currentPage + 1}</span> of <span className="text-white font-medium">{totalPages}</span>
                  </span>
                  <Button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasNext}
                    variant="ghost"
                    className="px-3 py-1.5 h-auto text-xs hover:text-white cursor-pointer"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Guest modal popup */}
      <AddInviteeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        eventId={eventId}
        onSuccess={handleSuccess}
      />
    </div>
  );
};
