
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, AuthError } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Logo } from '@/components/icons';

// Extend the User type to include our custom role
export type AppUser = User & {
    role?: string;
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserPassword: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                // User is signed in, let's get their custom role from Firestore.
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("uid", "==", userAuth.uid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0].data();
                    setUser({
                        ...userAuth,
                        role: userDoc.role, // Add role to the user object
                    });
                } else {
                    // No user document found, but they are authenticated.
                    // This could be a superadmin or an edge case.
                    // For now, treat them as a user without a specific role.
                    setUser(userAuth);
                }
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
    }
    
    const updateUserPassword = async (newPassword: string) => {
        if (!auth.currentUser) {
            throw new Error("No user is currently signed in.");
        }
        try {
            await updatePassword(auth.currentUser, newPassword);
            // After a successful password update, it's good practice
            // to sign the user out for security reasons.
            await logout();
        } catch (error) {
            // Re-throw the error to be handled by the calling component
            throw error;
        }
    };


    const value = { user, loading, login, logout, sendPasswordReset, updateUserPassword };

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
