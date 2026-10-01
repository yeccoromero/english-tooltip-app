"use client";

import { countsByDay, dayKey, streak } from "@/lib/review";

/** Streak and today's count are computed in the browser so "today" follows the user's timezone. */
export function Stats({ logs, total, due }: { logs: string[]; total: number; due: number }) {
  const counts = countsByDay(logs);
  const s = streak(counts);
  const today = counts[dayKey(Date.now())] ?? 0;
  return (
    <div className="grid">
      <div className="stat"><b>{due}</b><span>por repasar</span></div>
      <div className="stat"><b>🔥 {s}</b><span>{s === 1 ? "día de racha" : "días de racha"}</span></div>
      <div className="stat"><b>{today}</b><span>{today === 1 ? "repasada hoy" : "repasadas hoy"}</span></div>
      <div className="stat"><b>{total}</b><span>palabras guardadas</span></div>
    </div>
  );
}
