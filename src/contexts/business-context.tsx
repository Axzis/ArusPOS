"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBusinessWithBranches } from '@/lib/firestore';
import { useAuth } from './auth-context';

type Business = {
    currency: string;
    units: string[];
    paperSize: 'A4' | '8cm' | '5.8cm';
    taxEnabled: boolean;
    taxRate: number;
}

type BusinessContextType = Business & {
  loading: boolean;
  updateBusinessSettings: (settings: Partial<Business>) => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// THIS CONTEXT IS DEPRECATED AND WILL BE REMOVED
// All business logic is now handled in AuthContext
export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const { 
        currency, 
        units, 
        paperSize, 
        taxEnabled,
        taxRate,
        loading, 
        updateBusinessSettings 
    } = useAuth();
  
  const value = {
    currency,
    units,
    paperSize,
    taxEnabled,
    taxRate,
    loading,
    updateBusinessSettings,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
