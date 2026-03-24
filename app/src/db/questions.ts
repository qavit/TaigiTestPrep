import * as SQLite from 'expo-sqlite';
import { VOCAB_700 } from '../data/vocab700';

const DB_NAME = 'questions.db';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_VERSION = 1;

const DDL = `
  -- Schema version tracking
  CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Vocabulary sets: 700字表, future CEFR levels, custom sets, …
  CREATE TABLE IF NOT EXISTS vocab_set (
    set_id      INTEGER PRIMARY KEY,
    set_code    TEXT UNIQUE NOT NULL,
    label       TEXT NOT NULL,
    description TEXT
  );

  -- Entries in each vocab set.
  -- entry_id references sutian_core.db dictionary_entry.entry_id (cross-DB join).
  CREATE TABLE IF NOT EXISTS vocab_set_entry (
    set_id    INTEGER NOT NULL REFERENCES vocab_set(set_id),
    entry_id  INTEGER NOT NULL,
    set_order INTEGER,
    PRIMARY KEY (set_id, entry_id)
  );

  -- Per-entry-type visibility (default: appendix entries hidden).
  -- entry_type matches dictionary_entry.entry_type in sutian_core.db.
  CREATE TABLE IF NOT EXISTS entry_type_setting (
    entry_type TEXT PRIMARY KEY,
    enabled    INTEGER NOT NULL DEFAULT 1
  );

  -- Per-category visibility (category_name matches entry_category.category_name).
  CREATE TABLE IF NOT EXISTS category_setting (
    category_name TEXT PRIMARY KEY,
    enabled       INTEGER NOT NULL DEFAULT 1
  );

  -- Flashcard SRS progress per entry.
  CREATE TABLE IF NOT EXISTS flashcard_progress (
    entry_id       INTEGER PRIMARY KEY,
    review_count   INTEGER NOT NULL DEFAULT 0,
    correct_count  INTEGER NOT NULL DEFAULT 0,
    last_reviewed  TEXT,
    next_review    TEXT,
    ease_factor    REAL NOT NULL DEFAULT 2.5
  );

  -- Generic key-value settings.
  CREATE TABLE IF NOT EXISTS user_setting (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vocab_set_entry_set  ON vocab_set_entry(set_id);
  CREATE INDEX IF NOT EXISTS idx_vocab_set_entry_entry ON vocab_set_entry(entry_id);
  CREATE INDEX IF NOT EXISTS idx_flashcard_next ON flashcard_progress(next_review);
`;

// Default: hide all appendix entry types
const DEFAULT_ENTRY_TYPE_SETTINGS: { entry_type: string; enabled: 0 | 1 }[] = [
  { entry_type: '主詞目',           enabled: 1 },
  { entry_type: '臺華共同詞',        enabled: 1 },
  { entry_type: '近反義詞不單列詞目者', enabled: 0 },
  { entry_type: '單字不成詞者',      enabled: 0 },
  { entry_type: '附錄',             enabled: 0 },
];

// ---------------------------------------------------------------------------
// Open / initialise
// ---------------------------------------------------------------------------

export async function openQuestionsDb(sutianDb: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
  // expo-sqlite creates the DB automatically in the platform's writable location.
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await migrateQuestionsDb(db, sutianDb);
  return db;
}

async function migrateQuestionsDb(
  db: SQLite.SQLiteDatabase,
  sutianDb: SQLite.SQLiteDatabase,
): Promise<void> {
  // Run all DDL (IF NOT EXISTS guards make it idempotent)
  await db.execAsync(DDL);

  // Check current version
  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) AS version FROM schema_version'
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < 1) {
    await seedV1(db, sutianDb);
    await db.runAsync(
      'INSERT OR IGNORE INTO schema_version (version) VALUES (?)',
      SCHEMA_VERSION
    );
  }
}

// ---------------------------------------------------------------------------
// Seed: version 1
// ---------------------------------------------------------------------------

