export interface Definition {
  phonetic?: string;
  pos?: string;
  meaning: string;
  example?: string;
}

/** A row of public.words. */
export interface Word {
  id: string;
  text: string;
  translation: string;
  source_lang: string | null;
  context: string | null;
  url: string | null;
  definition: Definition | null;
  box: number;
  due: string; // ISO timestamp
  reps: number;
  lapses: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
