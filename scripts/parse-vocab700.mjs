#!/usr/bin/env node
/**
 * Parses 臺灣台語推薦用字700字表.pdf (via pdftotext -layout) into JSON.
 *
 * Usage:
 *   pdftotext -layout <pdf> - | node scripts/parse-vocab700.mjs
 *   node scripts/parse-vocab700.mjs < /tmp/vocab700_layout.txt
 *
 * Output: scripts/vocab700.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const text = readFileSync('/dev/stdin', 'utf8');
const lines = text.split('\n');

const ENTRY_RE = /^(\d{3}) (.+)/;

// Matches Latin letters (including diacritics) and standard ASCII punctuation
// used in romanization: hyphens, dots, standard parentheses, slashes, digits.
// Excludes fullwidth characters (U+FF00+) which appear in Chinese hanji text.
const ROMAN_CHAR = /[a-zA-Z\u00c0-\u017e\u1e00-\u1eff(]/;

// CJK and fullwidth characters
const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u{20000}-\u{2a6df}]/u;

function splitHanjiRoman(rest) {
  // Find the position of the first "romanization start" character.
  // Roman text starts with a Latin letter or a standard (ASCII) parenthesis.
  let firstRoman = -1;
  for (let i = 0; i < rest.length; i++) {
    if (ROMAN_CHAR.test(rest[i])) {
      firstRoman = i;
      break;
    }
  }
  if (firstRoman === -1) return { hanji: rest.trim(), roman: '' };

  const hanji = rest.slice(0, firstRoman).trim();
  const afterHanji = rest.slice(firstRoman);

  // Take roman up to the first CJK character (which starts the Mandarin column).
  // The primary romanization is the first whitespace-separated token.
  let romanSection = afterHanji;
  const cjkIdx = afterHanji.search(CJK);
  if (cjkIdx !== -1) romanSection = afterHanji.slice(0, cjkIdx);

  // Primary reading: take the first token, but re-join if a token ends with a
  // Unicode combining mark (e.g. U+030D = entering-tone marker in Tai-lo).
  // pdftotext -layout sometimes inserts a space after the base char + combining
  // mark before the following consonant, splitting one syllable across tokens.
  const romanTokens = romanSection.trim().split(/\s+/);
  let roman = romanTokens[0] ?? '';
  for (let i = 1; i < romanTokens.length; i++) {
    if (/\p{M}$/u.test(roman)) {
      roman += romanTokens[i]; // re-join split syllable
    } else {
      break;
    }
  }
  roman = roman.replace(/\/$/, '').trim();

  return { hanji, roman };
}

const entries = [];

for (const line of lines) {
  const m = line.match(ENTRY_RE);
  if (!m) continue;

  const { hanji, roman } = splitHanjiRoman(m[2]);
  if (!hanji) continue;

  entries.push({ num: parseInt(m[1], 10), hanji, roman });
}

// Sanity
console.error(`Parsed ${entries.length} entries.`);
const missing = entries.filter(e => !e.roman);
if (missing.length > 0) {
  console.error(`Entries missing romanization (${missing.length}):`);
  missing.forEach(e => console.error(`  ${String(e.num).padStart(3,'0')} ${e.hanji}`));
}

const outPath = join(__dirname, 'vocab700.json');
writeFileSync(outPath, JSON.stringify(entries, null, 2), 'utf8');
console.error(`Written ${entries.length} entries to ${outPath}`);
