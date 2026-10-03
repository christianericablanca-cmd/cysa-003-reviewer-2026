"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, Zap, BookOpen, FlaskConical } from "lucide-react";
import { getDomain, flattenDomain, learnStore, type LearnDomain } from "@/lib/learn";
import { Button, Card, Badge, Skeleton, EmptyState } from "@/components/ui";
import { Callout, CodeBlock, TopicChecks, QuickReview, CompleteButton, BookmarkButton, PracticeDomainButton } from "@/components/learn/learn-ui";

export default function TopicPage() {
  const params = useParams<{ domain: string; topic: string }>();
  const router = useRouter();
  const [dom, setDom] = useState<LearnDomain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"full" | "quick" | "deep">("full");

  useEffect(() => {
    getDomain(params.domain)
      .then(setDom)
      .catch((e) => setError(e instanceof Error ? e.message : "Topic not found"));
  }, [params.domain]);

  useEffect(() => {
    if (dom) {
      learnStore.touchTopic(dom.id, params.topic);
      window.scrollTo({ top: 0 });
    }
  }, [dom, params.topic]);

  const flat = useMemo(() => (dom ? flattenDomain(dom) : []), [dom]);
  const idx = flat.findIndex((t) => t.topic.slug === params.topic);
  const cur = idx >= 0 ? flat[idx] : null;
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;

  if (error) {
    return <EmptyState title="Topic not found" hint={error} action={<Button onClick={() => router.push("/learn")}>Back to Learn</Button>} />;
  }
  if (!dom || !cur) {
    return (
      <div className="flex flex-col gap-4" aria-label="Loading topic">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const t = cur.topic;

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
        <Link href="/learn" className="hover:text-cyan-300">Learn</Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="truncate">{dom.name}</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="truncate text-slate-300">{cur.module.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight text-white lg:text-2xl">{t.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="cyan">{dom.name}</Badge>
            <Badge tone="default">{cur.module.title}</Badge>
            <span className="font-mono text-[11px] text-slate-600">Topic {idx + 1}/{flat.length}</span>
          </div>
        </div>
        <BookmarkButton domainId={dom.id} slug={t.slug} />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2" role="group" aria-label="Reading mode">
        <button
          onClick={() => setMode("full")}
          aria-pressed={mode === "full"}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${mode === "full" ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-400"}`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Full lesson
        </button>
        <button
          onClick={() => setMode("quick")}
          aria-pressed={mode === "quick"}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${mode === "quick" ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-400"}`}
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Quick review
        </button>
        <button
          onClick={() => setMode("deep")}
          aria-pressed={mode === "deep"}
          title="Advanced pass: implementation, adversaries, and exam angles"
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${mode === "deep" ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-400"}`}
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Deep dive
        </button>
      </div>

      {/* Mobile curriculum drawer */}
      <details className="rounded-2xl border border-white/10 bg-white/[0.02] lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-200 focus-visible:outline-2 focus-visible:outline-cyan-400">
          <span className="font-mono text-[11px] text-slate-500">CURRICULUM · </span>
          {dom.name} — {flat.length} topics
        </summary>
        <div className="max-h-80 overflow-y-auto border-t border-white/5 px-2 py-2">
          {dom.modules.map((m) => (
            <details key={m.id} open={m.id === cur.module.id} className="mb-1">
              <summary className="cursor-pointer rounded-lg px-2 py-2 text-xs font-bold text-slate-300 hover:bg-white/5">
                {m.title}
              </summary>
              <ul className="mb-1 ml-2 flex flex-col border-l border-white/10 pl-2">
                {flat.filter((f) => f.module.id === m.id).map((f) => {
                  const active = f.topic.slug === t.slug;
                  const done = learnStore.isComplete(dom.id, f.topic.slug);
                  return (
                    <li key={f.topic.slug}>
                      <Link
                        href={`/learn/${dom.id}/${f.topic.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] ${active ? "bg-cyan-500/15 font-bold text-cyan-100" : "text-slate-400"}`}
                      >
                        <span aria-hidden="true" className={done ? "text-emerald-400" : ""}>{done ? "✓" : "○"}</span>
                        <span className="truncate">{f.topic.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      </details>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          {mode === "quick" ? (
            <QuickReview topic={t} />
          ) : mode === "deep" ? (
            <div className="flex flex-col gap-4">
              <Callout kind="analyst" title="DEEP DIVE — ADVANCED PASS">
                Implementation detail, adversary behavior, and exam angles. Assumes you already know the basics above — this is the second, harder pass.
              </Callout>
              <Card className="p-5">
                <h2 className="text-base font-bold text-white">How it works under the hood</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.technical.text}</p>
                {t.technical.code ? (
                  <div className="mt-3"><CodeBlock lang={t.technical.code.lang} text={t.technical.code.text} /></div>
                ) : null}
              </Card>
              <Callout kind="analyst" title={`ADVERSARY VIEW — ${t.scenario.title}`}>
                <p className="italic text-slate-200">“{t.scenario.story}”</p>
                <ol className="mt-3 flex flex-col gap-2">
                  {t.scenario.walkthrough.map((w) => (
                    <li key={w.label} className="rounded-xl bg-black/30 p-3">
                      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">{w.label}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-slate-300">{w.text}</p>
                    </li>
                  ))}
                </ol>
              </Callout>
              <Callout kind="exam" title="WHAT CYSA+ WANTS YOU TO UNDERSTAND">
                <ul className="flex list-disc flex-col gap-1.5 pl-5">
                  {t.exam.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Callout>
              <Card className="p-5">
                <h2 className="text-base font-bold text-white">Don’t confuse these</h2>
                <div className="mt-3 flex flex-col gap-2">
                  {t.confusions.map((c) => (
                    <div key={c.a + c.b} className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3">
                      <p className="text-sm font-bold text-amber-200">{c.a} vs {c.b}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{c.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <TopicChecks domainId={dom.id} slug={t.slug} topic={t} />
              <Callout kind="takeaway" title="">{t.takeaway}</Callout>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Card className="p-5" >
                <h2 id="sec-what" className="flex items-center gap-2 text-base font-bold text-white scroll-mt-24">
                  <span className="font-mono text-xs text-cyan-400">01</span> What is it?
                </h2>
                {t.what.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-slate-300">{p}</p>)}
                <h3 className="mt-4 text-sm font-bold text-slate-100">Why it matters to a SOC analyst</h3>
                {t.why.map((p, i) => <p key={i} className="mt-1.5 text-sm leading-relaxed text-slate-300">{p}</p>)}
              </Card>

              <Card className="p-5" >
                <h2 id="sec-concepts" className="flex items-center gap-2 text-base font-bold text-white scroll-mt-24">
                  <span className="font-mono text-xs text-cyan-400">02</span> Core concepts
                </h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {t.concepts.map((c) => (
                    <div key={c.term} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-sm font-bold text-cyan-200">{c.term}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.text}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5" >
                <h2 id="sec-example" className="flex items-center gap-2 text-base font-bold text-white scroll-mt-24">
                  <span className="font-mono text-xs text-cyan-400">03</span> Real-world example
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.example}</p>
              </Card>

              <div id="sec-scenario" className="scroll-mt-24">
                <Callout kind="analyst" title={`SCENARIO — ${t.scenario.title}`}>
                  <p className="italic text-slate-200">“{t.scenario.story}”</p>
                  <ol className="mt-3 flex flex-col gap-2">
                    {t.scenario.walkthrough.map((w) => (
                      <li key={w.label} className="rounded-xl bg-black/30 p-3">
                        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-400">{w.label}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-300">{w.text}</p>
                      </li>
                    ))}
                  </ol>
                </Callout>
              </div>

              <Card className="p-5" >
                <h2 id="sec-technical" className="flex items-center gap-2 text-base font-bold text-white scroll-mt-24">
                  <span className="font-mono text-xs text-cyan-400">04</span> {t.technical.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.technical.text}</p>
                {t.technical.code ? (
                  <div className="mt-3"><CodeBlock lang={t.technical.code.lang} text={t.technical.code.text} /></div>
                ) : null}
              </Card>

              <div id="sec-exam" className="scroll-mt-24">
                <Callout kind="exam" title="WHAT CYSA+ WANTS YOU TO UNDERSTAND">
                  <ul className="flex list-disc flex-col gap-1.5 pl-5">
                    {t.exam.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </Callout>
              </div>

              <Card className="p-5" >
                <h2 id="sec-confusions" className="flex items-center gap-2 text-base font-bold text-white scroll-mt-24">
                  <span className="font-mono text-xs text-cyan-400">05</span> Don’t confuse these
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {t.confusions.map((c) => (
                    <div key={c.a + c.b} className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-3">
                      <p className="text-sm font-bold text-amber-200">{c.a} vs {c.b}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{c.text}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="font-mono text-[11px] font-bold tracking-widest text-slate-400">KEY TERMS</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {t.keyTerms.map((k) => (
                      <li key={k.term} className="text-xs leading-relaxed text-slate-300">
                        <span className="font-mono font-bold text-cyan-200">{k.term}</span> — {k.def}
                        <span className="block text-slate-500">e.g. {k.example}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <div className="flex flex-col gap-3">
                  <Card className="p-4">
                    <p className="font-mono text-[11px] font-bold tracking-widest text-red-400">COMMON MISTAKES</p>
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-slate-300">
                      {t.mistakes.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </Card>
                  <Card className="p-4">
                    <p className="font-mono text-[11px] font-bold tracking-widest text-blue-400">EXAM TIPS</p>
                    <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-slate-300">
                      {t.examTips.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </Card>
                </div>
              </div>

              <div id="sec-checks" className="scroll-mt-24">
                <TopicChecks domainId={dom.id} slug={t.slug} topic={t} />
              </div>

              <Callout kind="takeaway" title="">{t.takeaway}</Callout>
            </div>
          )}

          {/* Prev / Next */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {prev ? (
              <Link href={`/learn/${dom.id}/${prev.topic.slug}`} className="min-w-0 flex-1">
                <Button variant="ghost" className="w-full justify-start">
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{prev.topic.title}</span>
                </Button>
              </Link>
            ) : <span className="flex-1" />}
            {next ? (
              <Link href={`/learn/${dom.id}/${next.topic.slug}`} className="min-w-0 flex-1">
                <Button variant="ghost" className="w-full justify-end">
                  <span className="truncate">{next.topic.title}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </Button>
              </Link>
            ) : <span className="flex-1" />}
          </div>
        </div>

        {/* Right rail */}
        <aside className="hidden lg:block" aria-label="Topic tools">
          <div className="sticky top-4 flex flex-col gap-3">
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">On this page</p>
              <nav className="mt-2 flex flex-col text-xs" aria-label="Section">
                {[["#sec-what", "What is it?"], ["#sec-concepts", "Core concepts"], ["#sec-example", "Example"], ["#sec-scenario", "Scenario"], ["#sec-technical", "Technical"], ["#sec-exam", "Exam view"], ["#sec-confusions", "Confusions"], ["#sec-checks", "Checks"]].map(([h, l]) => (
                  <a key={h} href={h} className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-white/5 hover:text-cyan-200">{l}</a>
                ))}
              </nav>
            </Card>
            <Card className="flex flex-col gap-2 p-4">
              <CompleteButton domainId={dom.id} slug={t.slug} />
              <PracticeDomainButton domainId={dom.id} />
            </Card>
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">In this module</p>
              <p className="mt-1 font-mono text-[11px] text-slate-600">{cur.module.title}</p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {flat.filter((f) => f.module.id === cur.module.id).map((f) => {
                  const active = f.topic.slug === t.slug;
                  const done = learnStore.isComplete(dom.id, f.topic.slug);
                  return (
                    <li key={f.topic.slug}>
                      <Link
                        href={`/learn/${dom.id}/${f.topic.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${active ? "bg-cyan-500/15 text-cyan-100" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
                      >
                        <span aria-hidden="true" className={done ? "text-emerald-400" : ""}>{done ? "✓" : "○"}</span>
                        <span className="truncate">{f.topic.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </aside>
      </div>

      {/* Mobile complete */}
      <div className="lg:hidden">
        <CompleteButton domainId={dom.id} slug={t.slug} />
        <div className="mt-2"><PracticeDomainButton domainId={dom.id} /></div>
      </div>
    </div>
  );
}
