import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDatabases } from '../context/DatabaseContext';
import {
  fetchRandomFlashcard,
  FlashcardFilter,
  FlashcardRow,
} from '../db/sutian';
import {
  getEntryTypeSettings,
  getOrderedVocabSetEntries,
  getUserSetting,
  OrderedVocabSetEntry,
} from '../db/questions';

interface ResolvedFilter {
  filter: FlashcardFilter;
  filterLabel: string;
  studyMode: string;
  orderedEntries: OrderedVocabSetEntry[];
}

export default function FlashcardScreen() {
  const { sutianDb, questionsDb } = useDatabases();

  const [card, setCard] = useState<FlashcardRow | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState('');
  const [studyModeLabel, setStudyModeLabel] = useState('');
  const lastSequentialEntryIdRef = useRef<number | null>(null);
  const sequenceKeyRef = useRef<string>('');

  const buildFilter = useCallback(async (): Promise<ResolvedFilter> => {
    const [etSettings, activeSetCode, savedStudyMode] = await Promise.all([
      getEntryTypeSettings(questionsDb),
      getUserSetting(questionsDb, 'active_vocab_set', 'all'),
      getUserSetting(questionsDb, 'study_mode', 'random'),
    ]);

    const allowedEntryTypes = new Set(
      etSettings.filter(s => s.enabled === 1).map(s => s.entry_type)
    );

    if (activeSetCode !== 'all') {
      const orderedEntries = await getOrderedVocabSetEntries(questionsDb, activeSetCode);
      return {
        filter: { allowedEntryTypes },
        filterLabel: activeSetCode === '700-chars' ? '700字表' : activeSetCode,
        studyMode: savedStudyMode === 'sequential' ? 'sequential' : 'random',
        orderedEntries,
      };
    }

    return {
      filter: { allowedEntryTypes },
      filterLabel: '全部詞目',
      studyMode: 'random',
      orderedEntries: [],
    };
  }, [questionsDb]);

  const pickNextSequentialEntryId = useCallback((
    orderedEntries: OrderedVocabSetEntry[],
    currentEntryId: number | null,
    offset = 1,
  ): number | null => {
    if (orderedEntries.length === 0) return null;

    if (currentEntryId === null) {
      return orderedEntries[0].entry_id;
    }

    const currentIndex = orderedEntries.findIndex(entry => entry.entry_id === currentEntryId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + offset) % orderedEntries.length : 0;
    return orderedEntries[nextIndex]?.entry_id ?? null;
  }, []);

  const loadCard = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    setError(null);
    try {
      const resolved = await buildFilter();
      setFilterLabel(resolved.filterLabel);
      setStudyModeLabel(resolved.studyMode === 'sequential' ? '依詞表順序' : '隨機');

      const sequenceKey = `${resolved.filterLabel}:${resolved.studyMode}`;
      if (sequenceKeyRef.current !== sequenceKey) {
        lastSequentialEntryIdRef.current = null;
        sequenceKeyRef.current = sequenceKey;
      }

      let row: FlashcardRow | null;
      if (resolved.studyMode === 'sequential' && resolved.orderedEntries.length > 0) {
        row = null;

        for (let offset = 0; offset < resolved.orderedEntries.length; offset += 1) {
          const nextEntryId = pickNextSequentialEntryId(
            resolved.orderedEntries,
            lastSequentialEntryIdRef.current,
            offset + 1,
          );
          if (nextEntryId === null) continue;

          row = await fetchRandomFlashcard(sutianDb, { ...resolved.filter, entryId: nextEntryId });
          if (row) {
            lastSequentialEntryIdRef.current = row.entry_id;
            break;
          }
        }
      } else {
        row = await fetchRandomFlashcard(sutianDb, resolved.filter);
        lastSequentialEntryIdRef.current = null;
      }

      setCard(row);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [sutianDb, buildFilter, pickNextSequentialEntryId]);

  useEffect(() => { loadCard(); }, [loadCard]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c0392b" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>找無詞目，請調整設定。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{filterLabel}</Text>
      <Text style={styles.subLabel}>{studyModeLabel}</Text>

      <Pressable style={styles.card} onPress={() => setRevealed(r => !r)}>
        <Text style={styles.headword}>{card.headword_display}</Text>

        {revealed ? (
          <View style={styles.backContent}>
            <Text style={styles.romanization}>{card.romanization}</Text>
            <View style={styles.divider} />
            <Text style={styles.definition}>{card.definition}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>點一下顯示台羅與釋義</Text>
        )}
      </Pressable>

      <Pressable style={styles.nextButton} onPress={loadCard}>
        <Text style={styles.nextButtonText}>下一張 →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf6ec',
  },
  container: {
    flex: 1, backgroundColor: '#fdf6ec',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, gap: 24,
  },
  label: {
    fontSize: 13, color: '#999', letterSpacing: 2, textTransform: 'uppercase',
  },
  subLabel: {
    fontSize: 12, color: '#c0392b', fontWeight: '600',
  },
  card: {
    width: '100%', minHeight: 280,
    backgroundColor: '#fff', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, paddingHorizontal: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    gap: 16,
  },
  headword: {
    fontSize: 64, fontWeight: '700', color: '#1a1a1a', textAlign: 'center',
  },
  hint: { fontSize: 14, color: '#ccc', marginTop: 8 },
  backContent: { alignItems: 'center', gap: 12, width: '100%' },
  romanization: {
    fontSize: 24, color: '#c0392b', fontStyle: 'italic', textAlign: 'center',
  },
  divider: { width: '40%', height: 1, backgroundColor: '#eee' },
  definition: {
    fontSize: 18, color: '#444', textAlign: 'center', lineHeight: 28,
  },
  nextButton: {
    backgroundColor: '#c0392b', paddingVertical: 14,
    paddingHorizontal: 40, borderRadius: 50,
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 16, color: '#888' },
});
