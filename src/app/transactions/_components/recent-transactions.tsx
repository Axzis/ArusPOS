
"use client";

import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, Printer, MessageSquare, RotateCcw } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';


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

type TransactionStatus = 'Paid' | 'Refunded' | 'Partially Refunded';

type Transaction = {
    id: string;
    customerName: string;
    cashierName?: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    type: 'Sale' | 'Refund';
    items: OrderItem[];
    discount?: number;
    currency: string;
}

interface RecentTransactionsProps {
    transactions: Transaction[];
    isLoading: boolean;
    currency: string;
    onPrint: (transactionId: string) => void;
    onSendWhatsApp: (transaction: Transaction) => void;
    onOpenRefundDialog: (transaction: Transaction) => void;
}

export default function RecentTransactions({
    transactions,
    isLoading,
    currency,
    onPrint,
    onSendWhatsApp,
    onOpenRefundDialog,
}: RecentTransactionsProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [filterType, setFilterType] = useState('customer');
    const [filterValue, setFilterValue] = useState('');

    const handleFilterChange = (value: string) => {
        setFilterValue(value);
        setCurrentPage(1);
    };
    
    const handleFilterTypeChange = (type: string) => {
        setFilterType(type);
        setFilterValue('');
        setCurrentPage(1);
    };
    
    const clearFilter = () => {
        setFilterValue('');
        setFilterType('customer');
        setCurrentPage(1);
    };

    const filteredTransactions = useMemo(() => {
        if (!filterValue) return transactions;

        return transactions.filter(transaction => {
            if (filterType === 'customer') {
                return transaction.customerName.toLowerCase().includes(filterValue.toLowerCase());
            }
            if (filterType === 'date') {
                try {
                    return formatDate(parseISO(transaction.date), 'yyyy-MM-dd') === filterValue;
                } catch {
                    return false;
                }
            }
            if (filterType === 'item') {
                return transaction.items.some(item => item.name.toLowerCase().includes(filterValue.toLowerCase()));
            }
            return true;
        });
    }, [transactions, filterType, filterValue]);

    const totalPages = itemsPerPage > 0 ? Math.ceil(filteredTransactions.length / itemsPerPage) : 1;
    const currentTransactions = useMemo(() => {
        if (itemsPerPage === 0) return filteredTransactions;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredTransactions.slice(startIndex, endIndex);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const handleItemsPerPageChange = (value: string) => {
        const numValue = parseInt(value, 10);
        setItemsPerPage(isNaN(numValue) ? 0 : numValue);
        setCurrentPage(1);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardDescription>A list of the most recent sales for this branch.</CardDescription>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <Select value={filterType} onValueChange={handleFilterTypeChange}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Filter by..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="item">Item</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type={filterType === 'date' ? 'date' : 'text'}
                            placeholder="Search..."
                            value={filterValue}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="w-full sm:w-auto"
                        />
                        <Button variant="ghost" onClick={clearFilter}>Clear</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden sm:table-cell">Items</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">User</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                                <TableCell className="flex gap-2 justify-end"><Skeleton className="h-8 w-8" /></TableCell>
                            </TableRow>
                        ))
                        ) : currentTransactions.map((transaction) => {
                        const itemsSummary = transaction.items?.map(i => `${i.quantity}x ${i.name}`).join(', ');
                        return (
                        <TableRow key={transaction.id}>
                            <TableCell>
                                <div className="font-medium">{transaction.customerName || 'Anonymous'}</div>
                            </TableCell>
                            <TableCell className='max-w-[200px] hidden sm:table-cell whitespace-normal break-words'>{itemsSummary}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(new Date(transaction.date), "dd MMM yyyy, HH:mm")}</TableCell>
                            <TableCell>
                            <Badge
                                variant={
                                    transaction.status === 'Paid' ? 'default'
                                    : transaction.status === 'Refunded' ? 'destructive'
                                    : 'secondary'
                                }
                            >
                                {transaction.status || 'N/A'}
                            </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{transaction.cashierName}</TableCell>
                            <TableCell
                                className={`text-right ${transaction.type === 'Refund' ? 'text-destructive' : ''}`}
                            >
                                {formatCurrency(transaction.amount || 0, transaction.currency || currency)}
                            </TableCell>
                            <TableCell className='text-right'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => onPrint(transaction.id)}>
                                            <Printer className="mr-2 h-4 w-4" /> Print
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => onSendWhatsApp(transaction)}>
                                            <MessageSquare className="mr-2 h-4 w-4" /> Send WA
                                        </DropdownMenuItem>
                                        {(transaction.status === 'Paid' || transaction.status === 'Partially Refunded') && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onSelect={() => onOpenRefundDialog(transaction)} className="text-destructive focus:text-destructive">
                                                    <RotateCcw className="mr-2 h-4 w-4" /> Refund
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        )})}
                    </TableBody>
                    </Table>
                </div>
                { !isLoading && filteredTransactions.length === 0 && (
                    <div className="text-center p-10 text-muted-foreground">
                        No transactions found for this branch or filter.
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * (itemsPerPage || 0) + 1, filteredTransactions.length)} to {Math.min(currentPage * (itemsPerPage || filteredTransactions.length), filteredTransactions.length)} of {filteredTransactions.length} transactions.
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="0">All</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
