
"use client";

import React, { useState, useEffect } from 'react';
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
import { updateBusiness } from '@/lib/firestore';
import { useBusiness } from '@/contexts/business-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function PaperSettingsPage() {
    const { business, paperSize: initialPaperSize, loading: loadingBusiness } = useBusiness();
    const [paperSize, setPaperSize] = useState(initialPaperSize);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setPaperSize(initialPaperSize);
    }, [initialPaperSize]);

    const handleSave = async () => {
        if (!business) return;
        setSaving(true);
        try {
            await updateBusiness(business.id, { paperSize });
            toast({ title: "Success", description: "Paper size settings updated successfully." });
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
                {loadingBusiness ? (
                    <div className="grid gap-2">
                        <Label htmlFor="paper-size">Default Paper Size</Label>
                        <Skeleton className="h-10 w-[250px]" />
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="paper-size">Default Paper Size</Label>
                        <Select value={paperSize} onValueChange={setPaperSize}>
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
                <Button onClick={handleSave} disabled={saving || !hasChanges || loadingBusiness}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardFooter>
        </Card>
    );
}
