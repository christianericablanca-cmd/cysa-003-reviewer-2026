"use client";

import { useEffect } from "react";

export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [active, onClose]);
}

function typingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export function useQuizKeys(opts: {
  enabled: boolean;
  suspended: boolean;
  onOption: (displayIndex: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { enabled, suspended, onOption, onPrev, onNext } = opts;
  useEffect(() => {
    if (!enabled || suspended) return;
    const fn = (e: KeyboardEvent) => {
      if (typingTarget(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const num = ["1", "2", "3", "4"].indexOf(k);
      const alpha = ["a", "b", "c", "d"].indexOf(k);
      const idx = num !== -1 ? num : alpha;
      if (idx !== -1) {
        e.preventDefault();
        onOption(idx);
        return;
      }
      if (k === "arrowleft") {
        e.preventDefault();
        onPrev();
      } else if (k === "arrowright") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [enabled, suspended, onOption, onPrev, onNext]);
}
