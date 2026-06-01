export type UserRole = "OWNER" | "ORGANIZER" | "COLLABORATOR" | "VIEWER";

export const USER_ROLES = {
  OWNER: "OWNER" as const,
  ORGANIZER: "ORGANIZER" as const,
  COLLABORATOR: "COLLABORATOR" as const,
  VIEWER: "VIEWER" as const,
} as const;

export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export const PROPOSAL_STATUSES = {
  PENDING: "PENDING" as const,
  APPROVED: "APPROVED" as const,
  REJECTED: "REJECTED" as const,
} as const;

export type ProposalAction = "CREATE" | "UPDATE" | "DELETE";

export const PROPOSAL_ACTIONS = {
  CREATE: "CREATE" as const,
  UPDATE: "UPDATE" as const,
  DELETE: "DELETE" as const,
} as const;

export type ProposalTarget = "COMPONENT" | "SPENDING" | "TIMELINE_ITEM";

export const PROPOSAL_TARGETS = {
  COMPONENT: "COMPONENT" as const,
  SPENDING: "SPENDING" as const,
  TIMELINE_ITEM: "TIMELINE_ITEM" as const,
} as const;
