
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTransactionById } from '@/lib/firestore';
import { useBusiness } from '@/contexts/business-context';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type TransactionItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    originalPrice: number;
};

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: TransactionItem[];
};

export default function InvoicePrintPage() {
    const params = useParams();
    const { id: transactionId } = params;
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const { currency } = useBusiness();
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);


    useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            setActiveBranchId(JSON.parse(storedBranch).id);
        }
    }, []);

    useEffect(() => {
        if (typeof transactionId === 'string' && activeBranchId) {
            getTransactionById(activeBranchId, transactionId)
                .then(data => {
                    setTransaction(data as Transaction);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [transactionId, activeBranchId]);

    useEffect(() => {
        if (!loading && transaction) {
            window.print();
            // Add a small delay to allow the print dialog to open before closing the tab
            setTimeout(() => {
                 window.close();
            }, 500);
        }
    }, [loading, transaction]);

    if (loading) {
        return (
            <div className="p-8">
                <Card>
                    <CardHeader className="text-center">
                        <Skeleton className="h-8 w-1/4 mx-auto" />
                        <Skeleton className="h-4 w-1/6 mx-auto mt-2" />
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!transaction) {
        return <div>Transaction not found.</div>;
    }
    
    const subtotal = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="p-8 bg-white">
            <Card className="shadow-none border-0">
                <CardHeader className='text-center'>
                    <CardTitle>Invoice</CardTitle>
                    <CardDescription>#{transaction.id.substring(0, 8)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 text-sm">
                            <div>
                                <p className="font-medium">Billed To</p>
                                <p>{transaction.customerName}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">Date</p>
                                <p>{new Date(transaction.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Separator />
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transaction.items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.price * item.quantity, currency)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Separator />
                         <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span>{formatCurrency(transaction.amount - subtotal, currency)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(transaction.amount, currency)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col gap-2 text-center text-xs text-muted-foreground">
                    <p>Thank you for your business!</p>
                    <p>Arus POS</p>
                </CardFooter>
            </Card>
        </div>
    );
}

    