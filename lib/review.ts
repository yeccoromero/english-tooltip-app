import type { Word } from "./types";

// Leitner boxes: days until the next review after a correct answer (same schedule as the extension).
export const INTERVAL_DAYS = [1, 2, 4, 8, 16, 32];
export const AGAIN_DELAY_MS = 60_000;
const DAY = 86_400_000;

export interface Grade {
  box: number;
  due: string;
  reps: number;
  lapses: number;
  updated_at: string;
}

/** New review state after the user answers. */
export function grade(w: Pick<Word, "box" | "reps" | "lapses">, known: boolean, now = Date.now()): Grade {
  const updated_at = new Date(now).toISOString();
  if (!known) {
    return { box: 0, due: new Date(now + AGAIN_DELAY_MS).toISOString(), reps: w.reps + 1, lapses: w.lapses + 1, updated_at };
  }
  const box = Math.min(w.box + 1, INTERVAL_DAYS.length);
  return { box, due: new Date(now + INTERVAL_DAYS[box - 1] * DAY).toISOString(), reps: w.reps + 1, lapses: w.lapses, updated_at };
}

/** Words to review now, most overdue first. */
export function dueQueue<T extends Pick<Word, "due" | "deleted_at">>(words: T[], now = Date.now()): T[] {
  return words
    .filter((w) => !w.deleted_at && new Date(w.due).getTime() <= now)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

/** Local calendar day key, e.g. "2026-09-30". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function countsByDay(timestamps: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of timestamps) {
    const k = dayKey(new Date(t).getTime());
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

/** Consecutive days with a review ending today, or yesterday if none yet today. */
export function streak(counts: Record<string, number>, now = Date.now()): number {
  let t = now;
  if (!counts[dayKey(t)]) t -= DAY;
  let n = 0;
  while (counts[dayKey(t)] > 0) {
    n++;
    t -= DAY;
  }
  return n;
}
