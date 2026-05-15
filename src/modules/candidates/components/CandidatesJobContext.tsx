'use client';

import { createContext, useContext } from 'react';

interface CandidatesJobContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addStageSignal: number;
}

export const CandidatesJobContext = createContext<CandidatesJobContextValue | null>(null);

export function useCandidatesJobContext() {
  const ctx = useContext(CandidatesJobContext);
  if (!ctx) {
    throw new Error('useCandidatesJobContext must be used within a CandidatesJobProvider');
  }
  return ctx;
}
