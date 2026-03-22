import { SQLiteDatabase } from 'expo-sqlite';

export interface FlashcardRow {
  entry_id: number;
  headword_display: string;
  romanization: string;
  definition: string;
}

export async function fetchRandomFlashcard(db: SQLiteDatabase): Promise<FlashcardRow | null> {
  const row = await db.getFirstAsync<FlashcardRow>(
    `SELECT
       e.entry_id,
       e.headword_display,
       e.primary_romanization_raw AS romanization,
       s.definition
     FROM dictionary_entry e
     JOIN sense s ON s.entry_id = e.entry_id AND s.sort_order = 1
     WHERE e.primary_romanization_raw IS NOT NULL
     ORDER BY RANDOM()
     LIMIT 1`
  );
  return row ?? null;
}
