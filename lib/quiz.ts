"use client";

import { useEffect, useReducer, useCallback } from "react";

export type QuizState = {
  currentIdx: number;
  answers: Record<string, string>;
  flagged: string[];
};

export type QuizAction =
  | { type: "ANSWER"; id: string; value: string }
  | { type: "NEXT"; total: number }
  | { type: "PREVIOUS" }
  | { type: "TOGGLE_FLAG"; id: string }
  | { type: "SET_CURRENT"; idx: number; total: number }
  | { type: "RESET"; initial?: Partial<QuizState> }
  | { type: "HYDRATE"; state: QuizState };

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "ANSWER":
      return { ...state, answers: { ...state.answers, [action.id]: action.value } };
    case "NEXT":
      return { ...state, currentIdx: Math.min(action.total - 1, state.currentIdx + 1) };
    case "PREVIOUS":
      return { ...state, currentIdx: Math.max(0, state.currentIdx - 1) };
    case "TOGGLE_FLAG": {
      const has = state.flagged.includes(action.id);
      return {
        ...state,
        flagged: has ? state.flagged.filter((f) => f !== action.id) : [...state.flagged, action.id],
      };
    }
    case "SET_CURRENT":
      return {
        ...state,
        currentIdx: Math.max(0, Math.min(action.total - 1, action.idx)),
      };
    case "RESET":
      return { currentIdx: 0, answers: {}, flagged: [], ...action.initial };
    case "HYDRATE":
      return { ...action.state };
    default:
      return state;
  }
}

export const initialQuizState: QuizState = { currentIdx: 0, answers: {}, flagged: [] };

/** useReducer-backed quiz state with localStorage persistence (debounced write). */
export function usePersistentQuiz(storageKey: string, initial?: Partial<QuizState>) {
  const [state, dispatch] = useReducer(quizReducer, {
    ...initialQuizState,
    ...initial,
  });

  // Hydrate once from localStorage (SSR has no storage, so this can't be a lazy initializer)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as QuizState;
        if (
          typeof parsed.currentIdx === "number" &&
          typeof parsed.answers === "object" &&
          Array.isArray(parsed.flagged)
        ) {
          dispatch({ type: "HYDRATE", state: parsed });
        }
      }
    } catch {
      // corrupted storage -> start fresh
    }
  }, [storageKey]);

  // Persist on change (cheap: quiz states are small)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // storage full/blocked -> ignore
    }
  }, [state, storageKey]);

  const reset = useCallback(
    (next?: Partial<QuizState>) => dispatch({ type: "RESET", initial: next }),
    []
  );

  return { state, dispatch, reset };
}
