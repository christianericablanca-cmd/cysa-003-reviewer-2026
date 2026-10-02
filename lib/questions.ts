export type BankId = "cysa-100" | "reviewer-2026";
export type BankFilter = BankId | "all";

export type Bank = {
  id: BankId;
  name: string;
  short: string;
  source: string;
  description: string;
};

export type Exhibit = {
  image: string;
  title: string;
  caption: string;
};

/** Bump this whenever public/*.json changes so browsers can't serve a stale cached copy. */
const DATA_VERSION = "20261003-d";

export type Question = {
  id: string;
  bank: BankId;
  domain: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: string;
  explanation: string;
  aiGenerated: boolean;
  image?: string;
  imageCaption?: string;
};

export type QuestionValidationError = {
  id: string;
  issues: string[];
};

export function isValidQuestion(q: unknown): q is Question {
  if (typeof q !== "object" || q === null) return false;
  const o = q as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return false;
  if (typeof o.domain !== "string" || o.domain.length === 0) return false;
  if (typeof o.question !== "string" || o.question.length === 0) return false;
  if (!Array.isArray(o.options) || o.options.length !== 4) return false;
  if (!o.options.every((x) => typeof x === "string" && x.length > 0)) return false;
  if (typeof o.correctAnswer !== "string" || o.correctAnswer.length === 0) return false;
  if (!(o.options as string[]).includes(o.correctAnswer as string)) return false;
  if (typeof o.explanation !== "string" || o.explanation.length === 0) return false;
  if (typeof o.aiGenerated !== "boolean") return false;
  return true;
}

export function validateQuestions(data: unknown): {
  valid: Question[];
  errors: QuestionValidationError[];
  duplicateIds: string[];
} {
  const errors: QuestionValidationError[] = [];
  const valid: Question[] = [];
  const seen = new Set<string>();
  const dupes = new Set<string>();
  if (!Array.isArray(data)) {
    return { valid, errors: [{ id: "(root)", issues: ["questions.json is not an array"] }], duplicateIds: [] };
  }
  for (const item of data) {
    const issues: string[] = [];
    const o = item as Record<string, unknown>;
    const id = typeof o?.id === "string" ? o.id : "(missing-id)";
    if (typeof o?.id !== "string" || o.id.length === 0) issues.push("ID missing");
    else if (seen.has(o.id)) {
      issues.push("duplicate ID");
      dupes.add(o.id);
    } else seen.add(o.id);
    if (typeof o?.domain !== "string" || o.domain.length === 0) issues.push("domain missing");
    if (typeof o?.question !== "string" || o.question.length === 0) issues.push("question empty");
    if (!Array.isArray(o?.options) || o.options.length !== 4) issues.push("must have exactly 4 options");
    else if (!o.options.every((x) => typeof x === "string" && (x as string).length > 0))
      issues.push("options must be non-empty strings");
    if (typeof o?.correctAnswer !== "string" || o.correctAnswer.length === 0) issues.push("correctAnswer missing");
    else if (Array.isArray(o?.options) && !(o.options as string[]).includes(o.correctAnswer as string))
      issues.push("correctAnswer does not match any option");
  if (typeof o?.explanation !== "string" || o.explanation.length === 0) issues.push("explanation missing");
  if (typeof o?.aiGenerated !== "boolean") issues.push("aiGenerated must be boolean");
  // Backwards-tolerant: infer a missing bank from the id prefix so a stale cached
  // dataset (pre-bank era) still renders instead of validating to zero questions.
  if (o?.bank !== "cysa-100" && o?.bank !== "reviewer-2026") {
    const id = typeof o?.id === "string" ? o.id : "";
    if (id.startsWith("cysa-p1-")) (o as Record<string, unknown>).bank = "cysa-100";
    else if (id.startsWith("cysa-p2-") || id.startsWith("cysa-img-")) (o as Record<string, unknown>).bank = "reviewer-2026";
    else issues.push("bank must be cysa-100 or reviewer-2026");
  }
  if (o?.image !== undefined && typeof o.image !== "string") issues.push("image must be string");
    if (issues.length > 0) errors.push({ id, issues });
    else valid.push(item as Question);
  }
  return { valid, errors, duplicateIds: [...dupes] };
}

let cache: Question[] | null = null;
let bankCache: Bank[] | null = null;
let exhibitCache: Exhibit[] | null = null;

export async function getBanks(): Promise<Bank[]> {
  if (bankCache) return bankCache;
  const res = await fetch(`/banks.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load banks.json: ${res.status}`);
  bankCache = (await res.json()) as Bank[];
  return bankCache;
}

export async function getExhibits(): Promise<Exhibit[]> {
  if (exhibitCache) return exhibitCache;
  const res = await fetch(`/exhibits.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load exhibits.json: ${res.status}`);
  exhibitCache = (await res.json()) as Exhibit[];
  return exhibitCache;
}

export function filterByBank(questions: Question[], bank: BankFilter): Question[] {
  if (bank === "all") return questions;
  return questions.filter((q) => q.bank === bank);
}

/** Self-healing bank resolution: if the stored bank matches nothing in the
 *  loaded dataset (corrupt storage, stale data), fall back to "all" so the
 *  user can never land on a dead-end empty bank. */
export function resolveBank(stored: string | null | undefined, questions: Question[]): BankFilter {
  if (stored === "cysa-100" || stored === "reviewer-2026") {
    if (questions.some((q) => q.bank === stored)) return stored;
  }
  return "all";
}

export async function getQuestions(): Promise<Question[]> {
  if (cache) return cache;
  const res = await fetch(`/questions.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load questions.json: ${res.status}`);
  const data: unknown = await res.json();
  const { valid } = validateQuestions(data);
  cache = valid;
  return valid;
}

export function getQuestionById(questions: Question[], id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function getDomains(questions: Question[]): string[] {
  const seen: string[] = [];
  for (const q of questions) if (!seen.includes(q.domain)) seen.push(q.domain);
  return seen;
}

export function getQuestionsByDomain(questions: Question[], domain: string): Question[] {
  return questions.filter((q) => q.domain === domain);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
