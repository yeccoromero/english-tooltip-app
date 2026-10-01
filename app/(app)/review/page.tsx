import Link from "next/link";
import { ReviewClient } from "@/components/ReviewClient";
import { createClient } from "@/lib/supabase/server";
import type { Word } from "@/lib/types";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("words")
    .select("*")
    .is("deleted_at", null)
    .lte("due", new Date().toISOString())
    .order("due", { ascending: true })
    .limit(100);

  if (error) return <p className="notice err">No se pudieron cargar las palabras: {error.message}</p>;
  const words = (data ?? []) as Word[];

  return (
    <>
      <h1>Repasar</h1>
      {words.length === 0 ? (
        <>
          <p className="muted">🎉 No tienes nada pendiente por ahora. Vuelve más tarde, o guarda más palabras con la extensión.</p>
          <p><Link className="btn" href="/">Volver al panel</Link></p>
        </>
      ) : (
        <ReviewClient initial={words} />
      )}
    </>
  );
}
