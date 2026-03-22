import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, useSQLiteContext, SQLiteDatabase } from 'expo-sqlite';
import { openQuestionsDb } from './src/db/questions';
import { DatabaseProvider } from './src/context/DatabaseContext';
import AppNavigator from './src/navigation/AppNavigator';

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#c0392b" />
    </View>
  );
}

// Has access to sutianDb via SQLiteProvider context.
// Opens questions.db (needs sutianDb for first-launch seeding), then renders.
function AppInner() {
  const sutianDb = useSQLiteContext();
  const [questionsDb, setQuestionsDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openQuestionsDb(sutianDb)
      .then(setQuestionsDb)
      .catch(e => setError(String(e)));
  }, [sutianDb]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!questionsDb) return <Loading />;

  return (
    <DatabaseProvider sutianDb={sutianDb} questionsDb={questionsDb}>
      <AppNavigator />
    </DatabaseProvider>
  );
}

export default function App() {
  return (
    <>
      <SQLiteProvider
        databaseName="sutian_core.db"
        assetSource={{ assetId: require('./assets/sutian_core.db') }}
        useSuspense
      >
        <Suspense fallback={<Loading />}>
          <AppInner />
        </Suspense>
      </SQLiteProvider>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf6ec',
  },
  error: { color: 'red', padding: 24 },
});
