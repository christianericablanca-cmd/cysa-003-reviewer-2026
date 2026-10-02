"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Flag, LayoutGrid, Play, X } from "lucide-react";
import { getQuestions, shuffle, getBanks, filterByBank, resolveBank, type Question, type Bank, type BankFilter } from "@/lib/questions";
import { store, type ExamPersist, type ExamResult } from "@/lib/storage";
import { scaledScore, percentage, EXAM_DEFAULT_COUNT, EXAM_DEFAULT_MINUTES } from "@/lib/scoring";
import { Button, Card, Progress, Skeleton, EmptyState, cn } from "@/components/ui";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { TimerBar, NavigatorGrid } from "@/components/quiz/widgets";
import { useEscape, useQuizKeys } from "@/components/quiz/useQuizKeys";

export default function ExamPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState<BankFilter>("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<ExamPersist | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [count, setCount] = useState(EXAM_DEFAULT_COUNT);
  const [minutes, setMinutes] = useState(EXAM_DEFAULT_MINUTES);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    Promise.all([getQuestions(), getBanks().catch(() => [])])
      .then(([qs, bs]) => {
        setQuestions(qs);
        setBanks(bs);
        const b = resolveBank(store.getBank(), qs);
        store.setBank(b);
        setBank(b);
        setCount(Math.min(EXAM_DEFAULT_COUNT, filterByBank(qs, b).length));
        const active = store.getExamActive();
        if (active && !active.submitted && active.questionIds.every((id) => qs.some((q) => q.id === id))) {
          setSession(active);
        }
        setLoaded(true);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load questions");
        setLoaded(true);
      });
  }, []);

  const byId = useMemo(() => new Map((questions ?? []).map((q) => [q.id, q])), [questions]);

  const persist = useCallback((s: ExamPersist) => {
    setSession(s);
    store.setExamActive(s);
  }, []);

  function startExam() {
    if (!questions) return;
    const pool = filterByBank(questions, bank);
    const n = Math.max(1, Math.min(count, pool.length));
    const ids = shuffle(pool.map((q) => q.id)).slice(0, n);
    const durSec = Math.max(60, minutes * 60);
    const now = Date.now();
    const s: ExamPersist = {
      id: `exam-${now.toString(36)}`,
      bank,
      questionIds: ids,
      answers: {},
      flagged: [],
      currentIdx: 0,
      startedAt: now,
      endsAt: now + durSec * 1000,
      durationSec: durSec,
      submitted: false,
      optOrders: Object.fromEntries(ids.map((id) => [id, shuffle([0, 1, 2, 3])])),
    };
    store.bumpSession("exam");
    persist(s);
  }

  const doSubmit = useCallback(() => {
    if (!session || !questions || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const byIdMap = new Map(questions.map((q) => [q.id, q]));
    let correct = 0;
    const perDomain: Record<string, { total: number; correct: number }> = {};
    for (const id of session.questionIds) {
      const q = byIdMap.get(id);
      if (!q) continue;
      if (!perDomain[q.domain]) perDomain[q.domain] = { total: 0, correct: 0 };
      perDomain[q.domain].total += 1;
      const a = session.answers[id];
      if (a === q.correctAnswer) {
        correct += 1;
        perDomain[q.domain].correct += 1;
      }
      // Feed mastery/review WITHOUT touching practice counters (see storage.recordExamAnswer)
      if (a !== undefined) store.recordExamAnswer(id, a === q.correctAnswer);
    }
    const total = session.questionIds.length;
    const answered = Object.keys(session.answers).length;
    const pct = percentage(correct, total);
    const scaled = scaledScore(pct);
    const timeUsedSec = Math.min(
      session.durationSec,
      Math.max(0, Math.round((Date.now() - session.startedAt) / 1000))
    );
    const result: ExamResult = {
      id: session.id,
      date: Date.now(),
      mode: "exam",
      bank: session.bank ?? "all",
      total,
      correct,
      incorrect: answered - correct,
      unanswered: total - answered,
      percent: pct,
      scaled,
      passed: scaled >= 750,
      timeUsedSec,
      questionIds: session.questionIds,
      answers: session.answers,
      perDomain,
    };
    store.addResult(result);
    store.setExamActive(null);
    router.push(`/results/${result.id}`);
  }, [session, questions, router]);

  // auto-submit guard if restored session already expired
  useEffect(() => {
    if (session && !session.submitted && Date.now() >= session.endsAt && !submittedRef.current) {
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session !== null]);

  useEscape(confirmOpen, () => setConfirmOpen(false));
  useEscape(navOpen, () => setNavOpen(false));

  function abandon() {
    if (window.confirm("Abandon this exam? Your answers will be discarded.")) {
      store.setExamActive(null);
      setSession(null);
    }
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading exam">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (loadError) {
    return <EmptyState title="Could not load questions" hint={loadError} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />;
  }
  if (!questions || questions.length === 0) {
    return <EmptyState title="No questions available" hint="questions.json is empty." />;
  }

  // ---- setup screen ----
  if (!session) {
    const pool = filterByBank(questions, bank);
    const available = pool.length;
    const capped = Math.min(EXAM_DEFAULT_COUNT, available);
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">Mock Exam</h1>
          <p className="mt-1 text-sm text-slate-400">
            Realistic exam simulation — no explanations, no instant feedback, timed.
          </p>
        </div>
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div role="group" aria-label="Choose question bank" className="flex flex-wrap gap-2">
              <button
                onClick={() => { setBank("all"); store.setBank("all"); setCount(Math.min(EXAM_DEFAULT_COUNT, questions.length)); }}
                aria-pressed={bank === "all"}
                className={cn("rounded-xl border px-3 py-1.5 font-mono text-xs font-bold", bank === "all" ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-400")}
              >
                All · {questions.length}
              </button>
              {banks.map((b) => {
                const n = questions.filter((q) => q.bank === b.id).length;
                return (
                  <button
                    key={b.id}
                    onClick={() => { setBank(b.id); store.setBank(b.id); setCount(Math.min(EXAM_DEFAULT_COUNT, n)); }}
                    aria-pressed={bank === b.id}
                    title={b.name}
                    className={cn("rounded-xl border px-3 py-1.5 font-mono text-xs font-bold", bank === b.id ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-400")}
                  >
                    {b.short} · {n}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Questions</span>
                <input
                  type="number"
                  min={5}
                  max={available}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 font-mono text-base text-white sm:text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Minutes</span>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 font-mono text-base text-white sm:text-sm"
                />
              </label>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-400">
              <p className="font-mono">Defaults: {EXAM_DEFAULT_COUNT} questions · {EXAM_DEFAULT_MINUTES} min · pass 750 (estimated scaled 100–900).</p>
              {available < EXAM_DEFAULT_COUNT ? (
                <p className="mt-1.5 text-amber-300">
                  Only {available} questions are available in this bank selection, so your exam will use all {available}. The layout stays ready for a full {EXAM_DEFAULT_COUNT}-question exam as the bank grows.
                </p>
              ) : (
                <p className="mt-1.5">
                  {available} questions available — {capped} will be drawn at random. Timer survives refresh; the exam auto-submits at 00:00.
                </p>
              )}
            </div>
            <Button size="lg" onClick={startExam}>
              <Play className="h-4 w-4" aria-hidden="true" /> Start Exam
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- active exam ----
  const total = session.questionIds.length;
  const curId = session.questionIds[Math.min(session.currentIdx, total - 1)];
  const cur = byId.get(curId);
  const answeredCount = Object.keys(session.answers).length;
  const unansweredIdx = session.questionIds.map((id, i) => (session.answers[id] === undefined ? i : -1)).filter((i) => i !== -1);

  function setAnswer(id: string, value: string) {
    persist({ ...session!, answers: { ...session!.answers, [id]: value } });
  }
  function jump(i: number) {
    persist({ ...session!, currentIdx: Math.max(0, Math.min(total - 1, i)) });
    setNavOpen(false);
    setConfirmOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toggleFlag(id: string) {
    const has = session!.flagged.includes(id);
    persist({ ...session!, flagged: has ? session!.flagged.filter((f) => f !== id) : [...session!.flagged, id] });
    // mirror into global review flags
    const g = store.getFlags();
    if (!has && !g.includes(id)) store.setFlags([...g, id]);
    if (has) store.setFlags(g.filter((x) => x !== id));
  }

  return (
    <ExamActive
      session={session}
      total={total}
      cur={cur ?? null}
      answeredCount={answeredCount}
      unansweredIdx={unansweredIdx}
      setAnswer={setAnswer}
      jump={jump}
      toggleFlag={toggleFlag}
      doSubmit={doSubmit}
      abandon={abandon}
      confirmOpen={confirmOpen}
      setConfirmOpen={setConfirmOpen}
      navOpen={navOpen}
      setNavOpen={setNavOpen}
      submitting={submitting}
    />
  );
}

function ExamActive(props: {
  session: ExamPersist;
  total: number;
  cur: Question | null;
  answeredCount: number;
  unansweredIdx: number[];
  setAnswer: (id: string, value: string) => void;
  jump: (i: number) => void;
  toggleFlag: (id: string) => void;
  doSubmit: () => void;
  abandon: () => void;
  confirmOpen: boolean;
  setConfirmOpen: (v: boolean) => void;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
  submitting: boolean;
}) {
  const { session, total, cur, answeredCount, unansweredIdx } = props;

  const orderForKeys = cur ? (session.optOrders?.[cur.id] ?? [0, 1, 2, 3]) : [0, 1, 2, 3];
  useQuizKeys({
    enabled: !!cur,
    suspended: props.confirmOpen || props.navOpen,
    onOption: (i) => {
      if (!cur) return;
      const opt = cur.options[orderForKeys[i]];
      if (opt) props.setAnswer(cur.id, opt);
    },
    onPrev: () => props.jump(session.currentIdx - 1),
    onNext: () => props.jump(session.currentIdx + 1),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-40">
          <h1 className="truncate text-lg font-extrabold text-white">Mock Exam</h1>
          <p className="font-mono text-xs text-slate-500">
            Q{Math.min(session.currentIdx + 1, total)}/{total} · {answeredCount} answered · {session.flagged.length} flagged
          </p>
        </div>
        <TimerBar endsAt={session.endsAt} onExpire={props.doSubmit} />
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => props.setNavOpen(true)} aria-label="Open question navigator" title="Navigator">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      <Progress value={((session.currentIdx + 1) / total) * 100} />

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div>
          {cur ? (
            <div key={cur.id}>
              <QuestionCard
                question={cur}
                index={session.currentIdx}
                total={total}
                selected={session.answers[cur.id]}
                locked={false}
                flagged={session.flagged.includes(cur.id)}
                onSelect={(v) => props.setAnswer(cur.id, v)}
                onToggleFlag={() => props.toggleFlag(cur.id)}
                showCorrect={false}
                optionOrder={session.optOrders?.[cur.id]}
                strikeable
                focusKey={cur.id}
              />
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Flag className="h-3 w-3" aria-hidden="true" /> Answers save silently — no feedback until submission.</span>
                <span className="font-mono text-[11px] text-slate-600">Keys 1–4 · ←/→ · right-click eliminates</span>
              </p>
            </div>
          ) : (
            <EmptyState title="Question missing" hint="This entry is malformed and was skipped." />
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => props.jump(session.currentIdx - 1)} disabled={session.currentIdx === 0}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            {session.currentIdx >= total - 1 ? (
              <Button variant="success" onClick={() => props.setConfirmOpen(true)} disabled={props.submitting}>
                {props.submitting ? "Submitting…" : "Submit Exam"}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => props.jump(session.currentIdx + 1)}>
                Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {/* Desktop navigator */}
        <aside className="hidden lg:block" aria-label="Exam navigator">
          <Card className="sticky top-4 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Navigator</p>
            <NavigatorGrid
              total={total}
              currentIdx={session.currentIdx}
              answers={session.answers}
              flagged={session.flagged}
              questionIds={session.questionIds}
              onJump={props.jump}
            />
            <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> answered</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> flagged</span>
            </div>
            <Button variant="success" className="mt-4 w-full" size="sm" onClick={() => props.setConfirmOpen(true)} disabled={props.submitting}>
              Submit Exam
            </Button>
            <Button variant="ghost" className="mt-2 w-full" size="sm" onClick={props.abandon}>
              Abandon
            </Button>
          </Card>
        </aside>
      </div>

      {/* Mobile navigator sheet */}
      {props.navOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Question navigator">
          <Card className="max-h-[80vh] w-full max-w-md overflow-y-auto p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-white">All questions</p>
              <Button variant="ghost" size="icon" onClick={() => props.setNavOpen(false)} aria-label="Close navigator">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavigatorGrid
              total={total}
              currentIdx={session.currentIdx}
              answers={session.answers}
              flagged={session.flagged}
              questionIds={session.questionIds}
              onJump={props.jump}
            />
            <Button className="mt-4 w-full" variant="success" size="sm" onClick={() => { props.setNavOpen(false); props.setConfirmOpen(true); }}>
              Review & Submit
            </Button>
            <Button className="mt-2 w-full" variant="ghost" size="sm" onClick={props.abandon}>
              Abandon exam
            </Button>
          </Card>
        </div>
      ) : null}

      {/* Submit review + confirmation (Pearson-style review screen) */}
      {props.confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-label="Submit exam confirmation">
          <Card className="max-h-[85vh] w-full max-w-md overflow-y-auto p-6">
            <p className="text-base font-bold text-white">Submit exam?</p>
            <p className="mt-2 font-mono text-sm text-slate-300">
              You have answered {answeredCount} of {total} questions.
            </p>
            {unansweredIdx.length > 0 ? (
              <div className="mt-3 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                  {unansweredIdx.length} unanswered — tap to jump back
                </p>
                <div className="mt-1.5 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {unansweredIdx.map((i) => (
                    <button
                      key={i}
                      onClick={() => props.jump(i)}
                      aria-label={`Go to unanswered question ${i + 1}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/50 bg-amber-500/10 font-mono text-xs font-bold text-amber-200 hover:bg-amber-500/20"
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-emerald-300">All questions answered ✓</p>
            )}
            {session.flagged.length > 0 ? (
              <div className="mt-3 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {session.flagged.length} flagged for review
                </p>
                <div className="mt-1.5 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {session.questionIds.map((id, i) =>
                    session.flagged.includes(id) ? (
                      <button
                        key={id}
                        onClick={() => props.jump(i)}
                        aria-label={`Go to flagged question ${i + 1}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 font-mono text-xs font-bold text-slate-300 hover:border-white/30"
                      >
                        {i + 1}
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">Are you sure you want to submit?</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => props.setConfirmOpen(false)}>Cancel</Button>
              <Button variant="success" onClick={props.doSubmit} disabled={props.submitting}>
                {props.submitting ? "Submitting…" : "Submit Exam"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
