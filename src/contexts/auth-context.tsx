
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, AuthError } from 'firebase/auth';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { Logo } from '@/components/icons';

// Extend the User type to include our custom role and photoURL from Firestore
export type AppUser = User & {
    role?: string;
    photoURL?: string; // Allow overriding from Firestore
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getUserData(userAuth: User): Promise<DocumentData | null> {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uid", "==", userAuth.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
    }
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        const currentUserAuth = auth.currentUser;
        if (currentUserAuth) {
             const userDoc = await getUserData(currentUserAuth);
             setUser({
                ...currentUserAuth,
                role: userDoc?.role,
                photoURL: userDoc?.photoURL || currentUserAuth.photoURL,
            });
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                // User is signed in, let's get their custom data from Firestore.
                const userDoc = await getUserData(userAuth);
                setUser({
                    ...userAuth,
                    role: userDoc?.role,
                    photoURL: userDoc?.photoURL || userAuth.photoURL, // Prefer Firestore URL
                });
            } else {
                // User is signed out
                setUser(null);
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            // Re-throw the error so the calling component can handle it
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const sendPasswordReset = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const updateUserPassword = async (currentPass: string, newPass: string) => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            throw new Error("No user is currently signed in.");
        }

        const credential = EmailAuthProvider.credential(user.email, currentPass);
        
        try {
            // Re-authenticate user to confirm their identity
            await reauthenticateWithCredential(user, credential);
            // If re-authentication is successful, update the password
            await updatePassword(user, newPass);
        } catch (error) {
            // Re-throw the error to be handled by the UI
            throw error;
        }
    };


    const value = { user, loading, login, logout, sendPasswordReset, updateUserPassword, refreshUser };

    // While checking user state, show a loader
    if (loading) {
         return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Logo className="size-10 text-primary animate-pulse" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
