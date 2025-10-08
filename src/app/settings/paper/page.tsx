
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBusiness, getBusinessWithBranches } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';


type BusinessInfo = {
    id: string;
    paperSize: 'A4' | '8cm' | '5.8cm';
};


export default function PaperSettingsPage() {
    const { businessId, db } = useAuth();
    const [business, setBusiness] = useState<BusinessInfo | null>(null);
    const [paperSize, setPaperSize] = useState<'A4' | '8cm' | '5.8cm'>('8cm');
    const [initialPaperSize, setInitialPaperSize] = useState<'A4-l' | '8cm' | '5.8cm'>('8cm');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const fetchBusiness = useCallback(async () => {
        if (!businessId || !db) return;
        setLoading(true);
        try {
            const businesses = await getBusinessWithBranches(db, businessId);
            if (businesses.length > 0) {
                const biz = businesses[0];
                const currentSize = biz.paperSize || '8cm';
                setBusiness({ id: biz.id, paperSize: currentSize });
                setPaperSize(currentSize);
                setInitialPaperSize(currentSize);
            }
        } catch (error) {
            console.error("Failed to fetch business details:", error);
            toast({ title: "Error", description: "Could not fetch paper size settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [businessId, db, toast]);

    useEffect(() => {
        fetchBusiness();
    }, [fetchBusiness]);

    const handleSave = async () => {
        if (!business || !db) return;
        setSaving(true);
        try {
            await updateBusiness(db, business.id, { paperSize });
            toast({ title: "Success", description: "Paper size settings updated successfully. Changes will apply on next page load." });
            setInitialPaperSize(paperSize);
        } catch (error) {
            console.error("Failed to save paper size:", error);
            toast({ title: "Error", description: "Could not save paper size settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = paperSize !== initialPaperSize;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Paper Settings</CardTitle>
                <CardDescription>
                    Configure the default paper size for printing invoices and receipts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="grid gap-2">
                        <Label htmlFor="paper-size">Default Paper Size</Label>
                        <Skeleton className="h-10 w-[250px]" />
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="paper-size">Default Paper Size</Label>
                        <Select value={paperSize} onValueChange={(v) => setPaperSize(v as 'A4' | '8cm' | '5.8cm')}>
                            <SelectTrigger id="paper-size" className="w-[250px]">
                                <SelectValue placeholder="Select paper size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A4">A4</SelectItem>
                                <SelectItem value="8cm">8cm (Thermal Receipt)</SelectItem>
                                <SelectItem value="5.8cm">5.8cm (Thermal Receipt)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Select the paper size that matches your printer.
                        </p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={saving || !hasChanges || loading}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardFooter>
        </Card>
    );
}
