"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Search, Bookmark, FlaskConical, AlertTriangle, RotateCcw } from "lucide-react";
import { getDomainIndex, getAllDomains, learnStore, flattenDomain, type LearnDomain, type DomainMeta } from "@/lib/learn";
import { Button, Card, Badge, Progress, Skeleton, EmptyState } from "@/components/ui";
import { DomainProgress } from "@/components/learn/learn-ui";

export default function LearnDashboard() {
  const router = useRouter();
  const [index, setIndex] = useState<DomainMeta[] | null>(null);
  const [doms, setDoms] = useState<LearnDomain[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState(() => learnStore.read());
  const [q, setQ] = useState("");

  useEffect(() => {
    getDomainIndex()
      .then(setIndex)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load curriculum"));
    getAllDomains()
      .then(setDoms)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from external store
    setStore(learnStore.read());
  }, []);

  const overall = doms ? learnStore.overallProgress(doms) : { done: 0, total: 0, pct: 0 };

  const continueTopic = (() => {
    if (!doms) return null;
    const last = store.last;
    if (last) {
      const [d, s] = last.split("/");
      const dom = doms.find((x) => x.id === d);
      const flat = dom ? flattenDomain(dom) : [];
      const f = flat.find((t) => t.topic.slug === s);
      if (f) return { domain: dom!, module: f.module, slug: s, title: f.topic.title };
    }
    return null;
  })();

  const recommended = (() => {
    if (!doms) return null;
    for (const d of doms) {
      for (const t of flattenDomain(d)) {
        if (!store.completed[`${d.id}/${t.topic.slug}`]) {
          return { domain: d, module: t.module, topic: t.topic };
        }
      }
    }
    return null;
  })();

  const bookmarks = (() => {
    if (!doms) return [];
    const out: { domain: LearnDomain; slug: string; title: string }[] = [];
    for (const k of store.bookmarks) {
      const [d, s] = k.split("/");
      const dom = doms.find((x) => x.id === d);
      const f = dom ? flattenDomain(dom).find((t) => t.topic.slug === s) : undefined;
      if (dom && f) out.push({ domain: dom, slug: s, title: f.topic.title });
    }
    return out;
  })();

  const weak = doms ? learnStore.weakTopics(doms).slice(0, 5) : [];

  const recent = (() => {
    if (!doms) return [];
    const out: { domain: LearnDomain; slug: string; title: string }[] = [];
    for (const k of store.recent.slice(0, 5)) {
      const [d, s] = k.split("/");
      const dom = doms.find((x) => x.id === d);
      const f = dom ? flattenDomain(dom).find((t) => t.topic.slug === s) : undefined;
      if (dom && f) out.push({ domain: dom, slug: s, title: f.topic.title });
    }
    return out;
  })();

  if (error) {
    return <EmptyState title="Could not load curriculum" hint={error} action={<Button onClick={() => window.location.reload()}>Retry</Button>} />;
  }
  if (!index || !doms) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading learning dashboard">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="rise-in relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-2xl" aria-hidden="true" />
        <Badge tone="cyan" className="font-mono">CS0-003 · GUIDED CURRICULUM</Badge>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Learn CySA+</h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
          Study every exam topic like a SOC analyst — concepts, scenarios, then knowledge checks.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400">
            <span>Overall progress</span><span>{overall.done}/{overall.total} topics · {overall.pct}%</span>
          </div>
          <Progress value={overall.pct} className="mt-1.5" />
        </div>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          {continueTopic ? (
            <Link href={`/learn/${continueTopic.domain.id}/${continueTopic.slug}`}>
              <Button size="lg"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Continue: {continueTopic.title}</Button>
            </Link>
          ) : recommended ? (
            <Link href={`/learn/${recommended.domain.id}/${recommended.topic.slug}`}>
              <Button size="lg"><GraduationCap className="h-4 w-4" aria-hidden="true" /> Start: {recommended.topic.title}</Button>
            </Link>
          ) : null}
          <Link href="/learn/glossary">
            <Button size="lg" variant="ghost">Glossary</Button>
          </Link>
        </div>
        <form
          className="relative mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/learn/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics, terms, tools… (SIEM, CVSS, EDR)"
            aria-label="Search learning content"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-base text-white placeholder:text-slate-500 sm:text-sm"
          />
        </form>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section aria-label="Domains" className="flex flex-col gap-3">
          {doms.map((d) => {
            const p = learnStore.domainProgress(d);
            const topics = flattenDomain(d);
            return (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white">{d.name}</h2>
                    <p className="mt-0.5 font-mono text-[11px] text-cyan-400/80">{d.weight} · {topics.length} topics</p>
                  </div>
                  <Badge tone="default" className="font-mono">{p.pct}%</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{d.blurb}</p>
                <DomainProgress pct={p.pct} className="mt-3" />
                <div className="mt-3 flex flex-col gap-2.5">
                  {d.modules.map((m) => {
                    const mDone = m.topics.filter((t) => store.completed[`${d.id}/${t.slug}`]).length;
                    return (
                      <div key={m.id}>
                        <div className="flex items-baseline justify-between gap-2 px-2">
                          <p className="truncate text-xs font-bold text-slate-200">{m.title}</p>
                          <p className="shrink-0 font-mono text-[11px] text-slate-500">{mDone}/{m.topics.length}</p>
                        </div>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {m.topics.map((t) => (
                            <TopicRow
                              key={t.slug}
                              href={`/learn/${d.id}/${t.slug}`}
                              title={t.title}
                              done={!!store.completed[`${d.id}/${t.slug}`]}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </section>

        <div className="flex flex-col gap-5">
          {recommended ? (
            <Card className="border-cyan-400/30 p-5">
              <p className="font-mono text-[11px] font-bold tracking-widest text-cyan-400">RECOMMENDED NEXT</p>
              <Link href={`/learn/${recommended.domain.id}/${recommended.topic.slug}`} className="mt-1 block text-base font-bold text-white hover:text-cyan-200">
                {recommended.topic.title}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">{recommended.domain.name} · {recommended.module.title}</p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{recommended.topic.description}</p>
            </Card>
          ) : null}

          {recent.length > 0 ? (
            <Card className="p-5">
              <p className="font-mono text-[11px] font-bold tracking-widest text-slate-400">
                RECENTLY VIEWED
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {recent.map((r) => (
                  <li key={`${r.domain.id}/${r.slug}`}>
                    <Link href={`/learn/${r.domain.id}/${r.slug}`} className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {weak.length > 0 ? (
            <Card className="p-5">
              <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> WEAK AREAS — REVISIT
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {weak.map((w) => (
                  <li key={`${w.domain.id}/${w.topic.slug}`}>
                    <Link href={`/learn/${w.domain.id}/${w.topic.slug}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5">
                      <span className="truncate">{w.topic.title}</span>
                      <span className="ml-2 shrink-0 font-mono text-xs text-amber-300">{w.pct}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-5">
            <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest text-slate-400">
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" /> BOOKMARKED ({bookmarks.length})
            </p>
            {bookmarks.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Bookmark tricky topics while reading to build your hit list here.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {bookmarks.slice(0, 6).map((b) => (
                  <li key={`${b.domain.id}/${b.slug}`}>
                    <Link href={`/learn/${b.domain.id}/${b.slug}`} className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5">
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex items-center gap-3 p-5">
            <FlaskConical className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-white">Learned it? Prove it.</p>
              <p className="text-xs text-slate-500">Hands-on drills and exam questions wait in Labs and Practice.</p>
            </div>
            <Link href="/labs" className="ml-auto shrink-0">
              <Button size="sm" variant="secondary">Labs</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TopicRow({ href, title, done }: { href: string; title: string; done: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
      <span className={done ? "text-emerald-400" : "text-slate-600"} aria-hidden="true">{done ? "✓" : "○"}</span>
      <span className="truncate">{title}</span>
    </Link>
  );
}
