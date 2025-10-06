
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, DocumentData, limit, collectionGroup } from 'firebase/firestore';
import { Logo } from '@/components/icons';
import { isSuperAdminUser } from '@/lib/config';
import { initializeFirebase } from '@/lib/firebase';

const BUSINESSES_COLLECTION = 'businesses';
const USERS_COLLECTION = 'users';

export type AppUser = User & {
    role?: string;
    photoURL?: string;
    displayName?: string;
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean;
    businessId: string | null;
    login: (email: string, password: string) => Promise<AppUser | null>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getUserData(userAuth: User): Promise<DocumentData | null> {
    const { db } = initializeFirebase();
    // Use a collectionGroup query to find the user document across all businesses.
    const usersQuery = query(collectionGroup(db, USERS_COLLECTION), where("uid", "==", userAuth.uid), limit(1));
    const userSnapshot = await getDocs(usersQuery);

    if (!userSnapshot.empty) {
        return userSnapshot.docs[0].data();
    }
    
    console.warn(`No user document found for UID: ${userAuth.uid} in any business.`);
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { auth } = initializeFirebase();

    const refreshUser = useCallback(async () => {
        const currentUserAuth = auth.currentUser;
        if (currentUserAuth) {
            await currentUserAuth.reload();
            const refreshedUserAuth = auth.currentUser;
            if (refreshedUserAuth) {
                 if (refreshedUserAuth.email && isSuperAdminUser(refreshedUserAuth.email)) {
                    setUser({
                        ...refreshedUserAuth,
                        role: 'Super Admin',
                        displayName: 'Super Admin',
                    });
                    setBusinessId(null);
                } else {
                    const userDoc = await getUserData(refreshedUserAuth);
                    setUser({
                        ...refreshedUserAuth,
                        role: userDoc?.role,
                        photoURL: userDoc?.photoURL || refreshedUserAuth.photoURL,
                        displayName: userDoc?.name || refreshedUserAuth.displayName,
                    });
                    setBusinessId(userDoc?.businessId || null);
                }
            }
        }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            setLoading(true);
            if (userAuth) {
                if (userAuth.email && isSuperAdminUser(userAuth.email)) {
                    setUser({
                        ...userAuth,
                        role: 'Super Admin',
                        displayName: 'Super Admin',
                    });
                    setBusinessId(null); // Superadmin has no businessId
                } else {
                    const userDoc = await getUserData(userAuth);
                    if (userDoc && userDoc.businessId) {
                        setUser({
                            ...userAuth,
                            role: userDoc.role,
                            photoURL: userDoc.photoURL || userAuth.photoURL,
                            displayName: userDoc.name || userAuth.displayName,
                        });
                        setBusinessId(userDoc.businessId);
                    } else {
                        console.warn(`User with UID ${userAuth.uid} is authenticated but has no Firestore document or businessId. Logging out.`);
                        setUser(null);
                        setBusinessId(null);
                        await signOut(auth);
                    }
                }
            } else {
                setUser(null);
                setBusinessId(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);


    const login = async (email: string, password: string): Promise<AppUser | null> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // The onAuthStateChanged listener handles setting state, but we can return data for immediate feedback.
        if (isSuperAdminUser(email)) {
            return { ...userCredential.user, role: 'Super Admin', displayName: 'Super Admin' };
        }
        const userDoc = await getUserData(userCredential.user);
        return {
            ...userCredential.user,
            role: userDoc?.role,
            photoURL: userDoc?.photoURL || userCredential.user.photoURL,
            displayName: userDoc?.name || userCredential.user.displayName,
        };
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
