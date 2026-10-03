"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Bookmark, ChevronDown, Lightbulb, AlertTriangle, GraduationCap, FlaskConical, BookOpen } from "lucide-react";
import type { LearnCheck, LearnTopic } from "@/lib/learn";
import { learnStore, setPracticeGotoDomain } from "@/lib/learn";
import type { Question } from "@/lib/questions";
import { Button, Card, Badge, Progress, cn } from "@/components/ui";
import { OptionsList, ExplanationBox } from "@/components/quiz/QuestionCard";

export function Callout({ kind, title, children }: { kind: "analyst" | "tip" | "mistake" | "exam" | "takeaway"; title: string; children: React.ReactNode }) {
  const styles: Record<string, { box: string; icon: React.ReactNode; label: string }> = {
    analyst: { box: "border-cyan-500/30 bg-cyan-500/[0.06]", icon: <FlaskConical className="h-4 w-4 text-cyan-300" />, label: "THINK LIKE AN ANALYST" },
    tip: { box: "border-blue-500/30 bg-blue-500/[0.06]", icon: <Lightbulb className="h-4 w-4 text-blue-300" />, label: "EXAM TIP" },
    mistake: { box: "border-red-500/30 bg-red-500/[0.06]", icon: <AlertTriangle className="h-4 w-4 text-red-300" />, label: "COMMON MISTAKE" },
    exam: { box: "border-amber-400/30 bg-amber-500/[0.06]", icon: <GraduationCap className="h-4 w-4 text-amber-300" />, label: "CYSA+ EXAM PERSPECTIVE" },
    takeaway: { box: "border-emerald-500/30 bg-emerald-500/[0.06]", icon: <BookOpen className="h-4 w-4 text-emerald-300" />, label: "KEY TAKEAWAY" },
  };
  const s = styles[kind];
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", s.box)}>
      <p className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest text-slate-400">
        {s.icon} {title || s.label}
      </p>
      <div className="mt-2 text-sm leading-relaxed text-slate-200">{children}</div>
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        <span className="text-sm font-bold text-slate-100">{title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? <div className="border-t border-white/5 px-4 py-4">{children}</div> : null}
    </div>
  );
}

export function CodeBlock({ lang, text }: { lang: string; text: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
      <p className="border-b border-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-slate-500">{lang}</p>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-cyan-100">{text}</pre>
    </div>
  );
}

export function CheckCard({ slug, check, index, onAnswered }: {
  slug: string;
  check: LearnCheck;
  index: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const q: Question = {
    id: `check-${slug}-${index}`,
    bank: "cysa-100",
    domain: "Knowledge check",
    question: check.q,
    options: check.options,
    correctAnswer: check.answer,
    explanation: check.explain,
    aiGenerated: true,
  };
  function pick(v: string) {
    if (picked) return;
    setPicked(v);
    onAnswered(v === check.answer);
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="font-mono text-[11px] text-slate-500">CHECK {index + 1}</p>
      <div className="mt-2">
        <OptionsList
          question={q}
          selected={picked ?? undefined}
          locked={!!picked}
          onSelect={pick}
          showCorrect
          strikeable={false}
        />
        {picked ? <ExplanationBox question={q} correct={picked === check.answer} /> : null}
      </div>
    </div>
  );
}

export function TopicChecks({ domainId, slug, topic }: { domainId: string; slug: string; topic: LearnTopic }) {
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [recorded, setRecorded] = useState(false);
  function answered(ok: boolean) {
    const d = done + 1;
    const c = correct + (ok ? 1 : 0);
    setDone(d);
    setCorrect(c);
    if (d >= topic.checks.length && !recorded) {
      setRecorded(true);
      learnStore.recordCheck(domainId, slug, c, topic.checks.length);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Knowledge check</h3>
        {done > 0 ? (
          <Badge tone={done >= topic.checks.length && correct === topic.checks.length ? "green" : "cyan"} className="font-mono">
            {correct}/{done}
          </Badge>
        ) : null}
      </div>
      {topic.checks.map((c, i) => (
        <CheckCard key={i} slug={slug} check={c} index={i} onAnswered={answered} />
      ))}
      {done >= topic.checks.length ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center text-xs text-slate-400">
          Score saved{correct === topic.checks.length ? " — flawless." : ". Revisit the sections above for misses."}
        </p>
      ) : null}
    </div>
  );
}

export function QuickReview({ topic }: { topic: LearnTopic }) {
  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4">
        <p className="font-mono text-[11px] font-bold tracking-widest text-cyan-400">DEFINITION</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-200">{topic.description}</p>
      </Card>
      <Card className="p-4">
        <p className="font-mono text-[11px] font-bold tracking-widest text-cyan-400">KEY CONCEPTS</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {topic.concepts.map((c) => (
            <li key={c.term} className="text-sm text-slate-300"><span className="font-bold text-slate-100">{c.term}:</span> {c.text}</li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <p className="font-mono text-[11px] font-bold tracking-widest text-cyan-400">TERMS</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {topic.keyTerms.map((t) => (
            <li key={t.term} className="text-sm text-slate-300"><span className="font-mono font-bold text-cyan-200">{t.term}</span> — {t.def}</li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <p className="font-mono text-[11px] font-bold tracking-widest text-amber-400">DON&apos;T CONFUSE</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {topic.confusions.map((c) => (
            <li key={c.a + c.b} className="text-sm text-slate-300"><span className="font-bold text-slate-100">{c.a} vs {c.b}:</span> {c.text}</li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <p className="font-mono text-[11px] font-bold tracking-widest text-red-400">MISTAKES + TIPS</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-slate-300">
          {topic.mistakes.map((m, i) => <li key={i}>Avoid: {m.charAt(0).toLowerCase() + m.slice(1)}</li>)}
          {topic.examTips.map((t, i) => <li key={`t${i}`}>{t}</li>)}
        </ul>
      </Card>
      <Callout kind="takeaway" title="">{topic.takeaway}</Callout>
    </div>
  );
}

export function CompleteButton({ domainId, slug, onChange }: { domainId: string; slug: string; onChange?: (done: boolean) => void }) {
  const [done, setDone] = useState(() => learnStore.isComplete(domainId, slug));
  return (
    <Button
      variant={done ? "success" : "primary"}
      className="w-full"
      aria-pressed={done}
      onClick={() => {
        const v = learnStore.toggleComplete(domainId, slug);
        setDone(v);
        onChange?.(v);
      }}
    >
      <Check className="h-4 w-4" aria-hidden="true" /> {done ? "Completed ✓" : "Mark complete"}
    </Button>
  );
}

export function BookmarkButton({ domainId, slug }: { domainId: string; slug: string }) {
  const [on, setOn] = useState(() => learnStore.isBookmarked(domainId, slug));
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={on}
      aria-label={on ? "Remove bookmark" : "Bookmark this topic"}
      title={on ? "Remove bookmark" : "Bookmark"}
      onClick={() => setOn(learnStore.toggleBookmark(domainId, slug))}
      className={on ? "border-amber-400/60 bg-amber-500/15 text-amber-300" : ""}
    >
      <Bookmark className="h-4 w-4" fill={on ? "currentColor" : "none"} />
    </Button>
  );
}

export function DomainProgress({ pct, ...rest }: { pct: number; className?: string }) {
  return <Progress value={pct} {...rest} />;
}

export function PracticeDomainButton({ domainName }: { domainName: string }) {
  return (
    <Link href="/practice" onClick={() => setPracticeGotoDomain(domainName)}>
      <Button variant="secondary" size="sm" className="w-full">Practice this domain →</Button>
    </Link>
  );
}
