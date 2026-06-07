"use client";

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { Modal } from "../ui/Modal";
import { fetchApi, setRoleToken } from "../../lib/api-client";
import { UserRole, USER_ROLES } from "../../lib/constants";
import { UserPlus, Trash2, Users, Clock, Check, ShieldAlert } from "lucide-react";
import { decodeRoleToken } from "../../lib/security";

interface CuratorItem {
  id: string;
  eventId: string;
  userId: string;
  email: string;
  alias: string;
  role: UserRole;
  status: string;
}

interface EventCuratorsCanvasProps {
  eventId: string;
  initialCurators: CuratorItem[];
  userRole: string;
}

export const EventCuratorsCanvas: React.FC<EventCuratorsCanvasProps> = ({
  eventId,
  initialCurators,
  userRole,
}) => {
  const [curators, setCurators] = useState<CuratorItem[]>(initialCurators);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(USER_ROLES.COLLABORATOR);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Revoke/Delete Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [curatorToDelete, setCuratorToDelete] = useState<CuratorItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  React.useEffect(() => {
    if (userRole) {
      setRoleToken(userRole);
    }
  }, [userRole]);

  const decodedRole = decodeRoleToken(userRole);
  const canManage = decodedRole === USER_ROLES.OWNER;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteError(null);

    try {
      const response = await fetchApi<CuratorItem>(`/events/${eventId}/curators`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      // Add to curators list
      setCurators((prev) => [...prev, response]);
      setInviteEmail("");
      setInviteRole(USER_ROLES.COLLABORATOR);
    } catch (err: any) {
      if (err.data && err.data.msg) {
        setInviteError(err.data.msg);
      } else {
        setInviteError(err.message || "Failed to invite curator");
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (curatorId: string, newRole: string) => {
    try {
      const response = await fetchApi<CuratorItem>(`/events/${eventId}/curators/${curatorId}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });

      // Update in local state
      setCurators((prev) =>
        prev.map((c) => (c.id === curatorId ? { ...c, role: response.role } : c))
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update curator role");
      setErrorModalOpen(true);
    }
  };

  const handleRevokeClick = (curator: CuratorItem) => {
    setCuratorToDelete(curator);
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!curatorToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await fetchApi<any>(`/events/${eventId}/curators/${curatorToDelete.id}`, {
        method: "DELETE",
      });

      setCurators((prev) => prev.filter((c) => c.id !== curatorToDelete.id));
      setDeleteConfirmOpen(false);
      setCuratorToDelete(null);
    } catch (err: any) {
      if (err.data && err.data.msg) {
        setDeleteError(err.data.msg);
      } else {
        setDeleteError(err.message || "Failed to revoke access");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
      case USER_ROLES.OWNER:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case USER_ROLES.ORGANIZER:
        return "bg-neon-purple/10 text-neon-purple border-neon-purple/20";
      case USER_ROLES.COLLABORATOR:
        return "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-white/5";
    }
  };

  return (
    <div className="space-y-8">
      {/* Invite curator form (Organizers only) */}
      {canManage && (
        <GlowCard className="p-6 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-cyan/5 rounded-full blur-[50px] pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div>
              <h3 className="text-md font-heading font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neon-purple" />
                Invite a Curator
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Curators will receive a workspace invitation banner on their dashboard to accept access.
              </p>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full h-11 bg-zinc-900/60 border border-white/10 rounded-xl px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-neon-purple/40 transition-colors font-sans"
                />
              </div>

              <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Workspace Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full h-11 bg-zinc-900/60 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-neon-purple/40 transition-colors font-sans"
                >
                  <option value={USER_ROLES.COLLABORATOR}>Collaborator (Edit)</option>
                  <option value={USER_ROLES.VIEWER}>Viewer (Read-only)</option>
                  <option value={USER_ROLES.ORGANIZER}>Organizer (Admin)</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="gradient"
                disabled={inviteLoading}
                className="w-full md:w-auto h-11 px-6 font-bold text-xs uppercase tracking-wider shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              >
                {inviteLoading ? "Inviting..." : "Invite Member"}
              </Button>
            </form>

            {inviteError && (
              <p className="text-xs text-red-400 font-medium font-sans animate-pulse">
                {inviteError}
              </p>
            )}
          </div>
        </GlowCard>
      )}

      {/* Curator List */}
      <div className="border border-white/5 bg-[#09090b]/40 rounded-2xl overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-neon-cyan" />
              Workspace Members ({curators.length})
            </h3>
            <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
              Active curators collaborating on this event workspace.
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/5 overflow-x-auto">
          {curators.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-sans text-xs italic">
              No curators have been added to this workspace yet...
            </div>
          ) : (
            <table className="w-full min-w-[600px] border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/5 bg-[#121214]/10">
                  <th className="px-6 py-4">Curator</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  {decodedRole === USER_ROLES.OWNER && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {curators.map((curator) => (
                  <tr key={curator.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* User Profile */}
                    <td className="px-6 py-4 flex flex-col justify-center">
                      <span className="font-semibold text-white text-sm">{curator.alias}</span>
                      <span className="text-[10px] text-zinc-400 font-medium mt-0.5">{curator.email}</span>
                    </td>

                    {/* Role selector/badge */}
                    <td className="px-6 py-4 vertical-align-middle">
                      {canManage && curator.role !== USER_ROLES.OWNER ? (
                        <select
                          value={curator.role}
                          onChange={(e) => handleRoleChange(curator.id, e.target.value)}
                          className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-neon-cyan/40 transition-colors font-sans"
                        >
                          <option value={USER_ROLES.COLLABORATOR}>COLLABORATOR</option>
                          <option value={USER_ROLES.VIEWER}>VIEWER</option>
                          <option value={USER_ROLES.ORGANIZER}>ORGANIZER</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 border rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(curator.role)}`}>
                          {curator.role}
                        </span>
                      )}
                    </td>

                    {/* Invitation Status */}
                    <td className="px-6 py-4">
                      {curator.status === "ACCEPTED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-500 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Invite
                        </span>
                      )}
                    </td>

                    {/* Actions (revoke access) */}
                    {decodedRole === USER_ROLES.OWNER && (
                      <td className="px-6 py-4 text-right">
                        {curator.role !== USER_ROLES.OWNER && (
                          <Button
                            variant="ghost"
                            onClick={() => handleRevokeClick(curator)}
                            className="p-2 border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/5 text-red-400 hover:text-red-300 rounded-lg inline-flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Revoke Access Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="REVOKE CURATOR ACCESS"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRevokeConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Revoking..." : "Confirm Revoke"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 font-sans text-sm text-zinc-300">
          <p className="leading-relaxed">
            Are you sure you want to revoke workspace access for{" "}
            <strong className="text-white">{curatorToDelete?.alias} ({curatorToDelete?.email})</strong>?
          </p>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 leading-relaxed font-sans flex gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              <strong>WARNING:</strong> This curator will lose all dashboard view/edit permissions immediately and their pending invitations will be deleted.
            </p>
          </div>
          {deleteError && (
            <p className="text-xs text-red-400 font-medium">
              {deleteError}
            </p>
          )}
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
    </div>
  );
};
