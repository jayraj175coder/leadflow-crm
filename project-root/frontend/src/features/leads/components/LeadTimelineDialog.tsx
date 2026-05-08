import { format, formatDistanceToNow, parseISO } from "date-fns";
import { CalendarClock, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { useUiStore } from "../../../store/uiStore";
import type { Lead, LeadStatus } from "../../../types/lead";
import { useAddDiscussion, useUpdateLead } from "../hooks/useLeads";
import { FollowUpBadge } from "./FollowUpBadge";
import { statusLabels } from "./StatusBadge";

const statuses = Object.keys(statusLabels) as LeadStatus[];

function toDateTime(date: string, time: string) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`).toISOString();
}

export function LeadTimelineDialog({ lead }: { lead: Lead | null }) {
  const selectedLeadId = useUiStore((state) => state.selectedLeadId);
  const selectLead = useUiStore((state) => state.selectLead);
  const [note, setNote] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [followTime, setFollowTime] = useState("");
  const updateLead = useUpdateLead();
  const addDiscussion = useAddDiscussion();
  const open = Boolean(selectedLeadId && lead);

  const sortedDiscussions = useMemo(() => lead?.discussions ?? [], [lead]);

  async function saveDiscussion() {
    if (!lead || !note.trim()) return;
    await addDiscussion.mutateAsync({
      id: lead.id,
      input: {
        note: note.trim(),
        followUpAt: toDateTime(followDate, followTime)
      }
    });
    setNote("");
    setFollowDate("");
    setFollowTime("");
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && selectLead(null)}>
      <DialogContent className="max-w-2xl">
        {lead ? (
          <>
            <div className="flex flex-col gap-4 border-b px-6 py-5 pr-16 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold">
                  {lead.name} <span className="font-medium text-muted-foreground">{lead.company ? `(${lead.company})` : ""}</span>
                </DialogTitle>
                <DialogDescription className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {lead.phone || "No phone number"}
                </DialogDescription>
              </div>
              <Select value={lead.status} onValueChange={(status) => updateLead.mutate({ id: lead.id, input: { status: status as LeadStatus } })}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[46vh] overflow-y-auto px-6 py-6">
              <div className="relative space-y-5 before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                {sortedDiscussions.map((discussion, index) => (
                  <div key={discussion.id} className="relative pl-9">
                    <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-card bg-primary shadow-line" />
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(parseISO(discussion.createdAt), "MMM d, p")}{" "}
                      <span className="ml-1">({formatDistanceToNow(parseISO(discussion.createdAt), { addSuffix: true })})</span>
                    </p>
                    <div className="mt-2 rounded-xl border bg-background/70 p-4 text-sm shadow-line">
                      <p className="leading-6 text-foreground">{discussion.note}</p>
                      <div className="mt-3">
                        <FollowUpBadge value={discussion.followUpAt} />
                      </div>
                    </div>
                    {index === sortedDiscussions.length - 1 ? null : <span className="sr-only">Next discussion</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 border-t bg-muted/20 px-6 py-5">
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Log a new discussion..." />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    Set Follow-up
                  </span>
                  <Input type="date" value={followDate} onChange={(event) => setFollowDate(event.target.value)} className="sm:w-40" />
                  <Input type="time" value={followTime} onChange={(event) => setFollowTime(event.target.value)} className="sm:w-32" />
                </div>
                <Button onClick={saveDiscussion} disabled={!note.trim() || addDiscussion.isPending}>
                  Save Discussion
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
