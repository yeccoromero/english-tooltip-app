import { LibraryClient } from "@/components/LibraryClient";
import { createClient } from "@/lib/supabase/server";
import type { Word } from "@/lib/types";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("words")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return <p className="notice err">No se pudieron cargar las palabras: {error.message}</p>;
  return (
    <>
      <h1>Biblioteca</h1>
      <LibraryClient initial={(data ?? []) as Word[]} />
    </>
  );
}
