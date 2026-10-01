import { expect, it } from "vitest";
import { wordsToCsv } from "@/lib/csv";

it("escapes quotes and keeps commas/newlines inside cells", () => {
  const csv = wordsToCsv([{ text: 'say "hi"', translation: "di hola, amigo", context: "line1\nline2", url: null }]);
  expect(csv).toBe('﻿"say ""hi""","di hola, amigo","line1\nline2",""');
});
