import type { Word } from "./types";

const cell = (s: string | null | undefined) => `"${(s ?? "").replace(/"/g, '""')}"`;

/** Anki-friendly CSV: front, back, context, source. Starts with a BOM so Excel/Anki read UTF-8. */
export function wordsToCsv(words: Pick<Word, "text" | "translation" | "context" | "url">[]): string {
  const rows = words.map((w) => [cell(w.text), cell(w.translation), cell(w.context), cell(w.url)].join(","));
  return "﻿" + rows.join("\n");
}
