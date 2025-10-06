"use client";

import React, { useMemo } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';

type RefundItem = {
    id: string;
    name: string;
    quantity: number;
    price: number;
    originalPrice: number;
    purchasePrice?: number;
    unit: string;
    maxQuantity: number;
}

type Transaction = {
    id: string;
    customerName: string;
    cashierName?: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded' | 'Partially Refunded';
    type: 'Sale' | 'Refund';
    items: any[];
    discount?: number;
    currency: string;
}

interface RefundDialogProps {
    transactionToRefund: Transaction | null;
    onClose: () => void;
    refundItems: RefundItem[];
    onRefundQuantityChange: (itemId: string, quantity: number) => void;
    onExecuteRefund: () => void;
    isProcessing: boolean;
    currency: string;
}

export default function RefundDialog({
    transactionToRefund,
    onClose,
    refundItems,
    onRefundQuantityChange,
    onExecuteRefund,
    isProcessing,
    currency
}: RefundDialogProps) {

    const totalRefundAmount = useMemo(() => {
        return refundItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [refundItems]);
    
    return (
        <AlertDialog open={!!transactionToRefund} onOpenChange={onClose}>
            <AlertDialogContent className="sm:max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>Process Refund</AlertDialogTitle>
                    <AlertDialogDescription>
                        Select the quantity of each item to refund. Stock will be restored accordingly.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {transactionToRefund && (
                    <div className="space-y-4">
                       <ScrollArea className="h-64 pr-4">
                            <div className="space-y-4">
                                {refundItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-4 p-2 border rounded-md">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Purchased: {item.maxQuantity} @ {formatCurrency(item.price, currency)}
                                            </p>
                                        </div>
                                        <div className="w-24">
                                            <Label htmlFor={`refund-${item.id}`} className="sr-only">Quantity</Label>
                                            <Input
                                                id={`refund-${item.id}`}
                                                type="number"
                                                min={0}
                                                max={item.maxQuantity}
                                                value={item.quantity}
                                                onChange={(e) => onRefundQuantityChange(item.id, parseInt(e.target.value, 10))}
                                                className="h-8 text-center"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Refund:</span>
                            <span>{formatCurrency(totalRefundAmount, currency)}</span>
                        </div>
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onExecuteRefund} disabled={isProcessing || totalRefundAmount <= 0}>
                        {isProcessing ? 'Refunding...' : 'Confirm Refund'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}