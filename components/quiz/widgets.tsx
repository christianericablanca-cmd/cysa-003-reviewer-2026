"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/scoring";

export function TimerBar({ endsAt, onExpire }: { endsAt: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (remainingMs <= 0) onExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs <= 0]);

  const urgent = remainingSec < 10 * 60;
  const critical = remainingSec < 2 * 60;

  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${formatDuration(remainingSec)}`}
      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums ${
        critical
          ? "border-red-500/60 bg-red-500/10 text-red-300"
          : urgent
            ? "border-amber-400/50 bg-amber-500/10 text-amber-300"
            : "border-white/10 bg-white/5 text-cyan-200"
      }`}
    >
      <span aria-hidden="true">⏱</span>
      <span>{formatDuration(remainingSec)}</span>
    </div>
  );
}

export function NavigatorGrid({
  total,
  currentIdx,
  answers,
  flagged,
  questionIds,
  onJump,
}: {
  total: number;
  currentIdx: number;
  answers: Record<string, string>;
  flagged: string[];
  questionIds: string[];
  onJump: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5" role="navigation" aria-label="Exam question navigator">
      {questionIds.map((id, i) => {
        const answered = !!answers[id];
        const isFlag = flagged.includes(id);
        const isCurrent = i === currentIdx;
        return (
          <button
            key={id}
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}${answered ? ", answered" : ", unanswered"}${isFlag ? ", flagged" : ""}${isCurrent ? ", current" : ""}`}
            aria-current={isCurrent ? "true" : undefined}
            className={`relative flex h-9 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              isCurrent
                ? "border-cyan-300 bg-cyan-500/25 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                : answered
                  ? "border-blue-500/40 bg-blue-600/25 text-blue-200 hover:bg-blue-600/40"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/25"
            } ${isFlag && !isCurrent ? "ring-1 ring-amber-400/70" : ""}`}
          >
            {i + 1}
            {isFlag ? (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
      <span className="sr-only">Total {total} questions</span>
    </div>
  );
}

export function ScoreRing({ scaled, size = 180 }: { scaled: number; size?: number }) {
  const pct = Math.max(0, Math.min(1, scaled / 900));
  const r = (size - 20) / 2;
  const c = 2 * Math.PI * r;
  const pass = scaled >= 750;
  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={`Estimated scaled score ${scaled} of 900, ${pass ? "pass" : "fail"}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pass ? "#10B981" : "#EF4444"}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ filter: pass ? "drop-shadow(0 0 8px rgba(16,185,129,0.5))" : "drop-shadow(0 0 8px rgba(239,68,68,0.5))", transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-extrabold text-white">{scaled}</span>
        <span className="font-mono text-xs text-slate-400">/ 900</span>
        <span className={`mt-1 rounded-full px-3 py-0.5 text-xs font-bold ${pass ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
          {pass ? "PASS" : "FAIL"}
        </span>
      </div>
    </div>
  );
}

export function DomainMasteryBar({ name, pct, sub }: { name: string; pct: number; sub?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-200">{name}</p>
        <p className="font-mono text-xs text-slate-400">{pct}%{sub ? ` · ${sub}` : ""}</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${name} mastery`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-cyan-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}
