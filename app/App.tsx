import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import FlashcardScreen from './src/screens/FlashcardScreen';

function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#c0392b" />
    </View>
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
          <FlashcardScreen />
        </Suspense>
      </SQLiteProvider>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdf6ec',
  },
});
