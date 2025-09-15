"use client"

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getBusinessWithBranches, updateBusiness } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type Business = {
    id: string;
    name: string;
    type: string;
    currency: string;
    taxEnabled: boolean;
    taxRate: number;
    branches: any[];
}

export default function SettingsProfilePage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        type: '', 
        currency: 'USD',
        taxEnabled: true,
        taxRate: 8,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchBusiness() {
            try {
                const businesses = await getBusinessWithBranches();
                if (businesses.length > 0) {
                    const biz = businesses[0] as Business;
                    setBusiness(biz);
                    setFormData({
                        name: biz.name || '',
                        type: biz.type || '',
                        currency: biz.currency || 'USD',
                        taxEnabled: biz.taxEnabled !== false, // default to true
                        taxRate: biz.taxRate || 8,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch business details:", error);
                 toast({ title: "Error", description: "Could not fetch business details.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchBusiness();
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [id]: type === 'number' ? parseFloat(value) : value 
        }));
    };
    
    const handleSwitchChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, taxEnabled: checked }));
    };

    const handleCurrencyChange = (value: string) => {
        setFormData(prev => ({ ...prev, currency: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) return;
        setSaving(true);
        try {
            await updateBusiness(business.id, {
                name: formData.name,
                type: formData.type,
                currency: formData.currency,
                taxEnabled: formData.taxEnabled,
                taxRate: formData.taxRate,
            });
            // Reload window to make sure context picks up new values
            window.location.reload();
            toast({ title: "Success", description: "Settings updated successfully. The app will now reload." });

        } catch (error) {
            console.error("Failed to save settings:", error);
            toast({ title: "Error", description: "Could not save settings.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };


  return (
    <form onSubmit={handleSave}>
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Update your business name and type.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <SettingsSkeleton /> : (
                <div className="grid gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Business Name</Label>
                            <Input id="name" value={formData.name} onChange={handleInputChange} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="type">Business Type</Label>
                            <Input id="type" value={formData.type} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Tax & Currency</CardTitle>
                <CardDescription>Manage transaction tax and currency settings.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <SettingsSkeleton /> : (
                    <div className="grid gap-6">
                        <div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="taxEnabled" className="font-medium">Enable Tax</Label>
                                <Switch
                                    id="taxEnabled"
                                    checked={formData.taxEnabled}
                                    onCheckedChange={handleSwitchChange}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                If enabled, tax will be calculated on transactions.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="taxRate">Tax Rate (%)</Label>
                            <Input 
                                id="taxRate" 
                                type="number"
                                value={formData.taxRate} 
                                onChange={handleInputChange} 
                                disabled={!formData.taxEnabled}
                                className="w-[200px]"
                            />
                        </div>
                        <Separator />
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Currency</Label>
                             <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                                <SelectTrigger id="currency" className="w-[200px]">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                    <SelectItem value="IDR">IDR (Rp)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="flex justify-start">
             <Button type="submit" disabled={loading || saving}>
                {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
        </div>
    </div>
    </form>
  )
}


const SettingsSkeleton = () => (
    <div className="grid gap-4">
        <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="store-name">Business Name</Label>
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="business-type">Business Type</Label>
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
         <div className="grid gap-2">
            <Label htmlFor="tax">Tax Settings</Label>
            <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <Skeleton className="h-10 w-[200px]" />
        </div>
    </div>
)
