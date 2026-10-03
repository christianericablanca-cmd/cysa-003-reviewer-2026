"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RotateCcw, BookmarkCheck } from "lucide-react";
import { getQuestions, type Question } from "@/lib/questions";
import { getAllDomains, findRelatedTopics, type LearnDomain } from "@/lib/learn";
import { store, type ExamResult } from "@/lib/storage";
import { formatDurationShort } from "@/lib/scoring";
import { Button, Card, Badge, EmptyState, Skeleton } from "@/components/ui";
import { ScoreRing, DomainMasteryBar } from "@/components/quiz/widgets";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [result, setResult] = useState<ExamResult | null | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [learnDoms, setLearnDoms] = useState<LearnDomain[]>([]);

  useEffect(() => {
    getAllDomains().then(setLearnDoms).catch(() => {});
  }, []);

  useEffect(() => {
    const r = store.getResultById(params.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from external store
    setResult(r ?? null);
    getQuestions()
      .then(setQuestions)
      .catch(() => setQuestions([]));
  }, [params.id]);

  useEffect(() => {
    if (result && result.passed) {
      const t = setTimeout(() => {
        void import("canvas-confetti").then((m) => {
          try {
            m.default({ particleCount: 90, spread: 70, origin: { y: 0.25 }, colors: ["#22D3EE", "#10B981", "#3B82F6", "#ffffff"] });
          } catch {}
        });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [result]);

  if (result === undefined || questions === null) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading results">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (result === null) {
    return (
      <EmptyState
        title="Result not found"
        hint="This result ID does not exist on this device. Results are stored locally."
        action={<Button onClick={() => router.push("/")}>Back to dashboard</Button>}
      />
    );
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  const wrong = result.questionIds
    .map((id) => ({ q: byId.get(id), given: result.answers[id] }))
    .filter((x) => x.q && x.given !== x.q!.correctAnswer);

  function retryWrong() {
    // seed practice with the wrong question ids
    const ids = wrong.map((w) => w.q!.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Replace your current practice queue with these ${ids.length} questions?`)) return;
    store.setPractice({ order: ids, currentIdx: 0, answers: {}, flagged: [], randomize: false, domainFilter: "all" });
    router.push("/practice");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rise-in flex flex-col items-center p-6 text-center sm:p-8">
        <ScoreRing scaled={result.scaled} />
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-slate-500">Estimated scaled score · pass 750</p>
        <p className="mt-1 text-xs text-slate-500">Transparent approximation — not official CompTIA scoring.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Badge tone="cyan" className="font-mono">{result.percent}%</Badge>
          <Badge tone="green" className="font-mono">{result.correct} correct</Badge>
          <Badge tone="red" className="font-mono">{result.incorrect} incorrect</Badge>
          <Badge tone="amber" className="font-mono">{result.unanswered} unanswered</Badge>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-xs text-slate-400">
          <span>Time used: {formatDurationShort(result.timeUsedSec)}</span>
          <span>{new Date(result.date).toLocaleString()}</span>
          <span className="uppercase">{result.mode}</span>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-bold text-white">Domain performance</h2>
        <div className="mt-4 flex flex-col gap-4">
          {Object.entries(result.perDomain).map(([d, m]) => (
            <DomainMasteryBar
              key={d}
              name={d}
              pct={m.total === 0 ? 0 : Math.round((m.correct / m.total) * 100)}
              sub={`${m.correct}/${m.total}`}
            />
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white">Wrong questions ({wrong.length})</h2>
          {wrong.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={retryWrong}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Review Wrong Questions
            </Button>
          ) : null}
        </div>
        {wrong.length === 0 ? (
          <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm text-emerald-200">
            Flawless — every answered question was correct. 🎯
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {wrong.map(({ q, given }) => (
              <li key={q!.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="cyan">{q!.domain}</Badge>
                  {given === undefined ? <Badge tone="amber">unanswered</Badge> : null}
                </div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-100">{q!.question}</p>
                <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-red-200">
                    Yours: {given ?? "—"}
                  </p>
                  <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-emerald-200">
                    Correct: {q!.correctAnswer}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{q!.explanation}</p>
                {learnDoms.length > 0 ? (
                  <div className="mt-2">
                    <p className="font-mono text-[11px] font-bold tracking-widest text-slate-500">STUDY THIS CONCEPT</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {findRelatedTopics({ domain: q!.domain, question: q!.question, options: [...q!.options] }, learnDoms).map((r) => (
                        <Link
                          key={`${r.domainId}/${r.slug}`}
                          href={`/learn/${r.domainId}/${r.slug}`}
                          className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                        >
                          📖 {r.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
                <Link href="/practice" className="mt-2 inline-block text-xs font-semibold text-cyan-300 underline underline-offset-2">
                  Retry in practice →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/exam" className="flex-1"><Button className="w-full" variant="secondary">New mock exam</Button></Link>
        <Link href="/review" className="flex-1">
          <Button className="w-full" variant="ghost"><BookmarkCheck className="h-4 w-4" aria-hidden="true" /> Open review bank</Button>
        </Link>
      </div>
    </div>
  );
}
