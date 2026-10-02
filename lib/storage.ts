import type { Question } from "./questions";

const PREFIX = "cysa-reviewer:v1";

const K = {
  practice: `${PREFIX}:practice`,
  examActive: `${PREFIX}:exam-active`,
  results: `${PREFIX}:results`,
  history: `${PREFIX}:history`,
  flags: `${PREFIX}:flags`,
  wrong: `${PREFIX}:wrong`,
  answered: `${PREFIX}:answered`,
  stats: `${PREFIX}:stats`,
} as const;

export type PracticePersist = {
  order: string[];
  currentIdx: number;
  answers: Record<string, string>;
  flagged: string[];
  randomize: boolean;
  domainFilter: string | "all";
};

export type ExamPersist = {
  id: string;
  bank: string;
  questionIds: string[];
  answers: Record<string, string>;
  flagged: string[];
  currentIdx: number;
  startedAt: number;
  endsAt: number;
  durationSec: number;
  submitted: boolean;
  optOrders: Record<string, number[]>;
};

export type ExamResult = {
  id: string;
  date: number;
  mode: "practice" | "exam";
  bank: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percent: number;
  scaled: number;
  passed: boolean;
  timeUsedSec: number;
  questionIds: string[];
  answers: Record<string, string>;
  perDomain: Record<string, { total: number; correct: number }>;
};

