import Link from "next/link";
import { Stats } from "@/components/Stats";
import { createClient } from "@/lib/supabase/server";
import type { Word } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString();

  const [total, due, logs, recent] = await Promise.all([
    supabase.from("words").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("words").select("id", { count: "exact", head: true }).is("deleted_at", null).lte("due", nowIso),
    supabase.from("review_logs").select("reviewed_at").gte("reviewed_at", since).order("reviewed_at", { ascending: false }).limit(5000),
    supabase.from("words").select("id, text, translation").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
  ]);

  const dueCount = due.count ?? 0;
  const words = (recent.data ?? []) as Pick<Word, "id" | "text" | "translation">[];

  return (
    <>
      <h1>Panel</h1>
      <Stats logs={(logs.data ?? []).map((l) => l.reviewed_at as string)} total={total.count ?? 0} due={dueCount} />
      <p>
        <Link className="btn primary" href="/review">
          {dueCount > 0 ? `Repasar ${dueCount} ${dueCount === 1 ? "palabra" : "palabras"}` : "Nada pendiente por ahora"}
        </Link>
      </p>

      <h1 style={{ marginTop: 28, fontSize: 17 }}>Últimas guardadas</h1>
      {words.length === 0 ? (
        <p className="muted">Aún no hay palabras. Subraya algo en una página con la extensión y pulsa ☆.</p>
      ) : (
        <ul className="list">
          {words.map((w) => (
            <li key={w.id}>
              <div className="body"><div className="en">{w.text}</div><div className="es">{w.translation}</div></div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
