"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, BookMarked } from "lucide-react";
import { getAllDomains, flattenDomain, type LearnDomain } from "@/lib/learn";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui";

type Entry = { term: string; def: string; example: string; domainId: string; domainName: string; slug: string; title: string };

export default function GlossaryPage() {
  const [doms, setDoms] = useState<LearnDomain[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getAllDomains().then(setDoms).catch(() => setDoms([]));
  }, []);

  const entries = useMemo(() => {
    if (!doms) return [];
    const map = new Map<string, Entry>();
    for (const d of doms) {
      for (const f of flattenDomain(d)) {
        for (const k of f.topic.keyTerms) {
          const key = k.term.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { term: k.term, def: k.def, example: k.example, domainId: d.id, domainName: d.name, slug: f.topic.slug, title: f.topic.title });
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => a.term.localeCompare(b.term));
  }, [doms]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) => e.term.toLowerCase().includes(needle) || e.def.toLowerCase().includes(needle));
  }, [entries, q]);

  if (doms === null) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading glossary">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-white">
          <BookMarked className="h-5 w-5 text-cyan-400" aria-hidden="true" /> CySA+ Glossary
        </h1>
        <p className="mt-1 font-mono text-xs text-slate-500">{entries.length} terms · built from every lesson</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter terms…"
            aria-label="Filter glossary"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 sm:text-sm"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No matching terms" hint="Try a shorter filter." />
      ) : (
        <ul className="grid items-start gap-3 sm:grid-cols-2">
          {filtered.map((e) => (
            <li key={e.term}>
              <Card className="p-4">
                <p className="font-mono text-sm font-bold text-cyan-200">{e.term}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{e.def}</p>
                <p className="mt-1 text-xs text-slate-500">e.g. {e.example}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="default">{e.domainName}</Badge>
                  <Link href={`/learn/${e.domainId}/${e.slug}`} className="text-xs font-semibold text-cyan-300 underline underline-offset-2">
                    {e.title} →
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
