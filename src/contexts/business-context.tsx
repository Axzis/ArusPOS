
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBusinessWithBranches } from '@/lib/firestore';
import { useAuth } from './auth-context';

type Business = {
    id: string;
    name: string;
    type: string;
    currency: string;
    taxEnabled: boolean;
    taxRate: number;
    units: string[];
    paperSize: 'A4' | '8cm' | '5.8cm';
    branches: any[];
}

type BusinessContextType = {
    business: Business | null;
    loading: boolean;
    currency: string;
    taxEnabled: boolean;
    taxRate: number;
    units: string[];
    paperSize: 'A4' | '8cm' | '5.8cm';
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const { user, businessId } = useAuth();

    useEffect(() => {
        async function fetchBusiness() {
            if (!user || !businessId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const businesses = await getBusinessWithBranches(businessId);
                if (businesses.length > 0) {
                    setBusiness(businesses[0] as Business);
                } else {
                    setBusiness(null);
                }
            } catch (error) {
                console.error("Failed to fetch business details:", error);
                setBusiness(null);
            } finally {
                setLoading(false);
            }
        }
        fetchBusiness();
    }, [user, businessId]);

    const currency = business?.currency || 'USD';
    const taxEnabled = business?.taxEnabled !== false; // default to true
    const taxRate = business?.taxRate || 0;
    const units = business?.units || ['pcs'];
    const paperSize = business?.paperSize || '8cm';

    const value = { business, loading, currency, taxEnabled, taxRate, units, paperSize };

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}
