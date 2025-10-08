"use client";
import React, { useState, useEffect } from 'react';
import { initializeFirebase } from '@/firebase';
import { Logo } from '@/components/icons';

// This component acts as a gatekeeper. It ensures that Firebase is initialized
// on the client before any of the child components (including AuthProvider and the app itself)
// are rendered.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  useEffect(() => {
    // We only want to run this once.
    if (!isFirebaseInitialized) {
      try {
        initializeFirebase();
        setIsFirebaseInitialized(true);
      } catch (error) {
        console.error("Firebase initialization failed in provider:", error);
        // Handle failure, maybe show an error message
      }
    }
  }, [isFirebaseInitialized]);

  // While Firebase is initializing, show a loading screen.
  // This prevents any child components from trying to use Firebase before it's ready.
  if (!isFirebaseInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Logo className="size-10 animate-pulse text-primary" />
      </div>
    );
  }

  // Once initialized, render the actual application.
  return <>{children}</>;
}
