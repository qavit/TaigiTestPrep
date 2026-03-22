import React, { useCallback, useEffect, useState } from 'react';
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
  fetchVocabSetEntryIds,
  FlashcardFilter,
  FlashcardRow,
} from '../db/sutian';
import { getEntryTypeSettings, getUserSetting } from '../db/questions';

export default function FlashcardScreen() {
  const { sutianDb, questionsDb } = useDatabases();

  const [card, setCard] = useState<FlashcardRow | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState('');

  const buildFilter = useCallback(async (): Promise<FlashcardFilter> => {
    const [etSettings, activeSetCode] = await Promise.all([
      getEntryTypeSettings(questionsDb),
      getUserSetting(questionsDb, 'active_vocab_set', 'all'),
    ]);

    const allowedEntryTypes = new Set(
      etSettings.filter(s => s.enabled === 1).map(s => s.entry_type)
    );

    if (activeSetCode !== 'all') {
      const ids = await fetchVocabSetEntryIds(questionsDb, activeSetCode);
      setFilterLabel(activeSetCode === '700-chars' ? '700字表' : activeSetCode);
      return { allowedEntryTypes, vocabSetEntryIds: ids };
    }

    setFilterLabel('全部詞目');
    return { allowedEntryTypes };
  }, [questionsDb]);

  const loadCard = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    setError(null);
    try {
      const filter = await buildFilter();
      const row = await fetchRandomFlashcard(sutianDb, filter);
      setCard(row);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [sutianDb, buildFilter]);

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
