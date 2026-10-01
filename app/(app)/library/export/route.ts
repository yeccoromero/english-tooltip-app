import { NextResponse } from "next/server";
import { wordsToCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("words")
    .select("text, translation, context, url")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return new NextResponse(error.message, { status: 500 });

  return new NextResponse(wordsToCsv(data ?? []), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="vocabulario.csv"',
    },
  });
}
