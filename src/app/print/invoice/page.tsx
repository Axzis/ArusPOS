
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

// This component is now simpler and does not use React state for the transaction.
export default function InvoicePrintPage() {
    const { paperSize } = useBusiness();
    
    // We get the transaction data directly when the component mounts.
    // No state, no useEffect for data fetching.
    let transaction: Transaction | null = null;
    let isLoading = true;

    if (typeof window !== 'undefined') {
        try {
            const storedTransaction = localStorage.getItem('transactionToPrint');
            if (storedTransaction) {
                transaction = JSON.parse(storedTransaction);
            }
        } catch (error) {
            console.error("Could not parse transaction from localStorage", error);
            transaction = null;
        } finally {
            isLoading = false;
        }
    }

    useEffect(() => {
        if (transaction) {
             // Use a small timeout to ensure the DOM is fully painted before printing.
            setTimeout(() => {
                window.print();
            }, 100);
        }

        const handleAfterPrint = () => {
            // Clean up and close the window after printing is done.
            localStorage.removeItem('transactionToPrint');
            window.close();
        };

        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [transaction]); // Dependency array ensures this runs only when the transaction object is resolved.

    const getPaperWidthClass = () => {
        switch (paperSize) {
            case '5.8cm':
                return 'w-[58mm]';
            case '8cm':
                return 'w-[80mm]';
            case 'A4':
            default:
                return 'w-[210mm]';
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-white">
                <Card className="mx-auto">
                    <CardHeader className="text-center">
                        <Skeleton className="h-8 w-1/4 mx-auto" />
                        <Skeleton className="h-4 w-1/6 mx-auto mt-2" />
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!transaction) {
        return <div className="p-8 text-center">Transaction not found or could not be loaded. Please close this tab and try again.</div>;
    }
    
    const subtotal = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = transaction.discount || 0;
    const tax = transaction.amount + discount - subtotal;
    const currency = transaction.currency || 'Rp';

    return (
        <div className={cn("p-4 bg-white font-mono text-xs mx-auto", getPaperWidthClass())}>
            <Card className="shadow-none border-0">
                <CardHeader className='text-center p-1'>
                    <CardTitle className="text-base">Invoice</CardTitle>
                    <CardDescription>#{transaction.id.substring(0, 8)}</CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                    <div className="grid gap-2 text-left">
                        <div>
                            <p className="font-medium">Billed To:</p>
                            <p>{transaction.customerName}</p>
                        </div>
                        <div>
                            <p className="font-medium">Date:</p>
                            <p>{new Date(transaction.date).toLocaleString()}</p>
                        </div>
                        {transaction.cashierName && (
                             <div>
                                <p className="font-medium">Cashier:</p>
                                <p>{transaction.cashierName}</p>
                            </div>
                        )}
                        <Separator className="my-2"/>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-1 py-0 h-auto">Product</TableHead>
                                    <TableHead className="text-center px-1 py-0 h-auto">Qty</TableHead>
                                    <TableHead className="text-center px-1 py-0 h-auto">Unit</TableHead>
                                    <TableHead className="text-right px-1 py-0 h-auto">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transaction.items.map(item => (
                                    <TableRow key={item.id} className="break-inside-avoid">
                                        <TableCell className="px-1 py-0 align-top break-words whitespace-normal text-left">{item.name}</TableCell>
                                        <TableCell className="text-center px-1 py-0 align-top">{item.quantity}</TableCell>
                                        <TableCell className="text-center px-1 py-0 align-top">{item.unit || ''}</TableCell>
                                        <TableCell className="text-right px-1 py-0 align-top">{formatCurrency(item.price * item.quantity, currency)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Separator className="my-2"/>
                         <div className="w-full space-y-1">
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
                 <CardFooter className="flex-col gap-2 text-center text-muted-foreground p-1 mt-4">
                    <p>Thank you for your business!</p>
                    <p>Arus POS</p>
                </CardFooter>
            </Card>
        </div>
    );
}
