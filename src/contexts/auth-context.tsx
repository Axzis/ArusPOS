
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { Logo } from '@/components/icons';
import { isSuperAdminUser } from '@/lib/config';

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
    const usersRef = collection(db, USERS_COLLECTION);
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
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
            if (userAuth) {
                // Explicitly handle superadmin case first
                if (userAuth.email && isSuperAdminUser(userAuth.email)) {
                    setUser({
                        ...userAuth,
                        role: 'Super Admin',
                        displayName: 'Super Admin',
                    });
                } else {
                    // Handle regular users
                    const userDoc = await getUserData(userAuth);
                    if (userDoc) {
                        setUser({
                            ...userAuth,
                            role: userDoc?.role,
                            photoURL: userDoc?.photoURL || userAuth.photoURL,
                            displayName: userDoc?.name || userAuth.displayName,
                        });
                    } else {
                        // User is authenticated with Firebase but has no doc in 'users' collection
                        console.warn(`User with UID ${userAuth.uid} is authenticated but has no Firestore document. This can happen to old superadmin accounts. Logging out.`);
                        // Set user to null to prevent access
                        setUser(null);
                        await signOut(auth); // Force sign out
                    }
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
