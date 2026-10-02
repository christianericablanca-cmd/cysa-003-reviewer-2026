"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Flag, XCircle } from "lucide-react";
import { getQuestions, getBanks, getDomains, filterByBank, resolveBank, type Question, type Bank, type BankFilter } from "@/lib/questions";
import { store } from "@/lib/storage";
import { Button, Card, Badge, Skeleton, EmptyState, cn } from "@/components/ui";
import { QuestionCard, ExplanationBox } from "@/components/quiz/QuestionCard";

export default function ReviewPage() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState<BankFilter>("all");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string | "all">("all");
  const [showWrong, setShowWrong] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [wrongMap, setWrongMap] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([getQuestions().catch(() => [] as Question[]), getBanks().catch(() => [] as Bank[])]).then(([qs, bs]) => {
      setQuestions(qs);
      setBanks(bs);
      const b = resolveBank(store.getBank(), qs);
      store.setBank(b);
      setBank(b);
    });
    // Sync reads from the external localStorage store after mount (SSR has no storage).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from external store
    setFlags(store.getFlags());
    setWrongMap(store.getWrong());
  }, []);

  const domains = useMemo(() => (questions ? getDomains(questions) : []), [questions]);

  const filtered = useMemo(() => {
    if (!questions) return [];
    const pool = filterByBank(questions, bank);
    const q = query.trim().toLowerCase();
    return pool.filter((item) => {
      if (domain !== "all" && item.domain !== domain) return false;
      if (showWrong && !wrongMap[item.id]) return false;
      if (showFlagged && !flags.includes(item.id)) return false;
      if (q && !(item.question.toLowerCase().includes(q) || item.options.some((o) => o.toLowerCase().includes(q)))) return false;
      return true;
    });
  }, [questions, bank, query, domain, showWrong, showFlagged, wrongMap, flags]);

  function toggleFlag(id: string) {
    setFlags(store.toggleFlag(id));
  }

  if (questions === null) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading review bank">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-white">Review Bank</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">
          {flags.length} flagged · {Object.keys(wrongMap).length} previously missed · {questions.length} total
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          aria-label="Search questions"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 sm:text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Review filters">
        <select
          value={bank}
          onChange={(e) => { setBank(e.target.value as BankFilter); store.setBank(e.target.value); }}
          aria-label="Filter by bank"
          className="h-9 rounded-full border border-white/10 bg-[#111936] px-3 text-xs font-medium text-slate-200"
        >
          <option value="all">All Banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.short}</option>
          ))}
        </select>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          aria-label="Filter by domain"
          className="h-9 rounded-full border border-white/10 bg-[#111936] px-3 text-xs font-medium text-slate-200"
        >
          <option value="all">All Domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <ToggleChip active={showWrong} onClick={() => setShowWrong((v) => !v)} icon={<XCircle className="h-3.5 w-3.5" />}>
          Wrong
        </ToggleChip>
        <ToggleChip active={showFlagged} onClick={() => setShowFlagged((v) => !v)} icon={<Flag className="h-3.5 w-3.5" />}>
          Flagged
        </ToggleChip>
        {(query || domain !== "all" || bank !== "all" || showWrong || showFlagged) && (
          <button
            onClick={() => { setQuery(""); setDomain("all"); setBank("all"); setShowWrong(false); setShowFlagged(false); }}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={questions.length === 0 ? "No questions available" : "Nothing matches"}
          hint={
            flags.length === 0 && Object.keys(wrongMap).length === 0
              ? "Flag questions during practice/exam, or miss a few — they'll land here for long-term review."
              : "Try widening your search or clearing a filter."
          }
          action={<Link href="/practice"><Button size="sm">Go practice</Button></Link>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.slice(0, 100).map((q, i) => {
            const open = openId === q.id;
            const retry = retryAnswers[q.id];
            return (
              <li key={q.id}>
                {open ? (
                  <div className="rise-in">
                    <QuestionCard
                      question={q}
                      index={i}
                      total={filtered.length}
                      selected={retry}
                      locked={!!retry}
                      flagged={flags.includes(q.id)}
                      onSelect={(v) => {
                        setRetryAnswers((m) => ({ ...m, [q.id]: v }));
                        store.recordAnswer(q.id, v === q.correctAnswer);
                        // recordAnswer already tracks the miss; a correct retry clears it.
                        if (v === q.correctAnswer) store.removeWrong(q.id);
                        setWrongMap(store.getWrong());
                      }}
                      onToggleFlag={() => toggleFlag(q.id)}
                      strikeable
                      focusKey={q.id}
                    >
                      {retry ? <ExplanationBox question={q} correct={retry === q.correctAnswer} /> : null}
                    </QuestionCard>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setOpenId(null)}>
                      Collapse
                    </Button>
                  </div>
                ) : (
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="cyan">{q.domain}</Badge>
                      {wrongMap[q.id] ? <Badge tone="red">Incorrect{wrongMap[q.id] > 1 ? ` ×${wrongMap[q.id]}` : ""}</Badge> : null}
                      {flags.includes(q.id) ? <Badge tone="amber">Flagged</Badge> : null}
                      <span className="ml-auto font-mono text-[11px] text-slate-600">{q.id}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-200">{q.question}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => setOpenId(q.id)}>Review</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleFlag(q.id)} aria-pressed={flags.includes(q.id)}>
                        <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {flags.includes(q.id) ? "Unflag" : "Flag"}
                      </Button>
                    </div>
                  </Card>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > 100 ? (
        <p className="text-center font-mono text-xs text-slate-600">Showing first 100 of {filtered.length} — refine search to narrow.</p>
      ) : null}
    </div>
  );
}

function ToggleChip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
