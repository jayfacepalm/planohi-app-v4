"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { Badge } from "../ui/Badge";
import { AddInviteeModal } from "./AddInviteeModal";
import { EditInviteeModal } from "./EditInviteeModal";
import { SendAllInvitesModal } from "./SendAllInvitesModal";
import { Modal } from "../ui/Modal";
import { Search, UserPlus, Link2, Check, AlertTriangle, Users, CheckSquare, XOctagon, HelpCircle, Edit, Trash2, Send, Clock } from "lucide-react";
import { fetchApi, setRoleToken } from "../../lib/api-client";
import { UserRole, USER_ROLES } from "../../lib/constants";
import { decodeRoleToken } from "../../lib/security";

interface InviteeDto {
  id: string;
  eventId: string;
  name: string;
  token: string;
  allowedGuests: number;
  attendingGuests: number;
  status: string;
  email?: string | null;
  respondedAt: string | null;
  lastSentAt?: string | null;
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
  userRole?: string;
  accountRole?: string;
}

const getBadgeVariant = (status: string): "cyan" | "red" | "amber" => {
  if (status === "ACCEPTED") return "cyan";
  if (status === "DECLINED") return "red";
  return "amber";
};

export const EventGuestCanvas: React.FC<EventGuestCanvasProps> = ({
  eventId,
  initialInvitees,
  initialTotalElements,
  initialMetrics,
  currentPage = 0,
  currentSearch = "",
  userRole,
  accountRole,
}) => {
  useEffect(() => {
    if (userRole) {
      setRoleToken(userRole);
    }
  }, [userRole]);

  const decodedRole = decodeRoleToken(userRole);
  const canEdit = decodedRole === USER_ROLES.OWNER || decodedRole === USER_ROLES.ORGANIZER;
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(currentSearch);
  const [mounted, setMounted] = useState(false);

  // Edit Invitee States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [inviteeToEdit, setInviteeToEdit] = useState<InviteeDto | null>(null);

  // Delete Invitee States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [inviteeToDelete, setInviteeToDelete] = useState<InviteeDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Error Modal States
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Success Modal States
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [sendLoading, setSendLoading] = useState<string | null>(null);

  // Send All Invites / Scheduling States
  const [isSendAllOpen, setIsSendAllOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchSchedule = async () => {
    if (!canEdit) return;
    try {
      const res = await fetchApi<{ scheduledTime: string | null }>(
        `/events/${eventId}/invitees/send-all/schedule`,
        {
          headers: userRole ? { "X-Event-Role-Token": userRole } : undefined,
        }
      );
      if (res) {
        setScheduledTime(res.scheduledTime);
      } else {
        setScheduledTime(null);
      }
    } catch (err) {
      console.error("Failed to fetch schedule time:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSchedule();
  }, [eventId, canEdit]);

  const handleCancelSchedule = async () => {
    setCancelLoading(true);
    try {
      await fetchApi(`/events/${eventId}/invitees/send-all/schedule`, {
        method: "DELETE",
      });
      setScheduledTime(null);
      setSuccessMessage("Scheduled bulk invitation delivery has been successfully cancelled.");
      setSuccessModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to cancel scheduled invitations");
      setErrorModalOpen(true);
    } finally {
      setCancelLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!inviteeToDelete) return;
    setDeleteLoading(true);
    try {
      await fetchApi(`/events/${eventId}/invitees/${inviteeToDelete.id}`, {
        method: "DELETE",
      });
      setDeleteConfirmOpen(false);
      setInviteeToDelete(null);
      router.refresh();
    } catch (err: any) {
      setDeleteConfirmOpen(false);
      setErrorMessage(err.message || "Failed to remove guest from invite list");
      setErrorModalOpen(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSendInvite = async (guest: InviteeDto) => {
    if (!guest.email) {
      setErrorMessage("Cannot send invitation because no email is registered for this guest.");
      setErrorModalOpen(true);
      return;
    }
    setSendLoading(guest.id);
    try {
      await fetchApi(`/events/${eventId}/invitees/${guest.id}/send-invite`, {
        method: "POST",
      });
      setSuccessMessage(`RSVP invitation successfully queued for ${guest.name} (${guest.email})`);
      setSuccessModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send email invitation");
      setErrorModalOpen(true);
    } finally {
      setSendLoading(null);
    }
  };

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
    const currentSearchParam = params.get("search") || "";
    
    // Only push if the search value has actually changed to prevent immediate redirection on mount
    if (debouncedSearch === currentSearchParam) {
      return;
    }

    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "0"); // Reset page index on search
    router.push(`?${params.toString()}#tabs-container`, { scroll: false });
  }, [debouncedSearch, router]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}#tabs-container`, { scroll: false });
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

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {accountRole === "NORMAL" && (
        <div className="bg-[#0f0f15]/50 border border-white/5 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${initialMetrics.totalInvited >= 25 ? "bg-neon-purple animate-pulse" : "bg-neon-cyan"}`} />
            <span className="text-zinc-400 font-sans">
              Account Guest Quota: <strong className="text-white">{initialMetrics.totalInvited} / 25 guest invitees</strong> registered
            </span>
          </div>
          {initialMetrics.totalInvited >= 25 ? (
            <span className="text-zinc-400 font-sans flex items-center">
              Guest cap reached.
              <Link href="/activate-voucher" className="text-neon-cyan hover:underline font-semibold ml-1.5 flex items-center gap-0.5">
                Upgrade to Premium to invite more &rarr;
              </Link>
            </span>
          ) : (
            <Link href="/activate-voucher" className="text-zinc-400 hover:text-white hover:underline transition-colors font-medium">
              Upgrade to Premium for unlimited events & guests
            </Link>
          )}
        </div>
      )}

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

      {/* Scheduled Alert Banner */}
      {canEdit && scheduledTime && (
        <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-150 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center text-neon-purple shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Bulk Invitations Scheduled</span>
              <span className="text-[11px] text-zinc-450 font-sans">
                Invitations are queued for delivery on <span className="text-neon-purple font-semibold font-mono">{formatDate(scheduledTime)}</span>.
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="danger"
            onClick={handleCancelSchedule}
            disabled={cancelLoading}
            className="text-[10px] py-1.5 px-3 h-auto uppercase tracking-wider font-heading shrink-0 border border-red-500/20 bg-red-500/10 hover:bg-red-500 hover:text-white cursor-pointer"
          >
            {cancelLoading ? "Cancelling..." : "Cancel Schedule"}
          </Button>
        </div>
      )}

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
          {canEdit && (
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={() => setIsSendAllOpen(true)}
                className="w-full sm:w-auto px-4 py-2 font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 h-auto border border-white/10 hover:border-neon-cyan/40 hover:text-white"
              >
                <Send className="w-4 h-4 text-neon-cyan" />
                Send All Invites
              </Button>
              {accountRole === "NORMAL" && initialMetrics.totalInvited >= 25 ? (
                <Link href="/activate-voucher">
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto px-4 py-2 font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 h-auto border-neon-purple/50 text-[#d8b4fe] hover:bg-neon-purple/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300"
                  >
                    Upgrade to Premium
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="gradient"
                  onClick={() => setIsAddOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 h-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Guest Invitation
                </Button>
              )}
            </div>
          )}
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
            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => setIsAddOpen(true)}
                className="mt-2 text-xs font-heading tracking-wider uppercase flex items-center gap-1.5 h-auto py-2"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Quick Add Guest
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/10">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 text-[10px] font-heading text-zinc-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Guest Party Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Allowed limit</th>
                    <th className="p-4 text-center">attending</th>
                    <th className="p-4">Responded at</th>
                    <th className="p-4">Invite Email Sent</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {initialInvitees.map((guest) => (
                    <tr key={guest.id} className="border-b border-white/5 hover:bg-white/1 text-zinc-300 transition-colors">
                      <td className="p-4 pl-6 font-medium text-white">{guest.name}</td>
                      <td className="p-4 font-mono text-[11px] text-zinc-450">{guest.email || "--"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={getBadgeVariant(guest.status)}
                            className="py-0.5 px-2 text-[9px]"
                          >
                            {guest.status}
                          </Badge>
                          {guest.status === "PENDING" && guest.email && scheduledTime && (
                            <span 
                              className="inline-flex items-center gap-1 text-[9px] font-mono text-neon-purple bg-neon-purple/5 border border-neon-purple/20 px-1.5 py-0.5 rounded animate-pulse"
                              title={`Scheduled to send on ${formatDate(scheduledTime)}`}
                            >
                              <Clock className="w-2.5 h-2.5 text-neon-purple" />
                              Scheduled
                            </span>
                          )}
                        </div>
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
                      <td className="p-4 text-zinc-500 font-mono">
                        {guest.lastSentAt ? formatDate(guest.lastSentAt) : "--"}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end items-center gap-2">
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

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleSendInvite(guest)}
                              disabled={!guest.email || sendLoading === guest.id}
                              className={`inline-flex items-center gap-1 text-[10px] font-heading uppercase tracking-wider py-1.5 px-2.5 rounded border transition-all cursor-pointer bg-[#121214] border-white/5 text-zinc-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-white/5 disabled:cursor-not-allowed`}
                              title={guest.email ? "Send email invitation" : "No email address configured"}
                            >
                              <Send className="w-3 h-3" />
                              {sendLoading === guest.id ? "Sending..." : "Send Invite"}
                            </button>
                          )}

                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setInviteeToEdit(guest);
                                  setIsEditOpen(true);
                                }}
                                className="p-1.5 rounded border border-white/5 bg-[#121214] text-zinc-400 hover:text-white hover:border-white/10 transition-colors cursor-pointer"
                                aria-label="Edit guest details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setInviteeToDelete(guest);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="p-1.5 rounded border border-red-500/10 bg-[#121214] text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors cursor-pointer"
                                aria-label="Remove guest record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Edit Guest modal popup */}
      <EditInviteeModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setInviteeToEdit(null);
        }}
        eventId={eventId}
        invitee={inviteeToEdit}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirm Guest Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Guest"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Are you sure you want to remove the guest record for <span className="text-neon-cyan font-bold">"{inviteeToDelete?.name}"</span>? This will invalidate their RSVP token and invitation link.
          </p>
          <p className="text-xs text-red-400 font-mono flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            Warning: This action is permanent and cannot be undone.
          </p>
        </div>
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

      {/* Success Alert Modal */}
      <Modal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Action Successful"
        footer={
          <Button variant="primary" onClick={() => setSuccessModalOpen(false)}>
            Dismiss
          </Button>
        }
      >
        <p className="text-sm text-zinc-300 leading-relaxed">
          {successMessage}
        </p>
      </Modal>

      {/* Send All Invites Modal */}
      <SendAllInvitesModal
        isOpen={isSendAllOpen}
        onClose={() => setIsSendAllOpen(false)}
        eventId={eventId}
        onSuccess={() => {
          fetchSchedule();
          handleSuccess();
        }}
        pendingCount={initialMetrics.pendingCount}
      />
    </div>
  );
};
