
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getTransactionById } from '@/lib/firestore';
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
    purchasePrice?: number;
};

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: TransactionItem[];
    currency: string;
    discount?: number;
};

export default function InvoicePrintPage() {
    const params = useParams();
    const { id: transactionId } = params;
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof transactionId === 'string') {
            getTransactionById(transactionId)
                .then(data => {
                    if(data){
                        setTransaction(data as Transaction);
                    }
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => {
        if (!loading && transaction) {
            // Give a very small delay to ensure DOM is fully painted
            setTimeout(() => {
                window.print();
            }, 100);
        }
    }, [loading, transaction]);
    
    // Add an event listener for after printing to close the window
    useEffect(() => {
        const handleAfterPrint = () => {
             window.close();
        };

        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);


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
        return <div className="p-8 text-center">Transaction not found or could not be loaded.</div>;
    }
    
    const subtotal = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = transaction.discount || 0;
    const tax = transaction.amount + discount - subtotal;
    const currency = transaction.currency || 'USD';

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
                             {tax > 0 && (
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>{formatCurrency(tax, currency)}</span>
                                </div>
                            )}
                            {discount > 0 && (
                                <div className="flex justify-between text-destructive">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(discount, currency)}</span>
                                </div>
                            )}
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
