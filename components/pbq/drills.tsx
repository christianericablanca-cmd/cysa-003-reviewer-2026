"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Check, MousePointerClick } from "lucide-react";
import { shuffle } from "@/lib/questions";
import type { KillChainDrill, PatchDrill, FieldDrillData, DrillField } from "@/lib/pbqs";
import { Button, Card, Badge, cn } from "@/components/ui";
import { ExhibitFigure } from "@/components/quiz/QuestionCard";

async function celebrate() {
  try {
    const m = await import("canvas-confetti");
    m.default({ particleCount: 70, spread: 65, origin: { y: 0.3 }, colors: ["#22D3EE", "#10B981", "#3B82F6"] });
  } catch {}
}

function bestKey(id: string) {
  return `cysa-reviewer:v1:pbq-best:${id}`;
}
function getBest(id: string): number | null {
  try {
    const v = localStorage.getItem(bestKey(id));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function setBest(id: string, v: number) {
  try {
    const prev = getBest(id);
    if (prev === null || v > prev) localStorage.setItem(bestKey(id), String(v));
  } catch {}
}

export function MatchingDrill({ drill }: { drill: KillChainDrill }) {
  const [rights, setRights] = useState<string[]>(() => shuffle(drill.pairs.map((p) => p.right)));
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const controlsRef = useRef<HTMLDivElement>(null);

  // On phones the controls sit below the fold: bring them into view after picking.
  useEffect(() => {
    if (pickedLeft && window.innerWidth < 768) {
      controlsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [pickedLeft]);

  const done = Object.keys(matched).length === drill.pairs.length;
  const score = Math.max(0, Math.round(((drill.pairs.length - mistakes) / drill.pairs.length) * 100));

  function pickRight(r: string) {
    if (!pickedLeft || matched[pickedLeft] || done) return;
    const pair = drill.pairs.find((p) => p.left === pickedLeft)!;
    if (pair.right === r) {
      const next = { ...matched, [pickedLeft]: r };
      setMatched(next);
      setPickedLeft(null);
      if (Object.keys(next).length === drill.pairs.length) {
        setBest(drill.id, Math.max(0, Math.round(((drill.pairs.length - mistakes) / drill.pairs.length) * 100)));
        void import("canvas-confetti").then((m) => {
          try {
            m.default({ particleCount: 70, spread: 65, origin: { y: 0.3 }, colors: ["#22D3EE", "#10B981", "#3B82F6"] });
          } catch {}
        });
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongFlash(`${pickedLeft}||${r}`);
      window.setTimeout(() => setWrongFlash(null), 450);
    }
  }

  function reset() {
    setMatched({});
    setPickedLeft(null);
    setMistakes(0);
    setRights(shuffle(drill.pairs.map((p) => p.right)));
  }

  const best = typeof window !== "undefined" ? getBest(drill.id) : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">{drill.title}</h3>
        <div className="flex items-center gap-2">
          {best !== null ? <Badge tone="blue" className="font-mono">best {best}%</Badge> : null}
          {done ? <Badge tone={score === 100 ? "green" : "amber"} className="font-mono">{score}%</Badge> : null}
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset drill">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{drill.scenario}</p>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
        {drill.intel.map((i) => (
          <div key={i.label} className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{i.label}</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-cyan-100">{i.value}</p>
          </div>
        ))}
      </div>

      {!done ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
          {pickedLeft ? `Selected “${pickedLeft}” — now tap its matching control.` : "Tap an activity on the left, then its matching control on the right."}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2" role="group" aria-label="Kill-chain activities">
          {drill.pairs.map((p) => {
            const isMatched = !!matched[p.left];
            const isPicked = pickedLeft === p.left;
            return (
              <button
                key={p.left}
                disabled={isMatched}
                onClick={() => setPickedLeft(isPicked ? null : p.left)}
                aria-pressed={isPicked}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-default",
                  isMatched
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                    : isPicked
                      ? "border-cyan-300 bg-cyan-500/15 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.3)]"
                      : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-cyan-400/40"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {p.left}
                  {isMatched ? <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-label="matched" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div ref={controlsRef} className="flex scroll-mt-4 flex-col gap-2" role="group" aria-label="Controls">
          {rights.map((r) => {
            const usedBy = Object.entries(matched).find(([, v]) => v === r)?.[0];
            const flash = wrongFlash?.endsWith(`||${r}`);
            return (
              <button
                key={r}
                disabled={!!usedBy || done}
                onClick={() => pickRight(r)}
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-left font-mono text-sm transition-all focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-default",
                  usedBy
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                    : flash
                      ? "animate-[shake_0.3s_ease-out] border-red-500/60 bg-red-500/10 text-red-200"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40 hover:text-slate-100"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {r}
                  {usedBy ? <span className="text-[11px] text-emerald-300/80">← {usedBy}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {done ? (
        <div role="status" className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.07] p-4">
          <p className="text-sm font-bold text-emerald-300">
            Drill complete — {Object.keys(matched).length}/{drill.pairs.length} matched · {mistakes} {mistakes === 1 ? "mistake" : "mistakes"} · {score}%
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {drill.pairs.map((p) => (
              <li key={p.left} className="text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-slate-100">{p.left}</span>
                <span className="text-slate-500"> → </span>
                <span className="font-mono text-emerald-200">{p.right}</span>
                {p.note ? <span className="text-slate-500"> — {p.note}</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">{drill.sourceNote}</p>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-600">{drill.sourceNote}</p>
      )}
    </Card>
  );
}

function fieldCorrect(f: DrillField, v: string | string[]): boolean {
  if (f.kind === "text") return (v as string).trim().toLowerCase() === f.answer.trim().toLowerCase();
  if (f.kind === "number") return Number(v) === f.answer;
  if (f.kind === "single") return v === f.answer;
  // multi: exact set match
  const got = [...(v as string[])].sort();
  const want = [...f.answers].sort();
  return got.length === want.length && got.every((x, i) => x === want[i]);
}

function fieldAnswerText(f: DrillField): string {
  if (f.kind === "multi") return f.answers.join(" + ");
  return String(f.answer);
}

export function FieldDrill({ drill }: { drill: FieldDrillData }) {
  const [values, setValues] = useState<Record<number, string | string[]>>({});
  const [checked, setChecked] = useState(false);
  const [best, setBestState] = useState<number | null>(null);

  // Hydrate best score from localStorage after mount (SSR has no storage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from external store
    setBestState(getBest(drill.id));
  }, [drill.id]);

  const results = drill.fields.map((f, i) => fieldCorrect(f, values[i] ?? (f.kind === "multi" ? [] : "")));
  const correctCount = results.filter(Boolean).length;
  const score = Math.round((correctCount / drill.fields.length) * 100);

  function set(i: number, v: string | string[]) {
    setValues((m) => ({ ...m, [i]: v }));
    setChecked(false);
  }

  function toggleMulti(i: number, opt: string) {
    const cur = (values[i] as string[]) ?? [];
    set(i, cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
  }

  const ready = drill.fields.every((f, i) => {
    const v = values[i];
    if (f.kind === "multi") return Array.isArray(v) && v.length > 0;
    return typeof v === "string" && v.trim().length > 0;
  });

  function check() {
    setChecked(true);
    const prev = getBest(drill.id);
    if (prev === null || score > prev) {
      setBest(drill.id, score);
      setBestState(score);
    }
    if (score === 100) {
      void celebrate();
    }
  }

  function reset() {
    setValues({});
    setChecked(false);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">{drill.title}</h3>
        <div className="flex items-center gap-2">
          {best !== null ? <Badge tone="blue" className="font-mono">best {best}%</Badge> : null}
          {checked ? <Badge tone={score === 100 ? "green" : "amber"} className="font-mono">{score}%</Badge> : null}
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset drill">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{drill.scenario}</p>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {drill.fields.map((f, i) => {
            const ok = checked && results[i];
            const bad = checked && !results[i];
            return (
              <div key={i}>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {i + 1} · {f.label}
                </span>
                <div className="mt-1.5">
                  {(f.kind === "text" || f.kind === "number") && (
                    <input
                      type={f.kind === "number" ? "number" : "text"}
                      value={(values[i] as string) ?? ""}
                      onChange={(e) => set(i, e.target.value)}
                      placeholder={f.placeholder}
                      aria-label={f.label}
                      className={cn(
                        "h-12 w-full rounded-xl border bg-[#0A0F1E] px-3 font-mono text-base text-white placeholder:text-slate-600 sm:text-sm",
                        ok ? "border-emerald-500/60" : bad ? "border-red-500/60" : "border-white/10"
                      )}
                    />
                  )}
                  {f.kind === "single" && (
                    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={f.label}>
                      {f.options.map((o) => {
                        const picked = values[i] === o;
                        return (
                          <button
                            key={o}
                            role="radio"
                            aria-checked={picked}
                            onClick={() => set(i, o)}
                            className={cn(
                              "rounded-xl border px-3 py-2.5 text-left font-mono text-[13px] transition-all focus-visible:outline-2 focus-visible:outline-cyan-400",
                              checked && o === f.answer
                                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                                : checked && picked
                                  ? "border-red-500/60 bg-red-500/10 text-red-200"
                                  : picked
                                    ? "border-cyan-300 bg-cyan-500/15 text-cyan-100"
                                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40"
                            )}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {f.kind === "multi" && (
                    <div className="flex flex-col gap-2" role="group" aria-label={f.label}>
                      {f.options.map((o) => {
                        const on = ((values[i] as string[]) ?? []).includes(o);
                        const isRight = f.answers.includes(o);
                        return (
                          <button
                            key={o}
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggleMulti(i, o)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left font-mono text-[13px] transition-all focus-visible:outline-2 focus-visible:outline-cyan-400",
                              checked && isRight
                                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                                : checked && on && !isRight
                                  ? "border-red-500/60 bg-red-500/10 text-red-200"
                                  : on
                                    ? "border-cyan-300 bg-cyan-500/15 text-cyan-100"
                                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40"
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                on || (checked && isRight) ? "border-cyan-300 bg-cyan-500/30 text-cyan-100" : "border-white/20"
                              )}
                            >
                              {(on || (checked && isRight)) && <Check className="h-3.5 w-3.5" />}
                            </span>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Button onClick={check} disabled={!ready}>
            <Check className="h-4 w-4" aria-hidden="true" /> Check answers
          </Button>
        </div>

        {drill.exhibit ? (
          <div className="lg:sticky lg:top-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Source exhibit</p>
            <ExhibitFigure src={drill.exhibit.src} caption={drill.exhibit.caption} />
          </div>
        ) : null}
      </div>

      {checked ? (
        <div
          role="status"
          className={cn(
            "mt-4 rounded-xl border p-4",
            score === 100 ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-amber-400/40 bg-amber-500/[0.07]"
          )}
        >
          <p className={cn("text-sm font-bold", score === 100 ? "text-emerald-300" : "text-amber-300")}>
            {score === 100 ? "Flawless — exam ready." : "Review the marked answers."} ({correctCount}/{drill.fields.length} · {score}%)
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {drill.fields.map((f, i) => (
              <li key={i} className="text-xs leading-relaxed text-slate-300">
                <span className={results[i] ? "text-emerald-300" : "text-red-300"}>{results[i] ? "✓" : "✗"}</span>{" "}
                <span className="text-slate-400">{f.label}:</span>{" "}
                <span className="font-mono text-slate-100">{fieldAnswerText(f)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{drill.explanation}</p>
          <p className="mt-2 text-[11px] text-slate-500">{drill.sourceNote}</p>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-600">{drill.sourceNote}</p>
      )}
    </Card>
  );
}

export function PatchPriorityDrill({ drill }: { drill: PatchDrill }) {
  const [server, setServer] = useState<string | null>(null);
  const [mitigation, setMitigation] = useState<string>("");
  const [checked, setChecked] = useState(false);
  const [best, setBestState] = useState<number | null>(null);

  // Hydrate best score from localStorage after mount (SSR has no storage).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from external store
    setBestState(getBest(drill.id));
  }, [drill.id]);

  const serverOk = server === drill.correctServer;
  const mitOk = mitigation === drill.correctMitigation;
  const score = (serverOk ? 50 : 0) + (mitOk ? 50 : 0);

  function check() {
    setChecked(true);
    if (serverOk && mitOk) {
      setBest(drill.id, 100);
      setBestState(100);
      void celebrate();
    } else {
      const s = score;
      const prev = getBest(drill.id);
      if (prev === null || s > prev) {
        setBest(drill.id, s);
        setBestState(s);
      }
    }
  }

  function reset() {
    setServer(null);
    setMitigation("");
    setChecked(false);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-white">{drill.title}</h3>
        <div className="flex items-center gap-2">
          {best !== null ? <Badge tone="blue" className="font-mono">best {best}%</Badge> : null}
          {checked ? <Badge tone={score === 100 ? "green" : "amber"} className="font-mono">{score}%</Badge> : null}
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset drill">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{drill.scenario}</p>

      <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
        {drill.findings.map((f) => (
          <div key={f.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <p className="text-[13px] font-bold leading-snug text-slate-100">{f.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.description}</p>
            <dl className="mt-2.5 flex flex-col gap-1 font-mono text-[11px]">
              <div className="flex justify-between gap-2"><dt className="text-slate-600">ASSET</dt><dd className="text-slate-300">{f.asset}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-600">RISK</dt><dd className="text-amber-300">{f.risk}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-600">REF</dt><dd className="text-right text-slate-300">{f.reference}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-widest text-slate-400">
            1 · Server to patch within 14 calendar days
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Server to patch">
            {drill.servers.map((s) => {
              const picked = server === s;
              const reveal = checked && s === drill.correctServer;
              const wrongPick = checked && picked && !serverOk;
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={picked}
                  onClick={() => { setServer(s); setChecked(false); }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 font-mono text-sm transition-all focus-visible:outline-2 focus-visible:outline-cyan-400",
                    reveal
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : wrongPick
                        ? "border-red-500/60 bg-red-500/10 text-red-200"
                        : picked
                          ? "border-cyan-300 bg-cyan-500/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`mit-${drill.id}`} className="text-xs font-bold uppercase tracking-widest text-slate-400">
            2 · Technique and mitigation
          </label>
          <select
            id={`mit-${drill.id}`}
            value={mitigation}
            onChange={(e) => { setMitigation(e.target.value); setChecked(false); }}
            className={cn(
              "mt-2 h-12 w-full rounded-xl border bg-[#0A0F1E] px-3 text-base text-white sm:text-sm",
              checked && mitigation !== ""
                ? mitOk
                  ? "border-emerald-500/60"
                  : "border-red-500/60"
                : "border-white/10"
            )}
          >
            <option value="">Select a mitigation…</option>
            {drill.mitigations.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <Button className="mt-3 w-full" onClick={check} disabled={!server || !mitigation}>
            <Check className="h-4 w-4" aria-hidden="true" /> Check answers
          </Button>
        </div>
      </div>

      {checked ? (
        <div
          role="status"
          className={cn(
            "mt-4 rounded-xl border p-4",
            score === 100 ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-amber-400/40 bg-amber-500/[0.07]"
          )}
        >
          <p className={cn("text-sm font-bold", score === 100 ? "text-emerald-300" : "text-amber-300")}>
            {score === 100 ? "Correct — both parts right." : "Not quite — review the marked answers."} ({score}%)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Server: <span className="font-mono text-emerald-200">{drill.correctServer}</span>
            <span className="text-slate-500"> · </span>
            Mitigation: <span className="text-emerald-200">{drill.correctMitigation}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{drill.explanation}</p>
          <p className="mt-2 text-[11px] text-slate-500">{drill.sourceNote}</p>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-600">{drill.sourceNote}</p>
      )}
    </Card>
  );
}
