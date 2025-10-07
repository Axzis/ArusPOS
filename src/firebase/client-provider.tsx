
'use client';

import React, { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { BusinessProvider } from '@/contexts/business-context';
import AppShell from '@/components/app-shell';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// This component ensures that Firebase is initialized only on the client side.
// It acts as the main wrapper in the root layout.
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The actual initialization is now inside AuthProvider,
  // which is guaranteed to be a client component.
  return (
    <AuthProvider>
      <BusinessProvider>
        <AppShell>{children}</AppShell>
      </BusinessProvider>
    </AuthProvider>
  );
}
