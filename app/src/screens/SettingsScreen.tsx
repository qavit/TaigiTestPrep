import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  EntryTypeSetting,
  VocabSet,
  getEntryTypeSettings,
  getVocabSets,
  getUserSetting,
  setEntryTypeEnabled,
  setUserSetting,
} from '../db/questions';
import { useDatabases } from '../context/DatabaseContext';

// Human-readable labels for entry types
const ENTRY_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  主詞目: { label: '主詞目', description: '完整詞目，含漢字、台羅、釋義' },
  臺華共同詞: { label: '臺華共同詞', description: '台華形音義相同的詞，如「電腦」' },
  附錄: { label: '附錄', description: '地名、捷運站、俗諺、親屬稱謂等附錄詞目' },
  單字不成詞者: { label: '單字不成詞', description: '單獨不成詞，須與其他字組合使用' },
  近反義詞不單列詞目者: { label: '近反義詞', description: '在近反義詞條目中列出，不單獨列目' },
};

export default function SettingsScreen() {
  const { questionsDb } = useDatabases();

  const [vocabSets, setVocabSets] = useState<VocabSet[]>([]);
  const [activeSetCode, setActiveSetCode] = useState<string>('all');
  const [studyMode, setStudyMode] = useState<string>('random');
  const [entryTypeSettings, setEntryTypeSettings] = useState<EntryTypeSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [sets, etSettings, savedSetCode, savedStudyMode] = await Promise.all([
      getVocabSets(questionsDb),
      getEntryTypeSettings(questionsDb),
      getUserSetting(questionsDb, 'active_vocab_set', 'all'),
      getUserSetting(questionsDb, 'study_mode', 'random'),
    ]);
    setVocabSets(sets);
    setEntryTypeSettings(etSettings);
    setActiveSetCode(savedSetCode);
    setStudyMode(savedStudyMode);
    setLoading(false);
  }, [questionsDb]);

  useEffect(() => { load(); }, [load]);

  const handleSetCode = useCallback(async (code: string) => {
    setActiveSetCode(code);
    await setUserSetting(questionsDb, 'active_vocab_set', code);
    if (code === 'all' && studyMode === 'sequential') {
      setStudyMode('random');
      await setUserSetting(questionsDb, 'study_mode', 'random');
    }
  }, [questionsDb, studyMode]);

  const handleEntryTypeToggle = useCallback(async (entryType: string, enabled: boolean) => {
    setEntryTypeSettings(prev =>
      prev.map(s => s.entry_type === entryType ? { ...s, enabled: enabled ? 1 : 0 } : s)
    );
    await setEntryTypeEnabled(questionsDb, entryType, enabled);
  }, [questionsDb]);

  const handleStudyMode = useCallback(async (mode: string) => {
    setStudyMode(mode);
    await setUserSetting(questionsDb, 'study_mode', mode);
  }, [questionsDb]);

  const sequentialAvailable = activeSetCode !== 'all';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c0392b" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* Vocab scope */}
      <Text style={styles.sectionHeader}>詞彙範圍</Text>
      <View style={styles.card}>
        <Pressable onPress={() => handleSetCode('all')}>
          <VocabSetOption
            label="全部詞目"
            description="依下方詞目類型設定顯示"
            active={activeSetCode === 'all'}
          />
        </Pressable>
        {vocabSets.map(vs => (
          <Pressable key={vs.set_code} onPress={() => handleSetCode(vs.set_code)}>
            <VocabSetOption
              label={vs.label}
              description={vs.description ?? ''}
              active={activeSetCode === vs.set_code}
            />
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionHeader}>出題模式</Text>
      <Text style={styles.sectionNote}>
        順序模式會依目前詞彙集的詞表順序往下走；全部詞目僅支援隨機。
      </Text>
      <View style={styles.card}>
        <Pressable onPress={() => handleStudyMode('random')}>
          <VocabSetOption
            label="隨機"
            description="每次抽一張符合條件的詞卡"
            active={studyMode === 'random'}
          />
        </Pressable>
        <Pressable
          onPress={() => sequentialAvailable && handleStudyMode('sequential')}
          disabled={!sequentialAvailable}
        >
          <VocabSetOption
            label="依詞表順序"
            description={sequentialAvailable ? '依目前詞彙集的排序逐張前進' : '請先選擇特定詞彙集'}
            active={studyMode === 'sequential'}
            disabled={!sequentialAvailable}
          />
        </Pressable>
      </View>

      {/* Entry type toggles */}
      <Text style={styles.sectionHeader}>詞目類型</Text>
      <Text style={styles.sectionNote}>
        選擇「全部詞目」時有效。選擇特定詞彙集時，以詞彙集為準。
      </Text>
      <View style={styles.card}>
        {entryTypeSettings.map((s, i) => {
          const meta = ENTRY_TYPE_LABELS[s.entry_type];
          return (
            <EntryTypeRow
              key={s.entry_type}
              label={meta?.label ?? s.entry_type}
              description={meta?.description ?? ''}
              enabled={s.enabled === 1}
              onToggle={v => handleEntryTypeToggle(s.entry_type, v)}
              showDivider={i < entryTypeSettings.length - 1}
            />
          );
        })}
      </View>

    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VocabSetOption({
  label, description, active, disabled = false,
}: {
  label: string; description: string; active: boolean; disabled?: boolean;
}) {
  return (
    <View style={[styles.row, active && styles.rowActive, disabled && styles.rowDisabled]}>
      <View style={styles.rowTexts}>
        <Text style={[styles.rowLabel, active && styles.rowLabelActive, disabled && styles.rowLabelDisabled]}>
          {label}
        </Text>
        {description ? <Text style={[styles.rowDesc, disabled && styles.rowDescDisabled]}>{description}</Text> : null}
      </View>
      <View style={[styles.radioOuter, active && styles.radioOuterActive, disabled && styles.radioOuterDisabled]}>
        {active && <View style={styles.radioInner} />}
      </View>
    </View>
  );
}

function EntryTypeRow({
  label, description, enabled, onToggle, showDivider,
}: {
  label: string; description: string; enabled: boolean;
  onToggle: (v: boolean) => void; showDivider: boolean;
}) {
  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowTexts}>
          <Text style={styles.rowLabel}>{label}</Text>
          {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: '#ddd', true: '#f5b7b1' }}
          thumbColor={enabled ? '#c0392b' : '#fff'}
        />
      </View>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f0' },
  scroll: { flex: 1, backgroundColor: '#f5f5f0' },
  content: { paddingVertical: 24, paddingHorizontal: 16, gap: 6 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionNote: {
    fontSize: 12,
    color: '#aaa',
    paddingHorizontal: 4,
    marginBottom: 6,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowActive: {
    backgroundColor: '#fdf6ec',
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowTexts: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#222', fontWeight: '500' },
  rowLabelActive: { color: '#c0392b' },
  rowLabelDisabled: { color: '#777' },
  rowDesc: { fontSize: 12, color: '#999', marginTop: 2, lineHeight: 17 },
  rowDescDisabled: { color: '#aaa' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ccc',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#c0392b' },
  radioOuterDisabled: { borderColor: '#ddd' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c0392b' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 16 },
});
