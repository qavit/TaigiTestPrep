import { SQLiteDatabase } from 'expo-sqlite';

export interface FlashcardRow {
  entry_id: number;
  headword_display: string;
  romanization: string;
  definition: string;
  entry_type: string;
}

export interface FlashcardFilter {
  /** If set, restrict to entries in this vocab set (from questions.db). */
  vocabSetEntryIds?: Set<number>;
  /** If set, fetch this exact entry. */
  entryId?: number;
  /**
   * entry_type values to INCLUDE. Defaults to main content types
   * (excludes 附錄, 單字不成詞者, 近反義詞不單列詞目者).
   */
  allowedEntryTypes?: Set<string>;
}

const DEFAULT_ALLOWED_TYPES = new Set(['主詞目', '臺華共同詞']);

export async function fetchRandomFlashcard(
  db: SQLiteDatabase,
  filter: FlashcardFilter = {},
): Promise<FlashcardRow | null> {
  const allowedTypes = filter.allowedEntryTypes ?? DEFAULT_ALLOWED_TYPES;

  // Build entry_type filter clause
  const typePlaceholders = [...allowedTypes].map(() => '?').join(', ');
  const typeArgs = [...allowedTypes];

  let sql: string;
  let args: (string | number)[];

  if (typeof filter.entryId === 'number') {
    sql = `
      SELECT
        e.entry_id,
        e.headword_display,
        e.primary_romanization_raw AS romanization,
        s.definition,
        e.entry_type
      FROM dictionary_entry e
      JOIN sense s ON s.entry_id = e.entry_id AND s.sort_order = 1
      WHERE e.primary_romanization_raw IS NOT NULL
        AND e.entry_type IN (${typePlaceholders})
        AND e.entry_id = ?
      LIMIT 1`;
    args = [...typeArgs, filter.entryId];
  } else if (filter.vocabSetEntryIds && filter.vocabSetEntryIds.size > 0) {
    const idPlaceholders = [...filter.vocabSetEntryIds].map(() => '?').join(', ');
    sql = `
      SELECT
        e.entry_id,
        e.headword_display,
        e.primary_romanization_raw AS romanization,
        s.definition,
        e.entry_type
      FROM dictionary_entry e
      JOIN sense s ON s.entry_id = e.entry_id AND s.sort_order = 1
      WHERE e.primary_romanization_raw IS NOT NULL
        AND e.entry_type IN (${typePlaceholders})
        AND e.entry_id IN (${idPlaceholders})
      ORDER BY RANDOM()
      LIMIT 1`;
    args = [...typeArgs, ...[...filter.vocabSetEntryIds]];
  } else {
    sql = `
      SELECT
        e.entry_id,
        e.headword_display,
        e.primary_romanization_raw AS romanization,
        s.definition,
        e.entry_type
      FROM dictionary_entry e
      JOIN sense s ON s.entry_id = e.entry_id AND s.sort_order = 1
      WHERE e.primary_romanization_raw IS NOT NULL
        AND e.entry_type IN (${typePlaceholders})
      ORDER BY RANDOM()
      LIMIT 1`;
    args = typeArgs;
  }

  const row = await db.getFirstAsync<FlashcardRow>(sql, args);
  return row ?? null;
}

export async function fetchVocabSetEntryIds(
  questionsDb: SQLiteDatabase,
  setCode: string,
): Promise<Set<number>> {
  const rows = await questionsDb.getAllAsync<{ entry_id: number }>(
    `SELECT vse.entry_id
     FROM vocab_set_entry vse
     JOIN vocab_set vs ON vs.set_id = vse.set_id
     WHERE vs.set_code = ?`,
    setCode
  );
  return new Set(rows.map(r => r.entry_id));
}
