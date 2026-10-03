export type LearnConcept = { term: string; text: string };
export type LearnWalkStep = { label: string; text: string };
export type LearnCheck = { q: string; options: [string, string, string, string]; answer: string; explain: string };

export type LearnTopic = {
  id: string;
  slug: string;
  title: string;
  description: string;
  what: string[];
  why: string[];
  concepts: LearnConcept[];
  example: string;
  scenario: { title: string; story: string; walkthrough: LearnWalkStep[] };
  technical: { title: string; text: string; code?: { lang: string; text: string } };
  exam: string[];
  confusions: { a: string; b: string; text: string }[];
  keyTerms: { term: string; def: string; example: string }[];
  mistakes: string[];
  examTips: string[];
  takeaway: string;
  checks: LearnCheck[];
};

export type LearnModule = { id: string; title: string; blurb: string; topics: LearnTopic[] };
export type LearnDomain = {
  id: string;
  name: string;
  weight: string;
  blurb: string;
  modules: LearnModule[];
};
export type DomainMeta = { id: string; name: string; weight: string; blurb: string; file: string };

const LEARN_V = "20261003-a";

let indexCache: DomainMeta[] | null = null;
const domainCache = new Map<string, LearnDomain>();

export async function getDomainIndex(): Promise<DomainMeta[]> {
  if (indexCache) return indexCache;
  const res = await fetch(`/learn/index.json?v=${LEARN_V}`, { cache: "force-cache" });
  if (!res.ok) throw new Error("Failed to load curriculum index");
  indexCache = (await res.json()) as DomainMeta[];
  return indexCache;
}

export async function getDomain(id: string): Promise<LearnDomain> {
  const hit = domainCache.get(id);
  if (hit) return hit;
  const idx = await getDomainIndex();
  const meta = idx.find((d) => d.id === id);
  if (!meta) throw new Error(`Unknown domain: ${id}`);
  const res = await fetch(`/learn/${meta.file}?v=${LEARN_V}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load domain ${id}`);
  const dom = (await res.json()) as LearnDomain;
  domainCache.set(id, dom);
  return dom;
}

export async function getAllDomains(): Promise<LearnDomain[]> {
  const idx = await getDomainIndex();
  return Promise.all(idx.map((d) => getDomain(d.id)));
}

export type FlatTopic = { domain: LearnDomain; module: LearnModule; topic: LearnTopic };

export function flattenDomain(dom: LearnDomain): FlatTopic[] {
  const out: FlatTopic[] = [];
  for (const m of dom.modules) for (const t of m.topics) out.push({ domain: dom, module: m, topic: t });
  return out;
}

// ---------- progress / bookmarks / checks (localStorage, versioned) ----------
const LP_KEY = "cysa-reviewer:v1:learn";
const GOTO_KEY = "cysa-reviewer:v1:learn-goto";

export type LearnStore = {
  completed: Record<string, number>;
  bookmarks: string[];
  checks: Record<string, { score: number; total: number }>;
  last: string | null;
  recent: string[];
};

const EMPTY: LearnStore = { completed: {}, bookmarks: [], checks: {}, last: null, recent: [] };

function readStore(): LearnStore {
  if (typeof window === "undefined") return { ...EMPTY, bookmarks: [], recent: [] };
  try {
    const raw = localStorage.getItem(LP_KEY);
    if (!raw) return { ...EMPTY, bookmarks: [], recent: [] };
    const p = JSON.parse(raw) as Partial<LearnStore>;
    return {
      completed: p.completed ?? {},
      bookmarks: Array.isArray(p.bookmarks) ? p.bookmarks : [],
      checks: p.checks ?? {},
      last: p.last ?? null,
      recent: Array.isArray(p.recent) ? p.recent : [],
    };
  } catch {
    return { ...EMPTY, bookmarks: [], recent: [] };
  }
}

function writeStore(s: LearnStore) {
  try {
    localStorage.setItem(LP_KEY, JSON.stringify(s));
  } catch {}
}

function topicKey(domainId: string, slug: string) {
  return `${domainId}/${slug}`;
}

export const learnStore = {
  read: readStore,
  isComplete(domainId: string, slug: string): boolean {
    return !!readStore().completed[topicKey(domainId, slug)];
  },
  toggleComplete(domainId: string, slug: string): boolean {
    const s = readStore();
    const k = topicKey(domainId, slug);
    if (s.completed[k]) delete s.completed[k];
    else s.completed[k] = Date.now();
    writeStore(s);
    return !!s.completed[k];
  },
  toggleBookmark(domainId: string, slug: string): boolean {
    const s = readStore();
    const k = topicKey(domainId, slug);
    s.bookmarks = s.bookmarks.includes(k) ? s.bookmarks.filter((x) => x !== k) : [...s.bookmarks, k];
    writeStore(s);
    return s.bookmarks.includes(k);
  },
  isBookmarked(domainId: string, slug: string): boolean {
    return readStore().bookmarks.includes(topicKey(domainId, slug));
  },
  recordCheck(domainId: string, slug: string, score: number, total: number) {
    const s = readStore();
    const k = topicKey(domainId, slug);
    const prev = s.checks[k];
    if (!prev || score > prev.score) s.checks[k] = { score, total };
    writeStore(s);
  },
  touchTopic(domainId: string, slug: string) {
    const s = readStore();
    const k = topicKey(domainId, slug);
    s.last = k;
    s.recent = [k, ...s.recent.filter((x) => x !== k)].slice(0, 10);
    writeStore(s);
  },
  domainProgress(dom: LearnDomain): { done: number; total: number; pct: number } {
    const s = readStore();
    const all = flattenDomain(dom);
    const done = all.filter((t) => s.completed[topicKey(dom.id, t.topic.slug)]).length;
    return { done, total: all.length, pct: all.length === 0 ? 0 : Math.round((done / all.length) * 100) };
  },
  overallProgress(doms: LearnDomain[]): { done: number; total: number; pct: number } {
    const s = readStore();
    let done = 0;
    let total = 0;
    for (const d of doms) {
      for (const t of flattenDomain(d)) {
        total += 1;
        if (s.completed[topicKey(d.id, t.topic.slug)]) done += 1;
      }
    }
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  },
  weakTopics(doms: LearnDomain[]): { domain: LearnDomain; module: LearnModule; topic: LearnTopic; pct: number }[] {
    const s = readStore();
    const out: { domain: LearnDomain; module: LearnModule; topic: LearnTopic; pct: number }[] = [];
    for (const d of doms) {
      for (const t of flattenDomain(d)) {
        const c = s.checks[topicKey(d.id, t.topic.slug)];
        if (c && c.total > 0) {
          const pct = Math.round((c.score / c.total) * 100);
          if (pct < 70) out.push({ domain: d, module: t.module, topic: t.topic, pct });
        }
      }
    }
    return out.sort((a, b) => a.pct - b.pct);
  },
};

/** Handoff: learn -> practice domain filter (consumed once by /practice on mount). */
export function setPracticeGotoDomain(domainName: string) {
  try {
    localStorage.setItem(GOTO_KEY, domainName);
  } catch {}
}
export function consumePracticeGotoDomain(): string | null {
  try {
    const v = localStorage.getItem(GOTO_KEY);
    if (v) localStorage.removeItem(GOTO_KEY);
    return v;
  } catch {
    return null;
  }
}
