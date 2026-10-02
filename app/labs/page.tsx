"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, X, Dumbbell, Gamepad2 } from "lucide-react";
import { getExhibits, type Exhibit } from "@/lib/questions";
import { KILL_CHAIN_DRILL, PATCH_DRILL, NETSTAT_DRILL, PHISHING_DRILL, DDOS_DRILL, CMD_DRILL } from "@/lib/pbqs";
import { MatchingDrill, PatchPriorityDrill, FieldDrill } from "@/components/pbq/drills";
import { Button, Card, Skeleton, EmptyState } from "@/components/ui";

export default function LabsPage() {
  const [exhibits, setExhibits] = useState<Exhibit[] | null>(null);
  const [open, setOpen] = useState<Exhibit | null>(null);

  useEffect(() => {
    getExhibits()
      .then(setExhibits)
      .catch(() => setExhibits([]));
  }, []);

  if (exhibits === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-label="Loading exhibits">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (exhibits.length === 0) {
    return <EmptyState title="No exhibits found" hint="exhibits.json could not be loaded." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          <h1 className="text-xl font-extrabold tracking-tight text-white lg:text-2xl">Hands-on Exhibits</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
          Real screenshots from the CYSA Reviewer 2026 material — ticket queues, matching
          simulations, netstat drills, and diagrams in the style of performance-based exam tasks.
          Tap any exhibit to study it full-size. Ten of these exhibits also appear as image
          questions inside the 2026 bank — try them in{" "}
          <Link href="/practice" className="font-semibold text-cyan-300 underline underline-offset-2">
            Practice
          </Link>
          .
        </p>
        <p className="mt-2 font-mono text-xs text-slate-600">{exhibits.length} exhibits · source: CYSA REVIEWER 2026</p>
      </div>

      {/* Interactive PBQ-style drills */}
      <section aria-label="Interactive drills" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Interactive drills · tap to play</h2>
        </div>
        <MatchingDrill drill={KILL_CHAIN_DRILL} />
        <PatchPriorityDrill drill={PATCH_DRILL} />
        <FieldDrill drill={NETSTAT_DRILL} />
        <FieldDrill drill={PHISHING_DRILL} />
        <FieldDrill drill={DDOS_DRILL} />
        <FieldDrill drill={CMD_DRILL} />
      </section>

      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Exhibit library · study only</h2>
      </div>

      <div className="grid items-start gap-4 sm:grid-cols-2">
        {exhibits.map((ex) => (
          <Card key={ex.image} className="overflow-hidden">
            <button
              onClick={() => setOpen(ex)}
              aria-label={`Enlarge exhibit: ${ex.title}`}
              className="block w-full focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ex.image} alt={ex.title} loading="lazy" decoding="async" className="max-h-72 w-full bg-black/40 object-contain transition-opacity hover:opacity-90" />
            </button>
            <div className="p-4">
              <p className="text-sm font-bold text-white">{ex.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{ex.caption}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-2 p-5 text-center sm:flex-row sm:justify-center">
        <p className="text-sm text-slate-300">Want to be tested on exhibits?</p>
        <Link href="/practice">
          <Button size="sm"><Dumbbell className="h-3.5 w-3.5" aria-hidden="true" /> Practice the 2026 bank</Button>
        </Link>
      </Card>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Exhibit enlarged: ${open.title}`}
          onClick={() => setOpen(null)}
        >
          <div className="relative max-h-full w-full max-w-5xl overflow-auto rounded-2xl border border-white/15 bg-[#0A0F1E] p-3">
            <button
              onClick={() => setOpen(null)}
              aria-label="Close enlarged exhibit"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/70 text-slate-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.image} alt={open.title} className="w-full rounded-xl" />
            <div className="p-2">
              <p className="text-sm font-bold text-white">{open.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{open.caption}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
