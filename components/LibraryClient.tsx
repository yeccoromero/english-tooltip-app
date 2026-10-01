"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Word } from "@/lib/types";

export function LibraryClient({ initial }: { initial: Word[] }) {
  const [words, setWords] = useState(initial);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return words;
    return words.filter((w) => w.text.toLowerCase().includes(s) || w.translation.toLowerCase().includes(s));
  }, [words, q]);

  async function remove(w: Word) {
    if (!confirm(`¿Quitar «${w.text}» de tu vocabulario?`)) return;
    setError(null);
    const now = new Date().toISOString();
    // Soft delete so the deletion also syncs to the extension.
    const { error } = await createClient().from("words").update({ deleted_at: now, updated_at: now }).eq("id", w.id);
    if (error) return setError(error.message);
    setWords((prev) => prev.filter((x) => x.id !== w.id));
  }

  return (
    <>
      <div className="toolbar">
        <input type="search" placeholder="Buscar palabra o traducción…" value={q} onChange={(e) => setQ(e.target.value)} />
        <a className="btn" href="/library/export" download>Exportar CSV</a>
      </div>
      <p className="muted">{shown.length} {shown.length === 1 ? "palabra" : "palabras"}</p>
      {error && <div className="notice err">{error}</div>}
      {words.length === 0 ? (
        <p className="muted">Aún no hay palabras. Subraya algo en una página con la extensión y pulsa ☆.</p>
      ) : (
        <ul className="list">
          {shown.map((w) => (
            <li key={w.id}>
              <div className="body">
                <div className="en">{w.text}</div>
                <div className="es">{w.translation}</div>
                {w.definition?.meaning && <div className="sub">{w.definition.meaning}</div>}
                {w.context && <div className="sub">“{w.context}”</div>}
              </div>
              <button className="icon" title="Quitar" onClick={() => remove(w)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
