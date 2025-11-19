
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBusiness, getBusinessWithBranches } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

type BusinessInfo = {
    id: string;
    paymentOptions: string[];
};

export default function PaymentOptionsPage() {
    const { businessId, db } = useAuth();
    const [business, setBusiness] = useState<BusinessInfo | null>(null);
    const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
    const [initialPaymentOptions, setInitialPaymentOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [newOption, setNewOption] = useState('');
    const [saving, setSaving] = useState(false);
    const [optionToDelete, setOptionToDelete] = useState<string | null>(null);
    const { toast } = useToast();

     const fetchBusiness = useCallback(async () => {
        if (!businessId || !db) {
             setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const businesses = await getBusinessWithBranches(db, businessId);
            if (businesses.length > 0) {
                const biz = businesses[0];
                const currentOptions = biz.paymentOptions || [];
                setBusiness({ id: biz.id, paymentOptions: currentOptions });
                setPaymentOptions(currentOptions);
                setInitialPaymentOptions(currentOptions);
            }
        } catch (error) {
            console.error("Failed to fetch business details:", error);
            toast({ title: "Error", description: "Could not fetch payment option settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [businessId, db, toast]);

    useEffect(() => {
        fetchBusiness();
    }, [fetchBusiness]);
    
    const handleAddOption = () => {
        if (newOption && !paymentOptions.includes(newOption)) {
            const updatedOptions = [...paymentOptions, newOption.trim()];
            setPaymentOptions(updatedOptions);
            setNewOption('');
        }
    };
    
    const handleDeleteOption = (optionToRemove: string) => {
        const updatedOptions = paymentOptions.filter(option => option !== optionToRemove);
        setPaymentOptions(updatedOptions);
        setOptionToDelete(null);
    };

    const handleSave = async () => {
        if (!business || !db) return;
        setSaving(true);
        try {
            await updateBusiness(db, business.id, { paymentOptions });
            toast({ title: "Success", description: "Payment options updated successfully. Changes will apply on next page load." });
            setInitialPaymentOptions(paymentOptions);
        } catch (error) {
            console.error("Failed to save payment options:", error);
            toast({ title: "Error", description: "Could not save payment options.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify(paymentOptions) !== JSON.stringify(initialPaymentOptions);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Payment Options</CardTitle>
                <CardDescription>Add or remove payment methods available at checkout (e.g., Cash, Credit Card, QRIS).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-2/3" />
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label>Current Payment Options</Label>
                            {paymentOptions.length > 0 ? (
                                <ul className="space-y-2">
                                {paymentOptions.map((option, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                                    <span>{option}</span>
                                    <Button variant="ghost" size="icon" onClick={() => setOptionToDelete(option)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </li>
                                ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-md">No payment options defined. Only the "Charge Payment" button will be shown.</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                value={newOption}
                                onChange={(e) => setNewOption(e.target.value)}
                                placeholder="Add new option (e.g. Cash)"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                            />
                            <Button type="button" onClick={handleAddOption}>Add Option</Button>
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={saving || !hasChanges || loading}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardFooter>

            <AlertDialog open={!!optionToDelete} onOpenChange={() => setOptionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the payment option "{optionToDelete}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteOption(optionToDelete!)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
