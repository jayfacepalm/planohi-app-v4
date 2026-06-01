"use client";

import React, { useState } from "react";
import { AddComponentModal } from "./AddComponentModal";
import { Modal } from "../ui/Modal";
import { LogSpendingModal } from "./LogSpendingModal";
import { EditComponentModal } from "./EditComponentModal";
import { EditSpendingModal } from "./EditSpendingModal";
import { Button } from "../ui/Button";
import { GlowCard } from "../ui/GlowCard";
import { Plus, Trash2, PiggyBank, Briefcase, ChevronDown, ChevronUp, DollarSign, AlertTriangle, Calendar, Edit } from "lucide-react";
import { fetchApi } from "../../lib/api-client";
import { UserRole, USER_ROLES, PROPOSAL_STATUSES, PROPOSAL_ACTIONS, PROPOSAL_TARGETS } from "../../lib/constants";

interface SpendingItem {
  id: string;
  description: string;
  amount: number;
  spentAt: string;
  createdAt?: string;
  isPendingCreate?: boolean;
  pendingUpdate?: any;
  pendingDelete?: any;
  proposal?: any;
}

interface ComponentItem {
  id: string;
  name: string;
  estimatedCost: number;
  actualSpent: number;
  spendings: SpendingItem[];
  isPendingCreate?: boolean;
  pendingUpdate?: any;
  pendingDelete?: any;
  proposal?: any;
}

interface EventBudgetCanvasProps {
  eventId: string;
  initialComponents: ComponentItem[];
  initialTotalCost: number;
  initialTotalActualSpent: number;
  userRole?: UserRole;
  proposals?: any[];
}

