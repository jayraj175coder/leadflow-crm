import { formatDistanceToNow, isBefore, isToday, parseISO } from "date-fns";
import { Building2, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { Lead } from "../../../types/lead";
import { FollowUpBadge } from "./FollowUpBadge";
import { StatusBadge } from "./StatusBadge";

export function getLastDiscussion(lead: Lead) {
  return lead.discussions[0] ?? null;
}

export function isOverdueLead(lead: Lead) {
  return lead.followUpAt ? isBefore(parseISO(lead.followUpAt), new Date()) && !isToday(parseISO(lead.followUpAt)) : false;
}

export function isTodayLead(lead: Lead) {
  return lead.followUpAt ? isToday(parseISO(lead.followUpAt)) : false;
}

export function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const lastDiscussion = getLastDiscussion(lead);
  const overdue = isOverdueLead(lead);
  const today = isTodayLead(lead);

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group grid w-full gap-4 rounded-xl border bg-card p-4 text-left shadow-line transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow sm:grid-cols-[1fr_auto]",
        today && "border-blue-200 bg-blue-50/70 dark:border-blue-900/70 dark:bg-blue-950/20",
        overdue && "border-red-200 bg-red-50/80 dark:border-red-900/80 dark:bg-red-950/20"
      )}
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-base font-bold">{lead.name}</h3>
          {lead.company ? (
            <span className="inline-flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lead.company}</span>
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Last Note:</span> {lastDiscussion?.note ?? "No discussions yet."}
          {lastDiscussion ? (
            <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
              {formatDistanceToNow(parseISO(lastDiscussion.createdAt), { addSuffix: true })}
            </span>
          ) : null}
        </p>
        <FollowUpBadge value={lead.followUpAt} compact={today} />
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <StatusBadge status={lead.status} />
        <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </button>
  );
}
