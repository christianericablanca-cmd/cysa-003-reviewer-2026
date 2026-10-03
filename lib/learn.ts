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

/** Learn domain id -> quiz question domain string (names differ slightly). */
export const LEARN_TO_QUIZ_DOMAIN: Record<string, string> = {
  "security-operations": "Security Operations",
  "vulnerability-management": "Vulnerability Management",
  "incident-response": "Incident Response and Management",
  "reporting-communication": "Reporting and Communication",
};

const STOPWORDS = new Set(
  "what,which,that,with,from,have,has,are,was,were,will,would,should,could,there,their,about,into,through,during,before,after,when,where,while,does,doing,done,than,then,also,between,both,each,other,such,only,most,more,many,much,very,just,than,too,using,used,often,well,even,ever,never,always,however,although,though,despite,toward,towards,upon,within,without,inc,including,following,based,two,three,four,five,first,second,analyst,organization,company".split(",")
);

/** Short tokens that carry signal in SOC vocabulary (ports, tools, artifacts). */
const KEEP_SHORT = new Set(
  "port,open,ports,log,logs,dns,ids,ips,cve,ioc,ioa,soc,edr,usb,mfa,vpn,waf,apt,dos,sms,ntp,ssh,rdp,smb,ftp,tcp,udp,tls,ssl,lan,wan,iam".split(",")
);

function keywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 || KEEP_SHORT.has(w) || (/^\d+$/.test(w) && w.length >= 2));
  const out = new Set<string>();
  for (const w of words) {
    if (w.length > 3 && !STOPWORDS.has(w)) out.add(w);
    else if (KEEP_SHORT.has(w)) out.add(w);
    else if (/^\d+$/.test(w) && w.length >= 2 && w.length <= 5) out.add("num" + w);
  }
  return out;
}

export type RelatedTopic = { domainId: string; domainName: string; slug: string; title: string; score: number };

/** Score learn topics against a quiz question by keyword overlap. */
export function findRelatedTopics(
  question: { domain: string; question: string; options: string[] },
  doms: LearnDomain[],
  limit = 2
): RelatedTopic[] {
  const learnId = Object.keys(LEARN_TO_QUIZ_DOMAIN).find((k) => LEARN_TO_QUIZ_DOMAIN[k] === question.domain);
  const qkeys = keywords(`${question.question} ${question.options.join(" ")}`);
  const scoreFlat = (flats: { d: LearnDomain; f: FlatTopic }[]): RelatedTopic[] => {
    const scored: RelatedTopic[] = [];
    for (const { d, f } of flats) {
      const t = f.topic;
      const text = `${t.title} ${t.description} ${t.concepts.map((c) => `${c.term} ${c.text}`).join(" ")} ${t.keyTerms.map((k) => `${k.term} ${k.def}`).join(" ")} ${t.exam.join(" ")}`;
      const tkeys = keywords(text);
      let score = 0;
      for (const w of qkeys) if (tkeys.has(w)) score += w.length > 6 ? 2 : 1;
      // title hits weigh more
      const titleKeys = keywords(t.title);
      for (const w of qkeys) if (titleKeys.has(w)) score += 2;
      if (score > 0) scored.push({ domainId: d.id, domainName: d.name, slug: t.slug, title: t.title, score });
    }
    return scored.sort((a, b) => b.score - a.score);
  };
  // Prefer same-domain topics (the quiz domain mapping is source-faithful).
  const same = learnId
    ? scoreFlat(doms.filter((d) => d.id === learnId).flatMap((d) => flattenDomain(d).map((f) => ({ d, f }))))
    : [];
  const strong = same.filter((r) => r.score >= 3);
  if (strong.length > 0) return strong.slice(0, limit);
  // Fallback: a few quiz items carry a debatable source domain — search everything.
  const all = scoreFlat(doms.flatMap((d) => flattenDomain(d).map((f) => ({ d, f }))));
  return all.slice(0, limit);
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

/** Handoff: learn -> practice domain filter (consumed once by /practice on mount).
 *  Stores the LEARN domain id; practice maps it to the quiz domain name. */
export function setPracticeGotoDomain(domainId: string) {
  try {
    localStorage.setItem(GOTO_KEY, domainId);
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
