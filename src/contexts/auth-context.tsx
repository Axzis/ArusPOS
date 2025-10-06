
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, DocumentData, collectionGroup, limit } from 'firebase/firestore';
import { Logo } from '@/components/icons';
import { isSuperAdminUser } from '@/lib/config';
import { initializeFirebase } from '@/lib/firebase'; // Reverted to old firebase lib path

const USERS_COLLECTION = 'users';

// Extend the User type to include our custom role and photoURL from Firestore
export type AppUser = User & {
    role?: string;
    photoURL?: string; // Allow overriding from Firestore
    displayName?: string; // Allow overriding from Firestore
};

type AuthContextType = {
    user: AppUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<AppUser | null>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


async function getUserData(userAuth: User): Promise<DocumentData | null> {
    const { db } = initializeFirebase();
    // Use a collectionGroup query to find the user document across all businesses
    const usersQuery = query(collectionGroup(db, USERS_COLLECTION), where("uid", "==", userAuth.uid), limit(1));
    const usersSnapshot = await getDocs(usersQuery);

    if (!usersSnapshot.empty) {
        return usersSnapshot.docs[0].data();
    }
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
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
                } else {
                    const userDoc = await getUserData(refreshedUserAuth);
                    setUser({
                        ...refreshedUserAuth,
                        role: userDoc?.role,
                        photoURL: userDoc?.photoURL || refreshedUserAuth.photoURL,
                        displayName: userDoc?.name || refreshedUserAuth.displayName,
                    });
                }
            }
        }
    }, [auth]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            setLoading(true);
            if (userAuth) {
                // Explicitly handle superadmin case first
                if (userAuth.email && isSuperAdminUser(userAuth.email)) {
                    setUser({
                        ...userAuth,
                        role: 'Super Admin',
                        displayName: 'Super Admin',
                    });
                } else {
                    // For regular users, fetch their data from Firestore.
                    const userDoc = await getUserData(userAuth);
                    if (userDoc) {
                        setUser({
                            ...userAuth,
                            role: userDoc.role,
                            photoURL: userDoc.photoURL || userAuth.photoURL,
                            displayName: userDoc.name || userAuth.displayName,
                        });
                    } else {
                        // This case handles users who are authenticated but have no Firestore record
                        // and are not superadmins. This is an error state, log them out.
                        console.warn(`User with UID ${userAuth.uid} is authenticated but has no Firestore document and is not a superadmin. Logging out.`);
                        setUser(null);
                        await signOut(auth);
                    }
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);


    const login = async (email: string, password: string): Promise<AppUser | null> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener will handle setting the global user state.
            // We just return the user object on successful login for immediate feedback if needed.
            if (isSuperAdminUser(email)) {
                return { ...userCredential.user, role: 'Super Admin', displayName: 'Super Admin' };
            }
            const userDoc = await getUserData(userCredential.user);
            const appUser = {
                ...userCredential.user,
                role: userDoc?.role,
                photoURL: userDoc?.photoURL || userCredential.user.photoURL,
                displayName: userDoc?.name || userCredential.user.displayName,
            };
            return appUser;
        } catch (error) {
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
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPass);
        } catch (error) {
            throw error;
        }
    };


    const value = { user, loading, login, logout, sendPasswordReset, updateUserPassword, refreshUser };

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
