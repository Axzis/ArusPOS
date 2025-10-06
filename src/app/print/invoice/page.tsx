
"use client";

import React, { useEffect } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusiness } from '@/contexts/business-context';

type TransactionItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    unit: string;
    originalPrice: number;
    purchasePrice?: number;
};

type Transaction = {
    id: string;
    customerName: string;
    cashierName?: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: TransactionItem[];
    currency: string;
    discount?: number;
};

// This component is not used in the new print flow but is kept as a fallback or for potential future use.
// The primary print logic is now handled dynamically in the transactions page.
export default function InvoicePrintPage() {
    return <div className="p-8 text-center">This page is not in use. Please print from the transactions page.</div>;
}
