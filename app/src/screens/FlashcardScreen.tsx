import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SQLiteDatabase } from 'expo-sqlite';
import { fetchRandomFlashcard, FlashcardRow } from '../db/sutian';

interface Props {
  sutianDb: SQLiteDatabase;
  questionsDb: SQLiteDatabase;
}

export default function FlashcardScreen({ sutianDb }: Props) {
  const db = sutianDb;
  const [card, setCard] = useState<FlashcardRow | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load first card on mount
  React.useEffect(() => { loadCard(); }, []);

  const loadCard = useCallback(async () => {
    setLoading(true);
    setRevealed(false);
    setError(null);
    try {
      const row = await fetchRandomFlashcard(db);
      setCard(row);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [db]);

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
        <Text style={styles.errorText}>無法讀取詞典資料。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>台語詞彙複習</Text>

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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdf6ec',
  },
  container: {
    flex: 1,
    backgroundColor: '#fdf6ec',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  label: {
    fontSize: 13,
    color: '#999',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    minHeight: 280,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 16,
  },
  headword: {
    fontSize: 64,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  backContent: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  romanization: {
    fontSize: 24,
    color: '#c0392b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  divider: {
    width: '40%',
    height: 1,
    backgroundColor: '#eee',
  },
  definition: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 28,
  },
  nextButton: {
    backgroundColor: '#c0392b',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 50,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#888',
  },
});
