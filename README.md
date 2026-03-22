# TaigiTestPrep

A flashcard and test-prep app for the Taiwan Ministry of Education **Taiwanese Language Proficiency Certification** (臺灣台語能力認證). Built for serious exam takers who want efficient, science-based vocabulary practice.

**Platforms:** Web · iOS · Android (single codebase via Expo)

---

## Features

- **Flashcards** — Browse the full MOE Taiwanese dictionary (29,000+ entries), filtered by vocabulary set or entry type
- **700-character set** — Built-in support for the [MOE's 700 recommended characters](https://language.moe.gov.tw) as a focused study deck
- **Spaced repetition** *(in development)* — SM-2 algorithm with Ebbinghaus forgetting curve scheduling; tracks 形 (character), 音 (pronunciation), and 義 (meaning) independently
- **Settings** — Toggle entry types (main entries, Taiwan-Mandarin shared vocabulary, appendix), choose vocabulary scope

---

## Tech Stack

| | |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 55 (React Native + web) |
| Language | TypeScript |
| Database | SQLite via `expo-sqlite` |
| Navigation | React Navigation (bottom tabs) |

---

## Data Sources

This app consumes two SQLite databases that are **not included in the repository**:

### `sutian_core.db`
Derived from the MOE *Dictionary of Frequently-Used Taiwan Minnan* (臺灣台語常用詞辭典). Built by the companion pipeline project [kautian](https://github.com/...) — do not modify directly.

Key tables: `dictionary_entry`, `entry_form`, `sense`, `example`, `entry_category`, `reading_variant`.

### `questions.db`
Created fresh on first app launch. Stores:
- Vocabulary set membership (700-character set; CEFR levels planned)
- User settings (active vocab scope, entry-type toggles)
- SRS card state and review history *(in development)*

---

## Project Structure

```
TaigiTestPrep/
├── app/                        Expo app
│   ├── App.tsx                 Root: DB initialisation + navigation
│   ├── assets/                 Icons, splash; sutian_core.db (gitignored)
│   └── src/
│       ├── context/            DatabaseContext (sutianDb + questionsDb)
│       ├── data/               Static seed data (vocab700.ts)
│       ├── db/                 DB helpers (sutian.ts, questions.ts)
│       ├── navigation/         AppNavigator (bottom tabs)
│       └── screens/            FlashcardScreen, SettingsScreen
└── scripts/                    Build-time tools
    ├── parse-vocab700.mjs      Parses the MOE 700-char PDF (pdftotext -layout)
    └── vocab700.json           Parser output (committed for reproducibility)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- `sutian_core.db` — copy from the [kautian](https://github.com/...) project output

### Setup

```bash
# Clone
git clone <repo>
cd TaigiTestPrep

# Copy the dictionary database
cp /path/to/kautian/output/sutian_core.db sutian_core.db
cp sutian_core.db app/assets/sutian_core.db

# Install dependencies
cd app && npm install

# Run (web)
npx expo start --web

# Run on device (requires Expo Go)
npx expo start
```

On first launch, `questions.db` is created and seeded automatically (vocabulary set matching takes ~10 seconds on first run).

---

## Vocabulary Classification

Entry types in `sutian_core.db`:

| entry_type | Description | Default in flashcards |
|---|---|---|
| 主詞目 | Main headwords with full definitions | ✓ |
| 臺華共同詞 | Words shared with Mandarin | ✓ |
| 附錄 | Appendix entries (place names, proverbs, transit stations, etc.) | ✗ |
| 單字不成詞者 | Characters that don't stand alone as words | ✗ |
| 近反義詞不單列詞目者 | Near/antonyms listed under another entry | ✗ |

All toggleable in the Settings screen.

---

## Spaced Repetition (Planned)

The SRS system tracks **form (形), pronunciation (音), and meaning (義)** as separate memory dimensions per vocabulary entry. Each `(entry_id, card_type)` pair is scheduled independently using the SM-2 algorithm, with a planned upgrade path to FSRS 4.5.

Review history is preserved in full for future algorithm improvement and personal analytics.

---

## Related Projects

- **[kautian](https://github.com/...)** — Data pipeline that produces `sutian_core.db` from the MOE dictionary source

---

## License

TBD
