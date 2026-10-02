"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Shuffle, RotateCcw, Flag, Crosshair, Layers } from "lucide-react";
import { getQuestions, getBanks, getDomains, filterByBank, resolveBank, shuffle, type Question, type Bank, type BankFilter } from "@/lib/questions";
import { store, type ExamResult } from "@/lib/storage";
import { scaledScore, percentage } from "@/lib/scoring";
import { Button, Card, Badge, Progress, Skeleton, EmptyState, cn } from "@/components/ui";
import { QuestionCard, ExplanationBox } from "@/components/quiz/QuestionCard";
import { useQuizKeys } from "@/components/quiz/useQuizKeys";

const SHORT_DOMAIN: Record<string, string> = {
  "Security Operations": "Security Ops",
  "Vulnerability Management": "Vuln Mgmt",
  "Incident Response and Management": "Incident Response",
  "Reporting and Communication": "Reporting",
};

function buildOptOrders(ids: string[], rand: boolean): Record<string, number[]> {
  return Object.fromEntries(ids.map((id) => [id, rand ? shuffle([0, 1, 2, 3]) : [0, 1, 2, 3]]));
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bank, setBank] = useState<BankFilter>("all");
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<string[]>(() => store.getFlags());
  const [randomize, setRandomize] = useState(true);
  const [domainFilter, setDomainFilter] = useState<string | "all">("all");
  const [optOrders, setOptOrders] = useState<Record<string, number[]>>({});
  const [ready, setReady] = useState(false);
  const sessionStart = useRef<number>(0);
  const recordedKey = useRef<string | null>(null);
  const firstNav = useRef(true);

  useEffect(() => {
    Promise.all([getQuestions(), getBanks().catch(() => [])])
      .then(([qs, bs]) => {
        setQuestions(qs);
        setBanks(bs);
        const b = resolveBank(store.getBank(), qs);
        store.setBank(b);
        setBank(b);
        const poolIds = filterByBank(qs, b).map((q) => q.id);
        const saved = store.getPractice();
        if (saved && saved.order.length > 0 && saved.order.every((id) => poolIds.includes(id))) {
          setOrder(saved.order);
          setIdx(Math.min(saved.currentIdx, saved.order.length - 1));
          setAnswers(saved.answers);
          setRandomize(saved.randomize);
          setDomainFilter(saved.domainFilter);
          setOptOrders(buildOptOrders(saved.order, saved.randomize));
        } else {
          const fresh = shuffle(poolIds);
          setOrder(fresh);
          setOptOrders(buildOptOrders(fresh, true));
        }
        setReady(true);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load questions"));
    sessionStart.current = Date.now();
  }, []);

  const byId = useMemo(() => new Map((questions ?? []).map((q) => [q.id, q])), [questions]);
  const pool = useMemo(() => (questions ? filterByBank(questions, bank) : []), [questions, bank]);
  const domains = useMemo(() => getDomains(pool), [pool]);

  const filteredOrder = useMemo(() => {
    if (domainFilter === "all") return order;
    return order.filter((id) => byId.get(id)?.domain === domainFilter);
  }, [order, domainFilter, byId]);

  const safeIdx = Math.min(idx, Math.max(0, filteredOrder.length - 1));
  const currentId = filteredOrder[safeIdx];
  const current = currentId ? byId.get(currentId) : undefined;

  // persist after every answer/flag change
  useEffect(() => {
    if (!ready || order.length === 0) return;
    store.setPractice({ order, currentIdx: idx, answers, flagged: flags, randomize, domainFilter });
  }, [ready, order, idx, answers, flags, randomize, domainFilter]);

  // smooth scroll back to the question on navigation (not on first paint)
  useEffect(() => {
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentId]);

  // scoped to the active order so switching banks doesn't mix stats
  const sessionStats = useMemo(() => {
    const inOrder = new Set(order);
    let answered = 0;
    let correct = 0;
    for (const [id, v] of Object.entries(answers)) {
      if (!inOrder.has(id)) continue;
      answered += 1;
      if (byId.get(id)?.correctAnswer === v) correct += 1;
    }
    return { answered, correct, accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100) };
  }, [answers, byId, order]);

  // Record a practice completion into history once per finished set
  useEffect(() => {
    if (!ready || filteredOrder.length === 0) return;
    const allAnswered = filteredOrder.every((id) => answers[id] !== undefined);
    if (!allAnswered) return;
    const key = `${bank}|${filteredOrder.join(",")}`;
    if (recordedKey.current === key) return;
    recordedKey.current = key;
    let correct = 0;
    const perDomain: Record<string, { total: number; correct: number }> = {};
    for (const id of filteredOrder) {
      const q = byId.get(id);
      if (!q) continue;
      if (!perDomain[q.domain]) perDomain[q.domain] = { total: 0, correct: 0 };
      perDomain[q.domain].total += 1;
      if (answers[id] === q.correctAnswer) {
        correct += 1;
        perDomain[q.domain].correct += 1;
      }
    }
    const pct = percentage(correct, filteredOrder.length);
    const scaled = scaledScore(pct);
    const result: ExamResult = {
      id: `practice-${Date.now().toString(36)}`,
      date: Date.now(),
      mode: "practice",
      bank,
      total: filteredOrder.length,
      correct,
      incorrect: filteredOrder.length - correct,
      unanswered: 0,
      percent: pct,
      scaled,
      passed: pct >= 83,
      timeUsedSec: Math.max(0, Math.round((Date.now() - sessionStart.current) / 1000)),
      questionIds: [...filteredOrder],
      answers: { ...answers },
      perDomain,
    };
    store.addResult(result);
  }, [ready, answers, filteredOrder, byId, bank]);

  function freshSession(ids: string[], rand: boolean) {
    setOrder(shuffle(ids));
    setOptOrders(buildOptOrders(ids, rand));
    setIdx(0);
    sessionStart.current = Date.now();
    recordedKey.current = null;
  }

  function switchBank(b: BankFilter) {
    setBank(b);
    store.setBank(b);
    if (!questions) return;
    freshSession(filterByBank(questions, b).map((q) => q.id), randomize);
    setDomainFilter("all");
  }

  function reshuffleAll() {
    freshSession(pool.map((q) => q.id), randomize);
  }

  function resetProgress() {
    setAnswers({});
    setIdx(0);
    sessionStart.current = Date.now();
    recordedKey.current = null;
  }

  function toggleRandomize(v: boolean) {
    setRandomize(v);
    if (order.length > 0) setOptOrders(buildOptOrders(order, v));
  }

  function answerCurrent(value: string) {
    if (!current || answers[current.id]) return;
    if (Object.keys(answers).length === 0) store.bumpSession("practice");
    setAnswers((a) => ({ ...a, [current.id]: value }));
    store.recordAnswer(current.id, value === current.correctAnswer);
  }

  function toggleFlag(id: string) {
    setFlags(store.toggleFlag(id));
  }

  function go(i: number) {
    setIdx(Math.max(0, Math.min(filteredOrder.length - 1, i)));
  }

  // keyboard: 1-4 / A-D answer, arrows navigate
  const orderForKeys = current ? (optOrders[current.id] ?? [0, 1, 2, 3]) : [0, 1, 2, 3];
  useQuizKeys({
    enabled: !!current,
    suspended: false,
    onOption: (i) => {
      if (!current || answers[current.id]) return;
      const opt = current.options[orderForKeys[i]];
      if (opt) answerCurrent(opt);
    },
    onPrev: () => go(safeIdx - 1),
    onNext: () => go(safeIdx + 1),
  });

  if (loadError) {
    return <EmptyState title="Could not load questions" hint={loadError} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />;
  }
  if (!questions || !ready) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading practice">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (pool.length === 0) {
    return <EmptyState title="No questions in this bank" hint="Try a different bank." action={<Button onClick={() => switchBank("all")}>Show all banks</Button>} />;
  }

  const selected = current ? answers[current.id] : undefined;
  const locked = !!selected;
  const correct = !!current && selected === current.correctAnswer;
  const done = filteredOrder.length === 0 ? 0 : ((safeIdx + 1) / filteredOrder.length) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white lg:text-2xl">CySA+ Practice</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">
            Question {filteredOrder.length === 0 ? 0 : safeIdx + 1} / {filteredOrder.length}
            <span className="mx-1.5 text-slate-700">|</span>
            {sessionStats.answered} answered
            <span className="mx-1.5 text-slate-700">|</span>
            {sessionStats.accuracy}% accuracy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400/40">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => toggleRandomize(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
              aria-label="Randomize questions"
            />
            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Random
          </label>
          <Button variant="ghost" size="icon" onClick={resetProgress} aria-label="Reset practice progress" title="Reset progress">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Progress value={done} />

      {/* Bank tabs */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose question bank">
        <Layers className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        <BankTab active={bank === "all"} onClick={() => switchBank("all")}>All · {questions.length}</BankTab>
        {banks.map((b) => (
          <BankTab key={b.id} active={bank === b.id} onClick={() => switchBank(b.id)} title={b.name}>
            {b.short} · {questions.filter((q) => q.bank === b.id).length}
          </BankTab>
        ))}
      </div>

      {/* Domain filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by domain">
        <FilterChip active={domainFilter === "all"} onClick={() => { setDomainFilter("all"); setIdx(0); }}>
          All domains
        </FilterChip>
        {domains.map((d) => (
          <FilterChip key={d} active={domainFilter === d} onClick={() => { setDomainFilter(d); setIdx(0); }} title={d}>
            {SHORT_DOMAIN[d] ?? d}
          </FilterChip>
        ))}
      </div>

      {!current ? (
        <EmptyState title="No questions in this filter" hint="Try a different domain." />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-w-0">
            <div key={current.id} className="rise-in">
              <QuestionCard
                question={current}
                index={safeIdx}
                total={filteredOrder.length}
                selected={selected}
                locked={locked}
                flagged={flags.includes(current.id)}
                onSelect={answerCurrent}
                onToggleFlag={() => toggleFlag(current.id)}
                optionOrder={optOrders[current.id]}
                strikeable
                focusKey={current.id}
              >
                {locked ? <ExplanationBox question={current} correct={correct} /> : null}
              </QuestionCard>
              <p className="mt-2 font-mono text-[11px] text-slate-600">
                Keys 1–4 answer · ←/→ navigate · right-click eliminates an option
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => go(safeIdx - 1)} disabled={safeIdx === 0}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous
              </Button>
              <span className="hidden font-mono text-[11px] text-slate-600 sm:block">
                {current.id}
              </span>
              <Button
                variant="ghost"
                onClick={() => go(safeIdx + 1)}
                disabled={safeIdx >= filteredOrder.length - 1}
              >
                Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <aside className="hidden lg:block" aria-label="Practice session">
            <Card className="sticky top-4 p-5">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Session</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Stat label="Answered" value={`${sessionStats.answered}`} />
                <Stat label="Correct" value={`${sessionStats.correct}`} />
                <Stat label="Accuracy" value={`${sessionStats.accuracy}%`} />
                <Stat label="Flagged" value={`${flags.length}`} />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>Progress</span><span>{Math.round(done)}%</span>
                </div>
                <Progress value={done} className="mt-1.5" />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {randomize ? (
                  <Button variant="ghost" size="sm" className="w-full" onClick={reshuffleAll}>
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Reshuffle
                  </Button>
                ) : null}
                <Link href="/review">
                  <Button variant="ghost" size="sm" className="w-full">
                    <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Open review bank
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
                Flag tricky questions to revisit them later in Review.
              </p>
            </Card>
          </aside>
        </div>
      )}

      <div className="flex justify-center lg:hidden">
        {randomize ? (
          <Button variant="ghost" size="sm" onClick={reshuffleAll}>
            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> Reshuffle questions
          </Button>
        ) : null}
      </div>

      {locked && safeIdx >= filteredOrder.length - 1 ? (
        <Card className="p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <Badge tone={sessionStats.accuracy >= 83 ? "green" : "amber"} className="font-mono">
              {sessionStats.accuracy}% accuracy
            </Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-200">Set complete — nice work, analyst. Saved to history.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" variant="ghost" onClick={reshuffleAll}>Practice again</Button>
            <Link href="/exam"><Button size="sm" variant="secondary">Try a mock exam</Button></Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function BankTab({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-colors",
        active
          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center">
      <p className="font-mono text-lg font-extrabold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
      )}
    >
      {children}
    </button>
  );
}
