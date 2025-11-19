
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreHorizontal, Upload, FileCheck, FileX, Image as ImageIcon } from 'lucide-react';
import { format as formatDate, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { getTransactionsForBranch, updateDebtTransaction } from '@/lib/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/image-upload-dialog';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    items: { name: string; quantity: number; }[];
    isPaid: boolean;
    paidAt?: string;
    debtNoteImageUrl?: string;
    paymentNoteImageUrl?: string;
    currency: string;
}

export default function DebtPage() {
    const { businessId, db } = useAuth();
    const [debtTransactions, setDebtTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const { toast } = useToast();

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [debtNoteImage, setDebtNoteImage] = useState<string | null>(null);
    const [paymentNoteImage, setPaymentNoteImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        const storedBranch = localStorage.getItem('activeBranch');
        const branch = storedBranch ? JSON.parse(storedBranch) : null;
        if (!branch?.id || !businessId || !db) {
            setLoading(false);
            return;
        }

        setActiveBranchId(branch.id);
        setLoading(true);
        try {
            const allTransactions = await getTransactionsForBranch(db, businessId, branch.id);
            const debtTxns = allTransactions.filter(tx => tx.paymentMethod === 'Utang');
            setDebtTransactions(debtTxns as Transaction[]);
        } catch (error) {
            console.error("Failed to fetch debt transactions:", error);
            toast({ title: "Error", description: "Could not fetch debt transactions.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [businessId, db, toast]);

    useEffect(() => {
        if(businessId) {
            fetchData();
        }
    }, [fetchData, businessId]);

    const handleManageClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsPaid(transaction.isPaid);
        setDebtNoteImage(transaction.debtNoteImageUrl || null);
        setPaymentNoteImage(transaction.paymentNoteImageUrl || null);
        setIsManageDialogOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedTransaction || !activeBranchId || !businessId) return;
        
        setIsSaving(true);
        try {
            const updateData: Partial<Transaction> = {
                isPaid: isPaid,
            };
            if(debtNoteImage) updateData.debtNoteImageUrl = debtNoteImage;
            if(paymentNoteImage) updateData.paymentNoteImageUrl = paymentNoteImage;

            await updateDebtTransaction(db, businessId, activeBranchId, selectedTransaction.id, updateData);
            
            toast({ title: "Success", description: "Debt transaction has been updated." });
            fetchData();
            setIsManageDialogOpen(false);
        } catch (error) {
             console.error("Failed to update debt transaction:", error);
            toast({ title: "Error", description: "Could not update debt transaction.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 mx-auto w-full max-w-7xl">
            <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6">
                <h1 className="text-lg font-semibold md:text-2xl">Manajemen Utang</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Transaksi Utang</CardTitle>
                    <CardDescription>Lihat dan kelola semua transaksi yang belum lunas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : debtTransactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-medium">{tx.customerName}</TableCell>
                                        <TableCell>{formatDate(parseISO(tx.date), "dd MMM yyyy, HH:mm")}</TableCell>
                                        <TableCell>{formatCurrency(tx.amount, tx.currency || 'IDR')}</TableCell>
                                        <TableCell>
                                            <Badge variant={tx.isPaid ? 'default' : 'destructive'}>
                                                {tx.isPaid ? 'Lunas' : 'Belum Lunas'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleManageClick(tx)}>Kelola</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         { !loading && debtTransactions.length === 0 && (
                            <div className="text-center p-10 text-muted-foreground">
                                Tidak ada transaksi utang yang ditemukan.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Kelola Utang: {selectedTransaction?.customerName}</DialogTitle>
                        <DialogDescription>
                            Perbarui status pembayaran dan lampirkan bukti.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-6">
                        <div className="grid gap-6 py-4">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Tandai Sebagai Lunas</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Aktifkan jika utang sudah dibayar.
                                    </p>
                                </div>
                                <Switch
                                    checked={isPaid}
                                    onCheckedChange={setIsPaid}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Nota Utang</Label>
                                {debtNoteImage ? (
                                    <Image src={debtNoteImage} alt="Nota Utang" width={400} height={200} className="rounded-md object-contain border" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-md">
                                        <p className="text-sm text-muted-foreground">Tidak ada nota</p>
                                    </div>
                                )}
                                <ImageUploadDialog onImageSelect={setDebtNoteImage}>
                                    <Button variant="outline" className="w-full">
                                        <Upload className="mr-2 h-4 w-4"/>
                                        {debtNoteImage ? 'Ganti Nota Utang' : 'Unggah Nota Utang'}
                                    </Button>
                                </ImageUploadDialog>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Bukti Pembayaran</Label>
                                {paymentNoteImage ? (
                                    <Image src={paymentNoteImage} alt="Bukti Pembayaran" width={400} height={200} className="rounded-md object-contain border" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-md">
                                        <p className="text-sm text-muted-foreground">Tidak ada bukti pembayaran</p>
                                    </div>
                                )}
                                <ImageUploadDialog onImageSelect={setPaymentNoteImage}>
                                    <Button variant="outline" className="w-full">
                                        <Upload className="mr-2 h-4 w-4"/>
                                        {paymentNoteImage ? 'Ganti Bukti Bayar' : 'Unggah Bukti Bayar'}
                                    </Button>
                                </ImageUploadDialog>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsManageDialogOpen(false)}>Batal</Button>
                        <Button type="submit" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
