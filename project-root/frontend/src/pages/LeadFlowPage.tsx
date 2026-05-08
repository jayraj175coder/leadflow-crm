import { isAfter, isToday, parseISO } from "date-fns";
import { Moon, Plus, Search, Sparkles, Sun, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AddLeadDialog } from "../features/leads/components/AddLeadDialog";
import { LeadCard, isOverdueLead, isTodayLead } from "../features/leads/components/LeadCard";
import { LeadSkeleton } from "../features/leads/components/LeadSkeleton";
import { LeadTimelineDialog } from "../features/leads/components/LeadTimelineDialog";
import { statusLabels } from "../features/leads/components/StatusBadge";
import { useLeads } from "../features/leads/hooks/useLeads";
import { cn } from "../lib/utils";
import { useUiStore } from "../store/uiStore";
import type { Lead, LeadStatus } from "../types/lead";

const filters: Array<LeadStatus | "ALL"> = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"];

function filterLabel(filter: LeadStatus | "ALL") {
  return filter === "ALL" ? "All" : statusLabels[filter];
}

function sortLeads(a: Lead, b: Lead) {
  const aToday = isTodayLead(a);
  const bToday = isTodayLead(b);
  if (aToday !== bToday) return aToday ? -1 : 1;

  const aOverdue = isOverdueLead(a);
  const bOverdue = isOverdueLead(b);
  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

  if (a.followUpAt && b.followUpAt) return parseISO(a.followUpAt).getTime() - parseISO(b.followUpAt).getTime();
  if (a.followUpAt) return -1;
  if (b.followUpAt) return 1;
  return parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime();
}

export function LeadFlowPage() {
  const { data: leads = [], isLoading, error } = useLeads();
  const search = useUiStore((state) => state.search);
  const setSearch = useUiStore((state) => state.setSearch);
  const status = useUiStore((state) => state.status);
  const setStatus = useUiStore((state) => state.setStatus);
  const selectedLeadId = useUiStore((state) => state.selectedLeadId);
  const selectLead = useUiStore((state) => state.selectLead);
  const setAddLeadOpen = useUiStore((state) => state.setAddLeadOpen);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  const filteredLeads = useMemo(
    () =>
      leads
        .filter((lead) => (status === "ALL" ? true : lead.status === status))
        .filter((lead) => lead.name.toLowerCase().includes(search.toLowerCase().trim()))
        .sort(sortLeads),
    [leads, search, status]
  );

  const todayLeads = filteredLeads.filter((lead) => lead.followUpAt && isToday(parseISO(lead.followUpAt)));
  const otherLeads = filteredLeads.filter((lead) => !todayLeads.includes(lead));
  const overdueCount = leads.filter(isOverdueLead).length;
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const pipelineValue = leads.filter((lead) => lead.status === "QUALIFIED" || lead.status === "PROPOSAL_SENT").length;
  const wonCount = leads.filter((lead) => lead.status === "WON").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.35)_100%)]">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-line">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-primary">LeadFlow</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Focused lead tracking for modern sales teams</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button onClick={() => setAddLeadOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Lead</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-line">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Leads</p>
            <p className="mt-2 text-3xl font-extrabold">{leads.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-line">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pipeline</p>
            <p className="mt-2 text-3xl font-extrabold">{pipelineValue}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-line">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Won</p>
            <p className="mt-2 text-3xl font-extrabold">{wonCount}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border bg-card/70 p-4 shadow-line backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by lead name..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Filters</span>
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatus(filter)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-muted",
                    status === filter ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950" : "bg-card text-muted-foreground"
                  )}
                >
                  {filterLabel(filter)}
                </button>
              ))}
            </div>
          </div>
          {overdueCount ? <p className="text-sm font-medium text-red-600">{overdueCount} overdue follow-up{overdueCount === 1 ? "" : "s"} need attention.</p> : null}
        </div>

        <div className="mt-8">
          {isLoading ? <LeadSkeleton /> : null}
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load leads. Start the backend and try again.</div> : null}
          {!isLoading && !error && filteredLeads.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center shadow-line">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="mt-3 text-lg font-bold">No leads match this view</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Adjust the search or filter, or add a fresh lead to start the pipeline.</p>
            </div>
          ) : null}

          {todayLeads.length ? (
            <section className="mb-8">
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-muted-foreground">Pinned Today&apos;s Follow-ups</h2>
              <div className="space-y-3">
                {todayLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onOpen={() => selectLead(lead.id)} />
                ))}
              </div>
            </section>
          ) : null}

          {otherLeads.length ? (
            <section>
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-muted-foreground">All Leads</h2>
              <div className="space-y-3">
                {otherLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onOpen={() => selectLead(lead.id)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <AddLeadDialog />
      <LeadTimelineDialog lead={selectedLead} />
    </main>
  );
}
