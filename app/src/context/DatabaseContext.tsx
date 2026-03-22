import React, { createContext, useContext } from 'react';
import { SQLiteDatabase } from 'expo-sqlite';

interface DatabaseContextValue {
  sutianDb: SQLiteDatabase;
  questionsDb: SQLiteDatabase;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({
  sutianDb,
  questionsDb,
  children,
}: DatabaseContextValue & { children: React.ReactNode }) {
  return (
    <DatabaseContext.Provider value={{ sutianDb, questionsDb }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabases(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabases must be used inside DatabaseProvider');
  return ctx;
}
