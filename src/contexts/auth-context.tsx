
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { initializeFirebase } from '@/lib/firebase';
import { getBusinessId, updateUserProfile as updateUserProfileInDb } from '@/lib/firestore';
import { Logo } from '@/components/icons';
import { isSuperAdminUser } from '@/lib/config';

export type AppUser = User & {
    role?: string;
    photoURL?: string;
    displayName?: string;
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean;
    businessId: string | null;
    login: (email: string, password: string) => Promise<User | null>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const { auth } = initializeFirebase();

    const fetchBusinessInfo = useCallback(async (userAuth: User) => {
        try {
            // Check for superadmin first
            if (userAuth.email && isSuperAdminUser(userAuth.email)) {
                setUser({
                    ...userAuth,
                    role: 'Super Admin',
                    displayName: 'Super Admin',
                });
                setBusinessId(null);
                return;
            }

            const { businessId: bId, userData } = await getBusinessId(userAuth);
            
            if (bId) {
                setBusinessId(bId);
                setUser({
                    ...userAuth,
                    role: userData?.role,
                    photoURL: userData?.photoURL || userAuth.photoURL,
                    displayName: userData?.name || userAuth.displayName,
                });
            } else {
                 console.warn(`User with UID ${userAuth.uid} is not associated with any business. This might be a superadmin or an unassigned user.`);
                 // Do not log out, allow redirection to select-branch or superadmin page
            }
        } catch (error) {
            console.error("Error fetching business info:", error);
            // Do not log out automatically, let the UI handle it.
        }
    }, []);

     const refreshUser = useCallback(async () => {
        const currentUserAuth = auth.currentUser;
        if (currentUserAuth) {
            await currentUserAuth.reload();
            const refreshedUserAuth = auth.currentUser;
            if (refreshedUserAuth) {
                await fetchBusinessInfo(refreshedUserAuth);
            }
        }
    }, [auth, fetchBusinessInfo]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            setLoading(true);
            if (userAuth) {
                await fetchBusinessInfo(userAuth);
            } else {
                setUser(null);
                setBusinessId(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth, fetchBusinessInfo]);


    const login = async (email: string, password: string): Promise<User | null> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // The onAuthStateChanged listener will handle setting the global user state.
        return userCredential.user;
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
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);
    };


    const value = { user, loading, businessId, login, logout, sendPasswordReset, updateUserPassword, refreshUser };

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
