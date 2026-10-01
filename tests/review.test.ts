import { describe, expect, it } from "vitest";
import { countsByDay, dayKey, dueQueue, grade, streak } from "@/lib/review";

const DAY = 86_400_000;
const w = (o = {}) => ({ box: 0, reps: 0, lapses: 0, ...o });

describe("grade", () => {
  it("correct answer advances the box and schedules days ahead", () => {
    const g = grade(w(), true, 1000);
    expect(g.box).toBe(1);
    expect(g.reps).toBe(1);
    expect(g.lapses).toBe(0);
    expect(new Date(g.due).getTime()).toBe(1000 + DAY);
    expect(grade(w({ box: 1 }), true, 1000).box).toBe(2);
  });
  it("box is capped at the last interval", () => {
    expect(grade(w({ box: 6 }), true, 0).box).toBe(6);
  });
  it("wrong answer resets to box 0, due in a minute, counts a lapse", () => {
    const g = grade(w({ box: 4, reps: 9, lapses: 1 }), false, 1000);
    expect(g.box).toBe(0);
    expect(g.lapses).toBe(2);
    expect(g.reps).toBe(10);
    expect(new Date(g.due).getTime()).toBe(61_000);
  });
});

describe("dueQueue", () => {
  it("keeps due, non-deleted words, most overdue first", () => {
    const now = 10_000;
    const iso = (ms: number) => new Date(ms).toISOString();
    const q = dueQueue(
      [
        { id: 1, due: iso(500), deleted_at: null },
        { id: 2, due: iso(99_999), deleted_at: null },
        { id: 3, due: iso(100), deleted_at: null },
        { id: 4, due: iso(50), deleted_at: iso(1) },
      ],
      now,
    );
    expect(q.map((x) => x.id)).toEqual([3, 1]);
  });
});

describe("streak", () => {
  const now = new Date(2026, 8, 30, 12).getTime();
  const k = (d: number) => dayKey(now - d * DAY);
  it("counts consecutive days ending today", () => {
    expect(streak({ [k(0)]: 3, [k(1)]: 1, [k(2)]: 5 }, now)).toBe(3);
  });
  it("stays alive when not reviewed yet today", () => {
    expect(streak({ [k(1)]: 1, [k(2)]: 2 }, now)).toBe(2);
  });
  it("a gap breaks it", () => {
    expect(streak({ [k(0)]: 1, [k(2)]: 2 }, now)).toBe(1);
    expect(streak({ [k(3)]: 4 }, now)).toBe(0);
    expect(streak({}, now)).toBe(0);
  });
  it("countsByDay groups timestamps by local day", () => {
    const t = new Date(2026, 8, 30, 9).toISOString();
    const t2 = new Date(2026, 8, 30, 21).toISOString();
    expect(countsByDay([t, t2])).toEqual({ "2026-09-30": 2 });
  });
});
