
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  Auth
} from 'firebase/auth';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { getBusinessId, getBusinessWithBranches, updateBusiness } from '@/lib/firestore';
import { isSuperAdminUser } from '@/lib/config';
import { initializeFirebase } from '@/firebase';
import { Logo } from '@/components/icons';


export type AppUser = User & {
  role?: string;
  photoURL?: string;
  displayName?: string;
};

type BusinessContextType = {
  currency: string;
  units: string[];
  paperSize: 'A4' | '8cm' | '5.8cm';
  taxEnabled: boolean;
  taxRate: number;
  paymentOptions: string[];
  loading: boolean;
  updateBusinessSettings: (settings: Partial<any>) => Promise<void>;
}

type AuthContextType = {
  // Firebase Instances
  auth: Auth;
  db: Firestore;
  
  // App State
  user: AppUser | null;
  businessId: string | null;
  loading: boolean;
  
  // Auth Functions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
  refreshUser: () => Promise<void>;
} & BusinessContextType;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, db } = initializeFirebase();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Business Context State
  const [currency, setCurrency] = useState('USD');
  const [units, setUnits] = useState(['pcs']);
  const [paperSize, setPaperSize] = useState<'A4' | '8cm' | '5.8cm'>('8cm');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const fetchBusinessInfo = useCallback(async (bId: string) => {
    if (!bId) {
      setLoadingBusiness(false);
      return;
    }
    setLoadingBusiness(true);
    try {
      const businessData = await getBusinessWithBranches(db, bId);
      if (businessData.length > 0) {
        const biz = businessData[0];
        setCurrency(biz.currency || 'USD');
        setUnits(biz.units || ['pcs']);
        setPaperSize(biz.paperSize || '8cm');
        setTaxEnabled(biz.taxEnabled !== false);
        setTaxRate(biz.taxRate || 0);
        setPaymentOptions(biz.paymentOptions || []);
      }
    } catch (error) {
      console.error("Failed to fetch business context data", error);
    } finally {
      setLoadingBusiness(false);
    }
  }, [db]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          if (firebaseUser.email && isSuperAdminUser(firebaseUser.email)) {
            setAppUser({ ...firebaseUser, role: 'Super Admin', displayName: 'Super Admin' });
            setBusinessId(null);
            setLoadingBusiness(false);
          } else {
            const { businessId: bId, userData } = await getBusinessId(db, firebaseUser);
            setBusinessId(bId);
            setAppUser({
              ...firebaseUser,
              role: userData?.role,
              displayName: userData?.name || firebaseUser.displayName,
              photoURL: userData?.photoURL || firebaseUser.photoURL,
            });
            if (bId) {
              await fetchBusinessInfo(bId);
            } else {
              setLoadingBusiness(false);
            }
          }
        } catch (error) {
          console.error("Error fetching user business info:", error);
          setAppUser(firebaseUser);
          setBusinessId(null);
          setLoadingBusiness(false);
        }
      } else {
        setAppUser(null);
        setBusinessId(null);
        setLoadingBusiness(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db, fetchBusinessInfo]);
  
  useEffect(() => {
    if (businessId) {
      fetchBusinessInfo(businessId);
    }
  }, [businessId, fetchBusinessInfo]);


  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
    }
  }, [auth]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserPassword = async (currentPass: string, newPass: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("No user is currently signed in.");
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPass);
  };
  
  const updateBusinessSettings = async (settings: Partial<any>) => {
    if (!businessId) throw new Error("No business ID found");
    await updateBusiness(db, businessId, settings);
    await fetchBusinessInfo(businessId);
  }

  const value = {
    auth,
    db,
    user: appUser,
    loading: loading || loadingBusiness,
    businessId,
    login,
    logout,
    sendPasswordReset,
    updateUserPassword,
    refreshUser,
    // Business Context values
    currency,
    units,
    paperSize,
    taxEnabled,
    taxRate,
    paymentOptions,
    updateBusinessSettings
  };

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