export type Stats = {
  questionsDone: number;
  correctAnswers: number;
  practiceSessions: number;
  examsTaken: number;
  streakDays: string[];
  longestStreak: number;
  lastStudyDate: string | null;
};

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export const store = {
  getPractice(): PracticePersist | null {
    return safeGet<PracticePersist | null>(K.practice, null);
  },
  setPractice(v: PracticePersist) {
    safeSet(K.practice, v);
  },
  getExamActive(): ExamPersist | null {
    return safeGet<ExamPersist | null>(K.examActive, null);
  },
  setExamActive(v: ExamPersist | null) {
    if (v === null) {
      try {
        localStorage.removeItem(K.examActive);
      } catch {}
      return;
    }
    safeSet(K.examActive, v);
  },
  getResults(): ExamResult[] {
    return safeGet<ExamResult[]>(K.results, []);
  },
  addResult(r: ExamResult) {
    const all = safeGet<ExamResult[]>(K.results, []);
    safeSet(K.results, [r, ...all].slice(0, 50));
    // also append to history feed
    const h = safeGet<HistoryItem[]>(K.history, []);
    safeSet(
      K.history,
      [
        {
          id: r.id,
          date: r.date,
          mode: r.mode,
          bank: r.bank,
          total: r.total,
          correct: r.correct,
          percent: r.percent,
          passed: r.passed,
        },
        ...h,
      ].slice(0, 50)
    );
  },
  getResultById(id: string): ExamResult | undefined {
    return safeGet<ExamResult[]>(K.results, []).find((r) => r.id === id);
  },
  getFlags(): string[] {
    return safeGet<string[]>(K.flags, []);
  },
  setFlags(v: string[]) {
    safeSet(K.flags, v);
  },
  toggleFlag(id: string): string[] {
    const cur = safeGet<string[]>(K.flags, []);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    safeSet(K.flags, next);
    return next;
  },
  getWrong(): Record<string, number> {
    return safeGet<Record<string, number>>(K.wrong, {});
  },
  addWrong(questionId: string) {
    const w = safeGet<Record<string, number>>(K.wrong, {});
    w[questionId] = (w[questionId] ?? 0) + 1;
    safeSet(K.wrong, w);
  },
  removeWrong(questionId: string) {
    const w = safeGet<Record<string, number>>(K.wrong, {});
    if (questionId in w) {
      delete w[questionId];
      safeSet(K.wrong, w);
    }
  },
  touchStreak() {
    const stats = safeGet<Stats>(
      K.stats,
      {
        questionsDone: 0,
        correctAnswers: 0,
        practiceSessions: 0,
        examsTaken: 0,
        streakDays: [],
        longestStreak: 0,
        lastStudyDate: null,
      }
    );
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    if (!stats.streakDays.includes(key)) {
      stats.streakDays = [...stats.streakDays, key].slice(-60);
      let streak = 0;
      const d = new Date(today);
      const set = new Set(stats.streakDays);
      while (true) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        if (set.has(k)) {
          streak += 1;
          d.setDate(d.getDate() - 1);
        } else break;
      }
      stats.longestStreak = Math.max(stats.longestStreak, streak);
      stats.lastStudyDate = key;
      safeSet(K.stats, stats);
    }
  },
  /** Exam submission bookkeeping: updates answered/wrong maps + streak WITHOUT touching
   *  the practice counters (questionsDone/correctAnswers), so dashboard averages can't inflate. */
  recordExamAnswer(questionId: string, correct: boolean) {
    const answered = safeGet<Record<string, true>>(K.answered, {});
    answered[questionId] = true;
    safeSet(K.answered, answered);
    if (!correct) this.addWrong(questionId);
    this.touchStreak();
  },
  recordAnswer(questionId: string, correct: boolean) {
    const answered = safeGet<Record<string, true>>(K.answered, {});
    const firstTime = !answered[questionId];
    answered[questionId] = true;
    safeSet(K.answered, answered);
    if (!correct) this.addWrong(questionId);
    const stats = safeGet<Stats>(
      K.stats,
      {
        questionsDone: 0,
        correctAnswers: 0,
        practiceSessions: 0,
        examsTaken: 0,
        streakDays: [],
        longestStreak: 0,
        lastStudyDate: null,
      }
    );
    if (firstTime) stats.questionsDone += 1;
    if (correct) stats.correctAnswers += 1;
    safeSet(K.stats, stats);
    this.touchStreak();
  },
  getStats(): Stats {
    return safeGet<Stats>(K.stats, {
      questionsDone: 0,
      correctAnswers: 0,
      practiceSessions: 0,
      examsTaken: 0,
      streakDays: [],
      longestStreak: 0,
      lastStudyDate: null,
    });
  },
  getBank(): string {
    return safeGet<string>(`${PREFIX}:bank`, "all");
  },
  setBank(v: string) {
    safeSet(`${PREFIX}:bank`, v);
  },
  bumpSession(mode: "practice" | "exam") {
    const s = this.getStats();
    if (mode === "practice") s.practiceSessions += 1;
    else s.examsTaken += 1;
    safeSet(K.stats, s);
  },
  /** Domain mastery: % correct per domain based on wrong/answered maps. */
  getMastery(questions: Question[]): Record<string, { total: number; answered: number; correct: number; pct: number }> {
    const answered = safeGet<Record<string, true>>(K.answered, {});
    const wrong = safeGet<Record<string, number>>(K.wrong, {});
    const out: Record<string, { total: number; answered: number; correct: number; pct: number }> = {};
    for (const q of questions) {
      if (!out[q.domain]) out[q.domain] = { total: 0, answered: 0, correct: 0, pct: 0 };
      out[q.domain].total += 1;
      if (answered[q.id]) {
        out[q.domain].answered += 1;
        if (!wrong[q.id]) out[q.domain].correct += 1;
      }
    }
    for (const d of Object.keys(out)) {
      const m = out[d];
      m.pct = m.answered === 0 ? 0 : Math.round((m.correct / m.answered) * 100);
    }
    return out;
  },
};

export type HistoryItem = {
  id: string;
  date: number;
  mode: "practice" | "exam";
  bank: string;
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
};

export function getHistory(): HistoryItem[] {
  return safeGet<HistoryItem[]>(K.history, []);
}

export function currentStreak(stats: Stats): number {
  if (stats.streakDays.length === 0) return 0;
  const set = new Set(stats.streakDays);
  const today = new Date();
  // streak counts back from today; if today missing but yesterday present, streak still counts (user may not have studied today yet)
  let streak = 0;
  const d = new Date(today);
  if (!set.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dateKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
