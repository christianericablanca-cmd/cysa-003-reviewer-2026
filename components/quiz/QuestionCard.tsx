"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Expand, X } from "lucide-react";
import type { Question } from "@/lib/questions";
import { cn } from "@/components/ui";

const LETTERS = ["A", "B", "C", "D"];

export function ExhibitFigure({ src, caption }: { src: string; caption?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className="mt-4">
      <button
        onClick={() => setOpen(true)}
        aria-label="Enlarge exhibit image"
        className="group relative block w-full overflow-hidden rounded-xl border border-cyan-500/25 bg-black/40 focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption || "Question exhibit"} className="max-h-72 w-full object-contain" loading="lazy" />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 font-mono text-[11px] text-cyan-200 opacity-90 transition-opacity group-hover:opacity-100">
          <Expand className="h-3 w-3" aria-hidden="true" /> Exhibit · tap to enlarge
        </span>
      </button>
      {caption ? <figcaption className="mt-1.5 font-mono text-[11px] text-slate-500">{caption}</figcaption> : null}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Exhibit image enlarged"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-h-full w-full max-w-5xl overflow-auto rounded-2xl border border-white/15 bg-[#0A0F1E] p-3">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close enlarged exhibit"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/70 text-slate-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={caption || "Question exhibit enlarged"} className="w-full rounded-xl" />
            {caption ? <p className="p-2 font-mono text-xs text-slate-400">{caption}</p> : null}
          </div>
        </div>
      ) : null}
    </figure>
  );
}

