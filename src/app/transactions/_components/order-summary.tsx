"use client";

import React from 'react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  originalPrice: number;
  unit: string;
  purchasePrice?: number;
};

type Customer = {
    id: string;
    name: string;
    phone?: string;
};

interface OrderSummaryProps {
    orderItems: OrderItem[];
    customers: Customer[];
    selectedCustomerId: string;
    onCustomerChange: (id: string) => void;
    onUpdateQuantity: (id: string, quantity: number) => void;
    onRemoveItem: (id: string) => void;
    onClearOrder: () => void;
    onCharge: () => void;
    subtotal: number;
    tax: number;
    total: number;
    discount: number;
    onDiscountChange: (value: number) => void;
    currency: string;
    taxEnabled: boolean;
    taxRate: number;
    isProcessing: boolean;
    anonymousCustomerId: string;
}

export default function OrderSummary({
    orderItems,
    customers,
    selectedCustomerId,
    onCustomerChange,
    onUpdateQuantity,
    onRemoveItem,
    onClearOrder,
    onCharge,
    subtotal,
    tax,
    total,
    discount,
    onDiscountChange,
    currency,
    taxEnabled,
    taxRate,
    isProcessing,
    anonymousCustomerId
}: OrderSummaryProps) {
    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>New Transaction</CardTitle>
                <CardDescription>
                    Add products to the order and process the payment.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    <Select value={selectedCustomerId} onValueChange={onCustomerChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a customer (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={anonymousCustomerId}>Anonymous</SelectItem>
                            {customers.map(customer => (
                                <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="w-[100px]">Quantity</TableHead>
                                <TableHead className="hidden sm:table-cell">Unit</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="w-0"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orderItems.length > 0 ? (
                                orderItems.map((item) => (
                                    <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        {item.name}
                                        {item.price < item.originalPrice && (
                                            <Badge variant="destructive" className="ml-2">Promo</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value, 10))}
                                            min="1"
                                            max={item.stock}
                                            className="h-8 w-16 text-center"
                                        />
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{item.unit}</TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(item.price * item.quantity, currency)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRemoveItem(item.id)}
                                        >
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                    </TableRow>
                                ))
                                ) : (
                                <TableRow>
                                    <TableCell
                                    colSpan={5}
                                    className="py-10 text-center text-muted-foreground"
                                    >
                                    No items in order
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {orderItems.length > 0 && (
                        <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(subtotal, currency)}</span>
                        </div>
                        {taxEnabled && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                                <span>{formatCurrency(tax, currency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <Label htmlFor="discount" className="text-muted-foreground">Discount</Label>
                            <Input 
                            id="discount"
                            type="number"
                            value={discount}
                            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                            className="h-8 w-[100px] text-right"
                            placeholder="0"
                            />
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{formatCurrency(total, currency)}</span>
                        </div>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-2">
                <Button variant="outline" onClick={onClearOrder} disabled={isProcessing} className="w-full sm:w-auto">
                    <X className="mr-2 h-4 w-4" /> Clear Order
                </Button>
                <Button disabled={orderItems.length === 0 || isProcessing} onClick={onCharge} className="w-full sm:w-auto">
                    {isProcessing ? 'Processing...' : 'Charge Payment'}
                </Button>
            </CardFooter>
        </Card>
    )
}
