
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { BusinessProvider } from '@/contexts/business-context';
import AppShell from '@/components/app-shell';
import { initializeFirebase } from '@/lib/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// This component ensures that Firebase is initialized only on the client side.
// It acts as the main wrapper in the root layout.
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures this is only called once on the client.
  useMemo(() => {
    initializeFirebase();
  }, []);

  return (
    <AuthProvider>
      <BusinessProvider>
        <AppShell>{children}</AppShell>
      </BusinessProvider>
    </AuthProvider>
  );
}
