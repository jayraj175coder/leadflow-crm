import { format, isPast, isToday, parseISO } from "date-fns";
import { Bell, Clock } from "lucide-react";
import { cn } from "../../../lib/utils";

export function FollowUpBadge({ value, compact = false }: { value: string | null; compact?: boolean }) {
  if (!value) return null;

  const date = parseISO(value);
  const overdue = isPast(date) && !isToday(date);
  const today = isToday(date);

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1",
        today && "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300",
        overdue && "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300",
        !today && !overdue && "bg-muted text-muted-foreground ring-border"
      )}
    >
      {today ? <Bell className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {overdue ? "Overdue" : today ? "Today" : "Follow-up"} {compact ? format(date, "p") : format(date, "MMM d, p")}
    </span>
  );
}
