"use client";

import React, { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

interface ConfirmationDialogsProps {
  isConfirming: boolean;
  onConfirmingChange: (isOpen: boolean) => void;
  onConfirmCharge: () => void;
  chargeAmount: number;
  currency: string;
  isRegistering: boolean;
  onRegisteringChange: (isOpen: boolean) => void;
  onRegisterAndSend: (customer: { name: string; phone: string }) => void;
}

export default function ConfirmationDialogs({
  isConfirming,
  onConfirmingChange,
  onConfirmCharge,
  chargeAmount,
  currency,
  isRegistering,
  onRegisteringChange,
  onRegisterAndSend,
}: ConfirmationDialogsProps) {
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const handleRegister = () => {
    if (newCustomer.name && newCustomer.phone) {
      onRegisterAndSend(newCustomer);
      setNewCustomer({ name: '', phone: '' });
    }
  };

  return (
    <>
      <AlertDialog open={isConfirming} onOpenChange={onConfirmingChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to charge {formatCurrency(chargeAmount, currency)}? This will complete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCharge}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRegistering} onOpenChange={onRegisteringChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Daftarkan Pelanggan Baru</AlertDialogTitle>
            <AlertDialogDescription>
              Masukkan detail pelanggan untuk mendaftar dan mengirim struk via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nama</Label>
              <Input id="name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">No. WhatsApp</Label>
              <Input id="phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="col-span-3" placeholder="628123456789" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewCustomer({ name: '', phone: '' })}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegister}>Daftar & Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