export function OptionsList({
  question,
  selected,
  locked,
  onSelect,
  showCorrect = true,
  optionOrder,
  strikeable = false,
  notes,
  notesInteractive = false,
}: {
  question: Question;
  selected?: string;
  locked: boolean;
  onSelect: (value: string) => void;
  showCorrect?: boolean;
  optionOrder?: number[];
  strikeable?: boolean;
  /** Per-option notes keyed by exact option text. */
  notes?: Record<string, string>;
  /** When true, tapping a locked option expands its note instead of doing nothing. */
  notesInteractive?: boolean;
}) {
  const order = optionOrder ?? [0, 1, 2, 3];
  // Pearson-style strikethrough: right-click an option to eliminate it visually.
  // Local per-question state; the parent remounts per question via key={question.id}.
  const [struck, setStruck] = useState<number[]>([]);
  // Expanded option text for per-option notes (practice/review after answering).
  const [expanded, setExpanded] = useState<string | null>(null);
  function toggleStrike(i: number) {
    setStruck((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }
  return (
    <div role="radiogroup" aria-label="Answer options" className="flex flex-col gap-2.5">
      {order.map((optIdx, i) => {
        const opt = question.options[optIdx];
        const isSelected = selected === opt;
        const isCorrect = question.correctAnswer === opt;
        const isStruck = struck.includes(i) && !isSelected;
        const isExpanded = expanded === opt;
        const noteText = isCorrect
          ? question.explanation
          : (notes?.[opt] ?? "Incorrect — see the correct answer and explanation below.");
        let cls = "border-white/10 bg-white/[0.03] hover:border-cyan-400/50 hover:bg-cyan-500/[0.07]";
        let status: string | null = null;
        if (locked && showCorrect) {
          if (isCorrect) {
            cls = "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.25)] animate-[pop_0.25s_ease-out]";
            status = "Correct answer";
          } else if (isSelected) {
            cls = "border-red-500/60 bg-red-500/10 animate-[shake_0.3s_ease-out]";
            status = "Your answer";
          } else {
            cls = "border-white/10 bg-white/[0.02] opacity-70";
          }
        } else if (isSelected) {
          cls = "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_16px_rgba(34,211,238,0.2)]";
        }
        return (
          <div key={optIdx}>
          <button
            role="radio"
            aria-checked={isSelected}
            aria-label={`Option ${LETTERS[i]}: ${opt}${status ? ` (${status})` : ""}${isStruck ? " (eliminated)" : ""}${locked && notesInteractive ? ". Activate to read why." : ""}`}
            disabled={locked && !notesInteractive}
            onClick={() => {
              if (locked && notesInteractive) {
                setExpanded((e) => (e === opt ? null : opt));
                return;
              }
              onSelect(opt);
            }}
            onContextMenu={
              strikeable && !locked
                ? (e) => {
                    e.preventDefault();
                    toggleStrike(i);
                  }
                : undefined
            }
            title={strikeable && !locked ? "Right-click to eliminate this option" : undefined}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !locked) {
                e.preventDefault();
                onSelect(opt);
              }
            }}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
              "disabled:cursor-default",
              isStruck && !locked ? "opacity-45" : "",
              cls
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-bold",
                locked && showCorrect && isCorrect
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : isSelected
                    ? locked
                      ? "border-red-400 bg-red-500/20 text-red-300"
                      : "border-cyan-300 bg-cyan-500/20 text-cyan-200"
                    : "border-white/15 bg-white/5 text-slate-400"
              )}
              aria-hidden="true"
            >
              {LETTERS[i]}
            </span>
            <span className={cn("min-w-0 flex-1 break-words text-sm leading-relaxed text-slate-100", isStruck && !locked ? "line-through decoration-2" : "")}>{opt}</span>
            {locked && showCorrect && isCorrect ? (
              <span className="mt-1 shrink-0 text-xs font-semibold text-emerald-300">✓ Correct</span>
            ) : null}
            {locked && showCorrect && isSelected && !isCorrect ? (
              <span className="mt-1 shrink-0 text-xs font-semibold text-red-300">✗ Yours</span>
            ) : null}
            {!locked && isSelected ? (
              <span className="mt-1 shrink-0 text-xs font-semibold text-cyan-300">Selected</span>
            ) : null}
            {locked && notesInteractive ? (
              <span className="mt-1 shrink-0 font-mono text-[11px] text-slate-500" aria-hidden="true">
                {isExpanded ? "▴" : "▾ why?"}
              </span>
            ) : null}
          </button>
          {locked && notesInteractive && isExpanded ? (
            <div className="rise-in mt-1.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5">
              <p className="text-[13px] leading-relaxed text-slate-300">
                <span className={cn("font-bold", isCorrect ? "text-emerald-300" : "text-amber-300")}>
                  {isCorrect ? "Why this is right: " : "Why not: "}
                </span>
                {noteText}
              </p>
            </div>
          ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function QuestionCard({
  question,
  index,
  total,
  selected,
  locked,
  flagged,
  onSelect,
  onToggleFlag,
  showCorrect = true,
  optionOrder,
  strikeable = false,
  focusKey,
  notes,
  notesInteractive = false,
  children,
}: {
  question: Question;
  index: number;
  total: number;
  selected?: string;
  locked: boolean;
  flagged: boolean;
  onSelect: (value: string) => void;
  onToggleFlag: () => void;
  showCorrect?: boolean;
  optionOrder?: number[];
  strikeable?: boolean;
  /** When this changes (new question), move screen-reader/keyboard focus to the stem. */
  focusKey?: string;
  notes?: Record<string, string>;
  notesInteractive?: boolean;
  children?: React.ReactNode;
}) {
  const stemRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    // Don't steal focus on initial mount — only on question changes.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stemRef.current?.focus({ preventScroll: true });
  }, [focusKey]);
  return (
    <section aria-label={`Question ${index + 1} of ${total}`} className="rounded-2xl border border-white/10 bg-[#111936] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
            {question.domain}
          </span>
          <span className="font-mono text-xs text-slate-500">
            Q{index + 1}/{total} · {question.id}
          </span>
        </div>
        <button
          onClick={onToggleFlag}
          aria-pressed={flagged}
          aria-label={flagged ? "Unflag question" : "Flag question for review"}
          title={flagged ? "Unflag" : "Flag for review"}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400",
            flagged
              ? "border-amber-400/60 bg-amber-500/15 text-amber-300"
              : "border-white/10 bg-white/5 text-slate-400 hover:text-amber-300 hover:border-amber-400/40"
          )}
        >
          <Flag className="h-4 w-4" fill={flagged ? "currentColor" : "none"} />
        </button>
      </div>
      <h2 ref={stemRef} tabIndex={-1} className="mt-4 break-words text-base font-semibold leading-relaxed text-slate-50 outline-none sm:text-lg">
        {question.question}
      </h2>
      {question.image ? <ExhibitFigure src={question.image} caption={question.imageCaption} /> : null}
      {question.exhibitText ? (
        <details className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5">
          <summary className="cursor-pointer font-mono text-xs text-cyan-300">
            Exhibit transcript — read instead of squinting
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
            {question.exhibitText}
          </pre>
        </details>
      ) : null}
      <div className="mt-4">
        <OptionsList
          question={question}
          selected={selected}
          locked={locked}
          onSelect={onSelect}
          showCorrect={showCorrect}
          optionOrder={optionOrder}
          strikeable={strikeable}
          notes={notes ?? question.optionNotes}
          notesInteractive={notesInteractive}
        />
      </div>
      {children}
    </section>
  );
}

export function ExplanationBox({ question, correct }: { question: Question; correct: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-4 rounded-xl border p-4",
        correct ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-red-500/40 bg-red-500/[0.07]"
      )}
    >
      <p className={cn("text-sm font-bold", correct ? "text-emerald-300" : "text-red-300")}>
        {correct ? "Correct ✓" : "Incorrect ✗"} — Correct answer: {question.correctAnswer}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{question.explanation}</p>
      {question.aiGenerated ? (
        <p className="mt-2 text-xs text-slate-500">
          Study note prepared for this reviewer — not an official CompTIA explanation.
        </p>
      ) : null}
    </div>
  );
}
