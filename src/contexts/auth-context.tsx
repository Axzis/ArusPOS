
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, Auth } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { getBusinessId } from '@/lib/firestore';
import { Logo } from '@/components/icons';
import { isSuperAdminUser } from '@/lib/config';
import { Firestore } from 'firebase/firestore';

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
    auth: Auth;
    db: Firestore;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const { auth, db } = initializeFirebase();

    const fetchBusinessInfo = useCallback(async (userAuth: User) => {
        if (!userAuth) {
            setUser(null);
            setBusinessId(null);
            setLoading(false);
            return;
        }

        try {
            if (userAuth.email && isSuperAdminUser(userAuth.email)) {
                setUser({
                    ...userAuth,
                    role: 'Super Admin',
                    displayName: 'Super Admin',
                });
                setBusinessId(null);
            } else {
                const { businessId: bId, userData } = await getBusinessId(db, userAuth);
                setBusinessId(bId);
                // Prioritize data from Firestore (name, photoURL) over Firebase Auth profile
                const mergedUser: AppUser = {
                    ...userAuth,
                    role: userData?.role,
                    displayName: userData?.name || userAuth.displayName,
                    photoURL: userData?.photoURL || userAuth.photoURL,
                };
                setUser(mergedUser);
            }
        } catch (error) {
            console.error("Error fetching business info:", error);
            setUser(userAuth); // Fallback to auth user object
            setBusinessId(null);
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
            setLoading(true);
            if (userAuth) {
                fetchBusinessInfo(userAuth);
            } else {
                setUser(null);
                setBusinessId(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, fetchBusinessInfo]);

    const refreshUser = useCallback(async () => {
        const currentUserAuth = auth.currentUser;
        if (currentUserAuth) {
            setLoading(true);
            await currentUserAuth.reload();
            const refreshedUserAuth = auth.currentUser;
            if (refreshedUserAuth) {
                await fetchBusinessInfo(refreshedUserAuth);
            }
            setLoading(false);
        }
    }, [auth, fetchBusinessInfo]);

    const login = async (email: string, password: string): Promise<User | null> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // After login, onAuthStateChanged will trigger fetchBusinessInfo
        return userCredential.user;
    };

    const logout = async () => {
        await signOut(auth);
        // onAuthStateChanged will handle setting user and businessId to null
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

    const value = { user, loading, businessId, login, logout, sendPasswordReset, updateUserPassword, refreshUser, auth, db };

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
