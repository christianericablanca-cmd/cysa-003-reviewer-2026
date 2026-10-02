"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell, FileText, Flame, Target, ListChecks, Trophy, History, FlaskConical, Layers } from "lucide-react";
import { getQuestions, getBanks, getDomains, filterByBank, resolveBank, type Question, type Bank, type BankFilter } from "@/lib/questions";
import { store, getHistory, currentStreak, type HistoryItem } from "@/lib/storage";
import { Button, Card, Badge, Progress, Skeleton, EmptyState, cn } from "@/components/ui";
import { DomainMasteryBar } from "@/components/quiz/widgets";

export default function DashboardPage() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bank, setBank] = useState<BankFilter>("all");

  useEffect(() => {
    Promise.all([getQuestions(), getBanks().catch(() => [])])
      .then(([qs, bs]) => {
        setQuestions(qs);
        setBanks(bs);
        const b = resolveBank(store.getBank(), qs);
        store.setBank(b);
        setBank(b);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load questions"));
    // Sync read from the external localStorage store after mount (SSR has no storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from external store
    setHistory(getHistory());
  }, []);

  function pickBank(b: BankFilter) {
    setBank(b);
    store.setBank(b);
  }

  const pool = useMemo(() => (questions ? filterByBank(questions, bank) : []), [questions, bank]);
  // Cheap synchronous store reads; recomputed every render so stats never go stale.
  const stats = store.getStats();
  const streak = currentStreak(stats);
  const avg = stats.questionsDone === 0 ? 0 : Math.round((stats.correctAnswers / stats.questionsDone) * 100);
  const mastery = useMemo(() => (questions ? store.getMastery(pool) : {}), [questions, pool]);
  const domains = useMemo(() => getDomains(pool), [pool]);
  const countByBank = useMemo(() => {
    const m: Record<string, number> = { all: questions?.length ?? 0 };
    for (const q of questions ?? []) m[q.bank] = (m[q.bank] ?? 0) + 1;
    return m;
  }, [questions]);
  const bankHistory = useMemo(
    () => (bank === "all" ? history : history.filter((h) => h.bank === bank || !h.bank)),
    [history, bank]
  );

  if (loadError) {
    return (
      <EmptyState
        title="Could not load questions"
        hint={loadError}
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  if (!questions) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading dashboard">
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const statCards = [
    { label: "Questions Done", value: String(stats.questionsDone), icon: ListChecks },
    { label: "Average", value: `${avg}%`, icon: Target },
    { label: "Exams Taken", value: String(stats.examsTaken), icon: Trophy },
    { label: "Current Streak", value: `${streak}d`, icon: Flame },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <Card className="rise-in relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-blue-600/10 blur-2xl" aria-hidden="true" />
        <Badge tone="cyan" className="font-mono">CS0-003 · {pool.length} QUESTIONS{bank !== "all" ? ` · ${banks.find((b) => b.id === bank)?.short ?? bank}` : ""}</Badge>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Ready for CySA+?
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-base">Train your SOC analyst skills.</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/practice" className="flex-1 sm:flex-none">
            <Button size="lg" className="w-full sm:w-auto">
              <Dumbbell className="h-4 w-4" aria-hidden="true" /> Start Practice
            </Button>
          </Link>
          <Link href="/exam" className="flex-1 sm:flex-none">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              <FileText className="h-4 w-4" aria-hidden="true" /> Mock Exam
            </Button>
          </Link>
          <Link href="/labs" className="flex-1 sm:flex-none">
            <Button size="lg" variant="ghost" className="w-full sm:w-auto">
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> Hands-on exhibits
            </Button>
          </Link>
        </div>
      </Card>

      {/* Bank picker */}
      <section aria-label="Question banks">
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Study bank</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <BankCard
            active={bank === "all"}
            onClick={() => pickBank("all")}
            title="All banks"
            count={countByBank.all ?? 0}
            hint="Mixed drills from both reviewers"
          />
          {banks.map((b) => (
            <BankCard
              key={b.id}
              active={bank === b.id}
              onClick={() => pickBank(b.id)}
              title={b.name}
              count={countByBank[b.id] ?? 0}
              hint={b.description}
            />
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="region" aria-label="Study statistics">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon className="h-4 w-4 text-cyan-400" aria-hidden="true" />
            <p className="mt-2 font-mono text-2xl font-extrabold text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Domain mastery + history */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Domain Mastery</h2>
            <Badge tone="default" className="font-mono">{domains.length} domains</Badge>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {domains.map((d) => {
              const m = mastery[d];
              return (
                <DomainMasteryBar
                  key={d}
                  name={d}
                  pct={m?.pct ?? 0}
                  sub={m ? `${m.correct}/${m.answered} correct` : undefined}
                />
              );
            })}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-white">Recent History</h2>
          </div>
          {bankHistory.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center">
              <p className="text-sm font-medium text-slate-300">No sessions yet{bank !== "all" ? " in this bank" : ""}</p>
              <p className="mt-1 text-xs text-slate-500">
                Run a practice set or a mock exam and your history will appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {bankHistory.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-center gap-3 py-2.5">
                  <Badge tone={h.mode === "exam" ? "blue" : "cyan"}>{h.mode}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">
                      {new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
                      <span className="text-slate-500">· {h.total} Q · </span>
                      <span className="font-mono">{h.percent}%</span>
                    </p>
                  </div>
                  <Badge tone={h.passed ? "green" : "red"}>{h.passed ? "PASS" : "FAIL"}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-between">
            <Progress value={avg} className="mr-4" />
            <span className="shrink-0 font-mono text-xs text-slate-500">avg {avg}%</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BankCard({ active, onClick, title, count, hint }: { active: boolean; onClick: () => void; title: string; count: number; hint: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-cyan-400",
        active
          ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
          : "border-white/10 bg-[#111936] hover:border-white/25"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-sm font-bold leading-snug", active ? "text-cyan-100" : "text-white")}>{title}</p>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[11px] text-slate-300">{count} Q</span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">{hint}</p>
      <p className={cn("mt-2 font-mono text-[11px] font-bold", active ? "text-cyan-300" : "text-slate-600")}>
        {active ? "● SELECTED" : "○ SELECT"}
      </p>
    </button>
  );
}
