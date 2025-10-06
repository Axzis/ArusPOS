
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBusinessWithBranches } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';

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

    useEffect(() => {
        async function fetchBusiness() {
            try {
                const businesses = await getBusinessWithBranches();
                if (businesses.length > 0) {
                    setBusiness(businesses[0] as Business);
                }
            } catch (error) {
                console.error("Failed to fetch business details:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchBusiness();
    }, []);

    const currency = business?.currency || 'USD';
    const taxEnabled = business?.taxEnabled !== false; // default to true
    const taxRate = business?.taxRate || 0;
    const units = business?.units || ['pcs'];
    const paperSize = business?.paperSize || '8cm';

    const value = { business, loading, currency, taxEnabled, taxRate, units, paperSize };

    if (loading) {
         return (
          <div className="flex h-screen items-center justify-center">
             <div className="w-full h-full flex flex-col items-center justify-center">
                 <Skeleton className="h-12 w-1/2 mb-4" />
                 <Skeleton className="h-8 w-1/3" />
            </div>
          </div>
        )
    }

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
