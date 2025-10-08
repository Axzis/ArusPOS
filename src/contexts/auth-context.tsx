
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
    User, 
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import { getBusinessId } from '@/lib/firestore';
import { isSuperAdminUser } from '@/lib/config';
import { useFirebase } from '@/firebase/provider';


export type AppUser = User & {
    role?: string;
    photoURL?: string;
    displayName?: string;
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean; // This now represents the combined loading state of user and business ID
    businessId: string | null;
    login: (email: string, password: string) => Promise<User | null>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { auth, db, user: authUser, isUserLoading, userError } = useFirebase();
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [isBusinessInfoLoading, setIsBusinessInfoLoading] = useState(true);
    const [authProviderReady, setAuthProviderReady] = useState(false);

    const fetchBusinessInfo = useCallback(async (user: User | null) => {
        if (!user) {
            setAppUser(null);
            setBusinessId(null);
            setIsBusinessInfoLoading(false);
            return;
        }

        setIsBusinessInfoLoading(true);
        try {
            if (user.email && isSuperAdminUser(user.email)) {
                setAppUser({
                    ...user,
                    role: 'Super Admin',
                    displayName: 'Super Admin',
                });
                setBusinessId(null);
            } else {
                const { businessId: bId, userData } = await getBusinessId(db, user);
                setBusinessId(bId);
                const mergedUser: AppUser = {
                    ...user,
                    role: userData?.role,
                    displayName: userData?.name || user.displayName,
                    photoURL: userData?.photoURL || user.photoURL,
                };
                setAppUser(mergedUser);
            }
        } catch (error) {
            console.error("Error fetching business info:", error);
            setAppUser(user); // Fallback to auth user
            setBusinessId(null);
        } finally {
            setIsBusinessInfoLoading(false);
        }
    }, [db]);

    useEffect(() => {
        // This effect runs when the user state from useFirebase changes.
        if (!isUserLoading) {
            fetchBusinessInfo(authUser);
            setAuthProviderReady(true);
        }
    }, [authUser, isUserLoading, fetchBusinessInfo]);


    const refreshUser = useCallback(async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            fetchBusinessInfo(auth.currentUser);
        }
    }, [auth, fetchBusinessInfo]);

    const login = async (email: string, password: string): Promise<User | null> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    };

    const logout = async () => {
        await signOut(auth);
        setAppUser(null);
        setBusinessId(null);
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
    
    const loading = !authProviderReady || isUserLoading || isBusinessInfoLoading;

    const value = { user: appUser, loading, businessId, login, logout, sendPasswordReset, updateUserPassword, refreshUser };

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
    // Add db and auth to the hook for convenience in components
    const { db, auth } = useFirebase();
    return { ...context, db, auth };
}
