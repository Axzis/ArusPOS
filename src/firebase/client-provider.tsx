
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { BusinessProvider } from '@/contexts/business-context';
import AppShell from '@/components/app-shell';
import { initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Logo } from '@/components/icons';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// This component ensures that Firebase is initialized only on the client side.
// It acts as the main wrapper in the root layout.
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // Initialize Firebase only on the client
      const { app, auth, db } = initializeFirebase();
      setInstances({ app, auth, db });
    } catch (e: any) {
        console.error("Fatal Firebase Initialization Error:", e);
        setError(e);
    }
  }, []);

  if (error) {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
              <div className="rounded-lg border bg-card p-8 shadow-sm">
                  <h1 className="text-2xl font-bold text-destructive">Application Error</h1>
                  <p className="mt-2 text-muted-foreground">Could not initialize Firebase.</p>
                  <p className="mt-4 text-xs text-destructive-foreground bg-destructive/80 p-2 rounded-md">{error.message}</p>
              </div>
          </div>
      )
  }

  if (!instances) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Logo className="size-10 animate-pulse text-primary" />
        </div>
    );
  }

  // Once initialized, provide the instances to the rest of the app.
  return (
    <FirebaseProvider firebaseApp={instances.app} firestore={instances.db} auth={instances.auth}>
        <AuthProvider>
            <BusinessProvider>
                <AppShell>{children}</AppShell>
            </BusinessProvider>
        </AuthProvider>
    </FirebaseProvider>
  );
}
