import type { LeadStatus } from "../../../types/lead";
import { cn } from "../../../lib/utils";

export const statusLabels: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  LOST: "Lost"
};

const tones: Record<LeadStatus, string> = {
  NEW: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  CONTACTED: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300",
  QUALIFIED: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300",
  PROPOSAL_SENT: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300",
  WON: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200",
  LOST: "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300"
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 transition", tones[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