async function seedV1(
  db: SQLite.SQLiteDatabase,
  sutianDb: SQLite.SQLiteDatabase,
): Promise<void> {
  // 1. Entry-type defaults
  for (const s of DEFAULT_ENTRY_TYPE_SETTINGS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO entry_type_setting (entry_type, enabled) VALUES (?, ?)',
      s.entry_type, s.enabled
    );
  }

  // 2. Create 700字表 vocab set
  await db.runAsync(
    `INSERT OR IGNORE INTO vocab_set (set_code, label, description)
     VALUES ('700-chars', '700字表', '教育部臺灣台語推薦用字700字表')`,
  );
  const setRow = await db.getFirstAsync<{ set_id: number }>(
    "SELECT set_id FROM vocab_set WHERE set_code = '700-chars'"
  );
  if (!setRow) return;
  const setId = setRow.set_id;

  // 3. Match 700字表 entries against sutian_core.db by headword_display.
  //    Some hanji appear multiple times in the 700字表 (intentional — different
  //    readings). We include ALL matching dictionary entries for each hanji.
  //    Use romanization to refine the match where possible.
  let matched = 0;
  let unmatched = 0;

  for (const entry of VOCAB_700) {
    // Normalize the 700字表 hanji: strip optional-suffix markers like （仔）
    const cleanHanji = entry.hanji.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();

    // Try exact match first, then normalized match
    const rows = await sutianDb.getAllAsync<{ entry_id: number }>(
      `SELECT entry_id FROM dictionary_entry
       WHERE headword_display = ? OR headword_display = ?`,
      entry.hanji, cleanHanji
    );

    if (rows.length === 0) {
      // Fallback: match on headword_normalized (strips tones etc.)
      const normRows = await sutianDb.getAllAsync<{ entry_id: number }>(
        `SELECT entry_id FROM dictionary_entry WHERE headword_normalized = ?`,
        cleanHanji
      );
      if (normRows.length === 0) {
        unmatched++;
        console.warn(`[vocab700] No match for: ${entry.num} ${entry.hanji}`);
        continue;
      }
      rows.push(...normRows);
    }

    for (const { entry_id } of rows) {
      await db.runAsync(
        'INSERT OR IGNORE INTO vocab_set_entry (set_id, entry_id, set_order) VALUES (?, ?, ?)',
        setId, entry_id, entry.num
      );
    }
    matched++;
  }

  console.log(`[vocab700] Seeded: ${matched} matched, ${unmatched} unmatched`);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface VocabSet {
  set_id: number;
  set_code: string;
  label: string;
  description: string | null;
}

export interface EntryTypeSetting {
  entry_type: string;
  enabled: number; // 0 | 1
}

export interface OrderedVocabSetEntry {
  entry_id: number;
  set_order: number | null;
}

export async function getVocabSets(db: SQLite.SQLiteDatabase): Promise<VocabSet[]> {
  return db.getAllAsync<VocabSet>(
    'SELECT set_id, set_code, label, description FROM vocab_set ORDER BY set_id'
  );
}

export async function getEntryTypeSettings(db: SQLite.SQLiteDatabase): Promise<EntryTypeSetting[]> {
  return db.getAllAsync<EntryTypeSetting>(
    'SELECT entry_type, enabled FROM entry_type_setting ORDER BY entry_type'
  );
}

export async function getOrderedVocabSetEntries(
  db: SQLite.SQLiteDatabase,
  setCode: string,
): Promise<OrderedVocabSetEntry[]> {
  return db.getAllAsync<OrderedVocabSetEntry>(
    `SELECT vse.entry_id, vse.set_order
     FROM vocab_set_entry vse
     JOIN vocab_set vs ON vs.set_id = vse.set_id
     WHERE vs.set_code = ?
     ORDER BY vse.set_order, vse.entry_id`,
    setCode
  );
}

export async function setEntryTypeEnabled(
  db: SQLite.SQLiteDatabase,
  entryType: string,
  enabled: boolean,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO entry_type_setting (entry_type, enabled) VALUES (?, ?)',
    entryType, enabled ? 1 : 0
  );
}

export async function getUserSetting(
  db: SQLite.SQLiteDatabase,
  key: string,
  defaultValue: string,
): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM user_setting WHERE key = ?', key
  );
  return row?.value ?? defaultValue;
}

export async function setUserSetting(
  db: SQLite.SQLiteDatabase,
  key: string,
  value: string,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO user_setting (key, value) VALUES (?, ?)',
    key, value
  );
}