export const EventBudgetCanvas: React.FC<EventBudgetCanvasProps> = ({
  eventId,
  initialComponents,
  initialTotalCost,
  initialTotalActualSpent,
  userRole,
  proposals: initialProposals = [],
}) => {
  const [components, setComponents] = useState<ComponentItem[]>(initialComponents);
  const [totalCost, setTotalCost] = useState<number>(initialTotalCost);
  const [totalActualSpent, setTotalActualSpent] = useState<number>(initialTotalActualSpent);
  const [proposals, setProposals] = useState<any[]>(initialProposals);
  const canEdit = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.ORGANIZER || userRole === USER_ROLES.COLLABORATOR;
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSpendingOpen, setIsSpendingOpen] = useState(false);
  const [activeComponent, setActiveComponent] = useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState("");

  // Edit Component States
  const [isEditComponentOpen, setIsEditComponentOpen] = useState(false);
  const [componentToEdit, setComponentToEdit] = useState<ComponentItem | null>(null);

  // Edit Spending States
  const [isEditSpendingOpen, setIsEditSpendingOpen] = useState(false);
  const [spendingToEdit, setSpendingToEdit] = useState<SpendingItem | null>(null);
  const [activeSpendingComponentId, setActiveSpendingComponentId] = useState<string>("");

  // Delete Spending States
  const [deleteSpendingConfirmOpen, setDeleteSpendingConfirmOpen] = useState(false);
  const [spendingToDelete, setSpendingToDelete] = useState<SpendingItem | null>(null);
  const [spendingDeleteLoading, setSpendingDeleteLoading] = useState(false);

  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Combine components with pending creations and attach pending updates/deletions
  const pendingCreations = (proposals || [])
    .filter((p) => p.targetType === PROPOSAL_TARGETS.COMPONENT && p.actionType === PROPOSAL_ACTIONS.CREATE && p.status === PROPOSAL_STATUSES.PENDING)
    .map((p) => ({
      id: `pending-create-${p.id}`,
      name: p.proposedData?.name || "Pending Category",
      estimatedCost: p.proposedData?.estimatedCost || 0,
      actualSpent: 0,
      spendings: [],
      isPendingCreate: true,
      proposal: p,
    }));

  const processedComponents = components.map((c) => {
    const pendingUpdate = (proposals || []).find(
      (p) => p.targetType === PROPOSAL_TARGETS.COMPONENT && p.actionType === PROPOSAL_ACTIONS.UPDATE && p.targetId === c.id && p.status === PROPOSAL_STATUSES.PENDING
    );
    const pendingDelete = (proposals || []).find(
      (p) => p.targetType === PROPOSAL_TARGETS.COMPONENT && p.actionType === PROPOSAL_ACTIONS.DELETE && p.targetId === c.id && p.status === PROPOSAL_STATUSES.PENDING
    );

    // Also get pending spending creations for this component
    const pendingSpendings = (proposals || [])
      .filter(
        (p) => p.targetType === PROPOSAL_TARGETS.SPENDING && p.actionType === PROPOSAL_ACTIONS.CREATE && p.status === PROPOSAL_STATUSES.PENDING && p.proposedData?.componentId === c.id
      )
      .map((p) => ({
        id: `pending-spending-${p.id}`,
        description: p.proposedData?.description || "Pending Expense",
        amount: p.proposedData?.amount || 0,
        spentAt: p.proposedData?.spentAt || new Date().toISOString(),
        isPendingCreate: true,
        proposal: p,
      }));

    // Attach pending updates/deletions on existing spendings
    const processedSpendings = (c.spendings || []).map((s) => {
      const spendingUpdate = (proposals || []).find(
        (p) => p.targetType === PROPOSAL_TARGETS.SPENDING && p.actionType === PROPOSAL_ACTIONS.UPDATE && p.targetId === s.id && p.status === PROPOSAL_STATUSES.PENDING
      );
      const spendingDelete = (proposals || []).find(
        (p) => p.targetType === PROPOSAL_TARGETS.SPENDING && p.actionType === PROPOSAL_ACTIONS.DELETE && p.targetId === s.id && p.status === PROPOSAL_STATUSES.PENDING
      );

      return {
        ...s,
        pendingUpdate,
        pendingDelete,
      };
    });

    return {
      ...c,
      spendings: [...processedSpendings, ...pendingSpendings],
      pendingUpdate,
      pendingDelete,
    };
  });

  const allRenderComponents: ComponentItem[] = [...processedComponents, ...pendingCreations];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
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

  const refreshComponents = async () => {
    try {
      const [budgetRes, proposalsRes] = await Promise.all([
        fetchApi<{ components: ComponentItem[]; totalEstimatedCost: number; totalActualSpent: number }>(
          `/events/${eventId}/budget-summary`
        ),
        fetchApi<any[]>(`/events/${eventId}/proposals`).catch((err) => {
          console.error("Failed to refresh proposals:", err);
          return [];
        }),
      ]);
      setComponents(budgetRes.components || []);
      setTotalCost(budgetRes.totalEstimatedCost || 0);
      setTotalActualSpent(budgetRes.totalActualSpent || 0);
      setProposals(proposalsRes || []);
    } catch (err) {
      console.error("Failed to refresh components:", err);
    }
  };

  const handleDeleteClick = (componentId: string) => {
    setComponentToDelete(componentId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!componentToDelete) return;
    const targetId = componentToDelete;
    
    setDeleteConfirmOpen(false);
    setComponentToDelete(null);
    setDeletingId(targetId);
    
    try {
      const response = await fetchApi<any>(`/events/${eventId}/components/${targetId}`, {
        method: "DELETE",
      });
      if (response && response.targetType) {
        setInfoModalMessage("Change proposal submitted: Category deletion queued for Organizer review.");
        setInfoModalOpen(true);
      } else {
        await refreshComponents();
      }
    } catch (err) {
      console.error("Failed to delete component:", err);
      setErrorMessage("Failed to delete component. Please try again.");
      setErrorModalOpen(true);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openLogSpending = (id: string, name: string) => {
    setActiveComponent({ id, name });
    setIsSpendingOpen(true);
  };

  const handleSpendingDeleteClick = (componentId: string, logItem: SpendingItem) => {
    setActiveSpendingComponentId(componentId);
    setSpendingToDelete(logItem);
    setDeleteSpendingConfirmOpen(true);
  };

  const confirmSpendingDelete = async () => {
    if (!spendingToDelete || !activeSpendingComponentId) return;
    setSpendingDeleteLoading(true);
    try {
      const response = await fetchApi<any>(`/components/${activeSpendingComponentId}/spendings/${spendingToDelete.id}`, {
        method: "DELETE",
      });
      if (response && response.targetType) {
        setInfoModalMessage("Change proposal submitted: Spending deletion queued for Organizer review.");
        setInfoModalOpen(true);
      } else {
        await refreshComponents();
      }
      setDeleteSpendingConfirmOpen(false);
      setSpendingToDelete(null);
    } catch (err) {
      console.error("Failed to delete spending transaction:", err);
      setErrorMessage("Failed to delete spending transaction. Please try again.");
      setErrorModalOpen(true);
    } finally {
      setSpendingDeleteLoading(false);
    }
  };

  // Visual calculations
  const totalBudgetExceeded = totalActualSpent > totalCost;
  const totalUsagePercent = totalCost > 0 ? Math.min(100, (totalActualSpent / totalCost) * 100) : 0;

  const targetComponent = components.find((c) => c.id === componentToDelete);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto">
      {/* Components List Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-lg font-heading font-bold text-white tracking-wide">
              Expense Categories Breakdown
            </h3>
          </div>
          {canEdit && (
            <Button
              variant="gradient"
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-1.5 font-heading text-xs tracking-wider uppercase flex items-center gap-1 h-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </Button>
          )}
        </div>

        {allRenderComponents.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-12 text-center bg-[#121214]/20">
            <span className="text-xs text-zinc-500 italic block">
              No budgeting components defined for this workspace yet.
            </span>
            {canEdit && (
              <Button
                variant="ghost"
                onClick={() => setIsAddOpen(true)}
                className="mt-4 text-xs font-semibold text-neon-cyan hover:underline"
              >
                Define your first cost category
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {allRenderComponents.map((item) => {
              const isOverBudget = item.actualSpent > item.estimatedCost;
              const usagePercent = item.estimatedCost > 0 
                ? Math.min(100, (item.actualSpent / item.estimatedCost) * 100) 
                : 0;
              const isExpanded = !!expandedIds[item.id];

              // Custom styles for pending states
              let cardBorderClass = "border-white/5 hover:border-white/10";
              let cardBgClass = "bg-[#121214]";
              if (item.isPendingCreate) {
                cardBorderClass = "border-yellow-500/30 border-dashed";
                cardBgClass = "bg-yellow-500/3";
              } else if (item.pendingDelete) {
                cardBorderClass = "border-red-500/30 border-dashed bg-red-950/5";
                cardBgClass = "bg-red-950/5";
              } else if (item.pendingUpdate) {
                cardBorderClass = "border-yellow-500/20";
                cardBgClass = "bg-yellow-500/2";
              } else if (isOverBudget) {
                cardBorderClass = "border-red-500/30 bg-red-950/5";
                cardBgClass = "bg-red-950/5";
              }

              return (
                <div
                  key={item.id}
                  className={`flex flex-col border rounded-xl overflow-hidden transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${cardBorderClass} ${cardBgClass}`}
                >
                  {/* Category Header Row */}
                  <div className="flex items-center justify-between p-4 flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-heading font-bold text-white tracking-wide">
                          {item.name}
                        </h4>
                        {isOverBudget && (
                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            Over Budget
                          </span>
                        )}
                        {item.isPendingCreate && (
                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 shadow-[0_0_5px_rgba(234,179,8,0.2)]">
                            Pending Creation
                          </span>
                        )}
                        {item.pendingDelete && (
                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-[0_0_5px_rgba(239,68,68,0.2)]">
                            Pending Deletion
                          </span>
                        )}
                        {item.pendingUpdate && (
                          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 shadow-[0_0_5px_rgba(234,179,8,0.2)]">
                            Pending Update
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono mt-1">
                        <span>Est: <strong className="text-zinc-300">{formatCurrency(item.estimatedCost)}</strong></span>
                        <span>•</span>
                        <span>Spent: <strong className={isOverBudget ? "text-red-400" : "text-neon-cyan"}>{formatCurrency(item.actualSpent)}</strong></span>
                      </div>

                      {item.pendingUpdate && (
                        <div className="text-[10px] text-yellow-500 font-sans mt-2 bg-yellow-500/5 border border-yellow-500/10 px-2 py-1 rounded w-fit">
                          Proposed values: <span className="text-zinc-400">"{item.pendingUpdate.proposedData?.name}"</span> (Est: <strong className="text-white">{formatCurrency(item.pendingUpdate.proposedData?.estimatedCost)}</strong>)
                        </div>
                      )}
                      
                      {/* Estimate vs Actual Mini Progress Bar */}
                      <div className="w-full max-w-md h-1.5 bg-zinc-850 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOverBudget ? "bg-red-500" : "bg-neon-cyan"
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => openLogSpending(item.id, item.name)}
                            disabled={item.isPendingCreate || !!item.pendingDelete}
                            className="px-3 py-1 text-[10px] uppercase font-heading tracking-wider flex items-center gap-1 h-auto disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                            Log Expense
                          </Button>

                          <button
                            type="button"
                            onClick={() => {
                              setComponentToEdit(item);
                              setIsEditComponentOpen(true);
                            }}
                            disabled={item.isPendingCreate || !!item.pendingDelete || !!item.pendingUpdate}
                            className="text-zinc-500 hover:text-neon-cyan p-1.5 rounded-lg border border-transparent hover:border-neon-cyan/20 hover:bg-neon-cyan/5 transition-all cursor-pointer disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
                            aria-label="Edit component"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item.id)}
                            disabled={deletingId === item.id || item.isPendingCreate || !!item.pendingDelete || !!item.pendingUpdate}
                            className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/5 transition-all cursor-pointer disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent"
                            aria-label="Remove component"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="text-zinc-400 hover:text-white p-1.5 rounded-lg border border-white/5 bg-white/3 hover:bg-white/5 transition-all cursor-pointer"
                        aria-label={isExpanded ? "Collapse spending log" : "Expand spending log"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Transaction Log Section */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-[#0b0b0c]/40 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
                          Transaction Expenditures Log ({item.spendings?.length || 0})
                        </span>
                      </div>

                      {!item.spendings || item.spendings.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-white/5 rounded-lg">
                          <span className="text-xs text-zinc-650 italic block">
                            No expenses logged for this category yet.
                          </span>
                          {canEdit && !item.isPendingCreate && !item.pendingDelete && (
                            <button
                              type="button"
                              onClick={() => openLogSpending(item.id, item.name)}
                              className="mt-2 text-[10px] text-neon-cyan hover:underline font-mono font-medium"
                            >
                              + Record your first payment transaction
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-white/5">
                          <table className="w-full text-left border-collapse text-xs font-sans">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/2 text-[10px] font-heading text-zinc-400 uppercase tracking-wider">
                                <th className="p-3 pl-4">Description</th>
                                <th className="p-3">Date Paid</th>
                                <th className="p-3 text-right">Amount</th>
                                {canEdit && <th className="p-3 pr-4 text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {item.spendings.map((logItem) => {
                                let rowClass = "hover:bg-white/1 text-zinc-300";
                                if (logItem.isPendingCreate) {
                                  rowClass = "bg-yellow-500/2 hover:bg-yellow-500/3 text-zinc-400 opacity-80 border-dashed border-yellow-500/10";
                                } else if (logItem.pendingDelete) {
                                  rowClass = "bg-red-500/2 hover:bg-red-500/3 text-zinc-400 opacity-80 line-through decoration-red-500/30";
                                } else if (logItem.pendingUpdate) {
                                  rowClass = "bg-yellow-500/2 hover:bg-yellow-500/3 text-zinc-300";
                                }

                                return (
                                  <tr key={logItem.id} className={`border-b border-white/5 ${rowClass}`}>
                                    <td className="p-3 pl-4 font-medium">
                                      <div className="flex flex-col">
                                        <span>{logItem.description}</span>
                                        {logItem.isPendingCreate && (
                                          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest mt-0.5">Pending Creation</span>
                                        )}
                                        {logItem.pendingDelete && (
                                          <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest mt-0.5">Pending Deletion</span>
                                        )}
                                        {logItem.pendingUpdate && (
                                          <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-widest mt-0.5">
                                            Pending Update: "{logItem.pendingUpdate.proposedData?.description}" ({formatCurrency(logItem.pendingUpdate.proposedData?.amount)})
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-zinc-500 font-mono">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-zinc-650" />
                                        {formatDate(logItem.spentAt)}
                                      </div>
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-white">
                                      {formatCurrency(logItem.amount)}
                                    </td>
                                    {canEdit && (
                                      <td className="p-3 pr-4 text-right">
                                        {!logItem.isPendingCreate && !logItem.pendingDelete && !logItem.pendingUpdate ? (
                                          <div className="flex items-center justify-end gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveSpendingComponentId(item.id);
                                                setSpendingToEdit(logItem);
                                                setIsEditSpendingOpen(true);
                                              }}
                                              className="text-zinc-500 hover:text-neon-cyan p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
                                              aria-label="Edit transaction"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleSpendingDeleteClick(item.id, logItem)}
                                              className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
                                              aria-label="Delete transaction"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-[9px] font-bold text-zinc-500 uppercase italic">Locked</span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Card Section */}
      <div className="space-y-6">
        <GlowCard header="BUDGET CANVAS SUMMARY" className={totalBudgetExceeded ? "border-red-500/20" : "border-neon-cyan/20"}>
          <div className="space-y-6">
            
            {/* Total Budget Warning Alert */}
            {totalBudgetExceeded && (
              <div className="flex gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3.5 text-red-400 shadow-[0_4px_12px_rgba(239,68,68,0.05)] animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-heading font-extrabold uppercase tracking-wide block">
                    Budget Exceeded
                  </span>
                  <p className="text-[10px] text-red-400/80 font-sans leading-relaxed">
                    Warning: Actual spent costs have surpassed the estimated cost projections of this event workspace.
                  </p>
                </div>
              </div>
            )}

            {/* Estimated Budget Card */}
            <div className="flex items-center gap-4 bg-white/2 border border-white/5 rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider mb-0.5">
                  TOTAL ESTIMATED BUDGET
                </span>
                <span className="text-lg font-heading font-extrabold text-white tracking-tight">
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>

            {/* Actual Spending Card */}
            <div className={`flex items-center gap-4 border rounded-xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.1)] ${
              totalBudgetExceeded ? "bg-red-500/5 border-red-500/15" : "bg-neon-cyan/5 border-neon-cyan/15"
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                totalBudgetExceeded 
                  ? "bg-red-500/10 border-red-500/20 text-red-400" 
                  : "bg-neon-cyan/10 border-neon-cyan/20 text-neon-cyan"
              }`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 font-heading block uppercase tracking-wider mb-0.5">
                  TOTAL ACTUAL SPENT
                </span>
                <span className={`text-lg font-heading font-extrabold tracking-tight ${
                  totalBudgetExceeded ? "text-red-400" : "text-white"
                }`}>
                  {formatCurrency(totalActualSpent)}
                </span>
              </div>
            </div>

            {/* Overall Spent vs Estimate Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                <span>Budget Usage</span>
                <span className={totalBudgetExceeded ? "text-red-400 font-bold" : "text-neon-cyan"}>
                  {((totalCost > 0 ? totalActualSpent / totalCost : 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-850 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalBudgetExceeded ? "bg-red-500" : "bg-neon-cyan"
                  }`}
                  style={{ width: `${totalUsagePercent}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-zinc-400">Categories Configured</span>
                <span className="text-white font-mono font-medium">{components.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-zinc-400">Deficit / Surplus</span>
                <span className={`font-mono font-medium ${
                  totalBudgetExceeded ? "text-red-400" : "text-neon-cyan"
                }`}>
                  {totalBudgetExceeded 
                    ? `-${formatCurrency(totalActualSpent - totalCost)}` 
                    : `+${formatCurrency(totalCost - totalActualSpent)}`
                  }
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-sans leading-relaxed pt-2 border-t border-white/5">
              Budget comparisons represent estimated projections vs actual expenditures recorded by components.
            </p>
          </div>
        </GlowCard>
      </div>

      {/* Add Component Modal popup */}
      <AddComponentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        eventId={eventId}
        onSuccess={refreshComponents}
      />

      {/* Edit Component Modal popup */}
      <EditComponentModal
        isOpen={isEditComponentOpen}
        onClose={() => {
          setIsEditComponentOpen(false);
          setComponentToEdit(null);
        }}
        eventId={eventId}
        component={componentToEdit}
        onSuccess={refreshComponents}
      />

      {/* Edit Spending Modal popup */}
      <EditSpendingModal
        isOpen={isEditSpendingOpen}
        onClose={() => {
          setIsEditSpendingOpen(false);
          setSpendingToEdit(null);
        }}
        componentId={activeSpendingComponentId}
        spending={spendingToEdit}
        onSuccess={refreshComponents}
      />

      {/* Delete Spending Confirmation Modal */}
      <Modal
        isOpen={deleteSpendingConfirmOpen}
        onClose={() => setDeleteSpendingConfirmOpen(false)}
        title="Confirm Transaction Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteSpendingConfirmOpen(false)} disabled={spendingDeleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmSpendingDelete} disabled={spendingDeleteLoading}>
              {spendingDeleteLoading ? "Deleting..." : "Delete Transaction"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Are you sure you want to remove the expenditure of <strong className="text-white">{spendingToDelete ? formatCurrency(spendingToDelete.amount) : ""}</strong> for <span className="text-neon-cyan font-bold">"{spendingToDelete?.description}"</span>?
          </p>
          <p className="text-xs text-red-400 font-mono flex items-center gap-1.5 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            Warning: This action is permanent and cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Log Spending Modal popup */}
      {activeComponent && (
        <LogSpendingModal
          isOpen={isSpendingOpen}
          onClose={() => {
            setIsSpendingOpen(false);
            setActiveComponent(null);
          }}
          componentId={activeComponent.id}
          componentName={activeComponent.name}
          onSuccess={refreshComponents}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirm Component Deletion"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete Component
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Are you sure you want to remove the budgeting component <span className="text-neon-cyan font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">"{targetComponent?.name}"</span>? This will delete all logged spendings under this category.
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

      {/* Info / Proposal Confirmation Modal */}
      <Modal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        title="Change Proposal Submitted"
        footer={
          <Button variant="primary" onClick={() => setInfoModalOpen(false)}>
            Got it
          </Button>
        }
      >
        <p className="text-sm text-zinc-300">
          {infoModalMessage}
        </p>
      </Modal>
    </div>
  );
};
