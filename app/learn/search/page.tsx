"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getAllDomains, flattenDomain, type LearnDomain } from "@/lib/learn";
import { Card, Badge, Skeleton, EmptyState, Button } from "@/components/ui";

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [doms, setDoms] = useState<LearnDomain[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllDomains().then(setDoms).catch(() => setDoms([]));
  }, []);

  const results = useMemo(() => {
    if (!doms) return [];
    const needle = initial.trim().toLowerCase();
    if (!needle) return [];
    const out: { domain: LearnDomain; slug: string; title: string; desc: string; module: string; why: string }[] = [];
    for (const d of doms) {
      for (const f of flattenDomain(d)) {
        const t = f.topic;
        const hay = [
          t.title, t.description,
          ...t.concepts.map((c) => `${c.term} ${c.text}`),
          ...t.keyTerms.map((k) => `${k.term} ${k.def}`),
          t.example, t.takeaway, ...t.examTips,
        ].join("\n").toLowerCase();
        if (hay.includes(needle)) {
          const hit = t.title.toLowerCase().includes(needle) ? "title" :
            t.keyTerms.some((k) => k.term.toLowerCase().includes(needle)) ? "key term" : "content";
          out.push({ domain: d, slug: t.slug, title: t.title, desc: t.description, module: f.module.title, why: hit });
        }
      }
    }
    return out;
  }, [doms, initial]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-white">Search learning</h1>
        <form
          className="relative mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const v = inputRef.current?.value.trim() ?? "";
            if (v) router.push(`/learn/search?q=${encodeURIComponent(v)}`);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            ref={inputRef}
            key={initial}
            defaultValue={initial}
            placeholder="SIEM, CVSS, EDR, phishing…"
            aria-label="Search learning content"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 sm:text-sm"
          />
        </form>
      </div>
      {doms === null ? (
        <div className="flex flex-col gap-3" aria-label="Searching">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : initial.trim() === "" ? (
        <EmptyState title="Type to search" hint="Search across every topic, concept, and key term." />
      ) : results.length === 0 ? (
        <EmptyState
          title={`No results for “${initial}”`}
          hint="Try a shorter term like SIEM, CVSS, or phishing."
          action={<Link href="/learn"><Button size="sm">Browse curriculum</Button></Link>}
        />
      ) : (
        <>
          <p className="font-mono text-xs text-slate-500">{results.length} result{results.length === 1 ? "" : "s"}</p>
          <ul className="flex flex-col gap-3">
            {results.map((r) => (
              <li key={`${r.domain.id}/${r.slug}`}>
                <Link href={`/learn/${r.domain.id}/${r.slug}`}>
                  <Card className="p-4 transition-colors hover:border-cyan-400/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="cyan">{r.domain.name}</Badge>
                      <Badge tone="default">{r.module}</Badge>
                      <span className="font-mono text-[11px] text-slate-600">matched: {r.why}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">{r.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{r.desc}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function LearnSearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <SearchInner />
    </Suspense>
  );
}
