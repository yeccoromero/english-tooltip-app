"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { grade } from "@/lib/review";
import type { Word } from "@/lib/types";

function Highlighted({ text, word }: { text: string; word: string }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + word.length)}</mark>
      {text.slice(i + word.length)}
    </>
  );
}

export function ReviewClient({ initial }: { initial: Word[] }) {
  const [queue, setQueue] = useState<Word[]>(initial);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const current = queue[0];

  const speak = useCallback(() => {
    if (!current) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(current.text);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  }, [current]);

  const answer = useCallback(
    async (known: boolean) => {
      if (!current || busy) return;
      setBusy(true);
      setError(null);
      const g = grade(current, known);
      const supabase = createClient();
      const [upd, log] = await Promise.all([
        supabase.from("words").update(g).eq("id", current.id),
        supabase.from("review_logs").insert({ word_id: current.id, known }),
      ]);
      setBusy(false);
      if (upd.error || log.error) {
        setError(upd.error?.message ?? log.error?.message ?? "No se pudo guardar. Inténtalo de nuevo.");
        return; // keep the card so nothing is lost
      }
      setDone((n) => n + 1);
      setShown(false);
      setQueue(([head, ...rest]) => (known ? rest : [...rest, { ...head, ...g }])); // missed cards come back this session
    },
    [current, busy],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!shown) setShown(true);
      } else if (shown && (e.key === "ArrowRight" || e.key === "1")) answer(true);
      else if (shown && (e.key === "ArrowLeft" || e.key === "2")) answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, answer]);

  if (!current) {
    return (
      <>
        <p>🎉 ¡Listo por ahora! Repasaste {done} {done === 1 ? "tarjeta" : "tarjetas"}.</p>
        <p><Link className="btn primary" href="/">Volver al panel</Link></p>
      </>
    );
  }

  const d = current.definition;
  return (
    <>
      <p className="muted">{queue.length} por repasar</p>
      <div className="card">
        <div className="front">{current.text}</div>
        {shown && (
          <>
            <div className="back">{current.translation}</div>
            {d && <div className="def">{[[d.phonetic, d.pos].filter(Boolean).join(" · "), d.meaning].filter(Boolean).join("\n")}</div>}
            {current.context && <div className="ctx"><Highlighted text={current.context} word={current.text} /></div>}
          </>
        )}
      </div>
      {error && <div className="notice err">{error}</div>}
      <div className="actions">
        <button className="btn" onClick={speak} title="Escuchar">🔊</button>
        {!shown ? (
          <button className="btn primary" onClick={() => setShown(true)}>Mostrar traducción</button>
        ) : (
          <>
            <button className="btn bad" disabled={busy} onClick={() => answer(false)}>Otra vez</button>
            <button className="btn good" disabled={busy} onClick={() => answer(true)}>Lo sabía</button>
          </>
        )}
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>Atajos: Espacio muestra · → lo sabía · ← otra vez</p>
    </>
  );
}
