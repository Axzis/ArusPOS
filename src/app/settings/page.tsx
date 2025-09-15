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
import { Textarea } from '@/components/ui/textarea';
import { getBusinessWithBranches } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import SettingsLayout from './layout';

type Business = {
    id: string;
    name: string;
    type: string;
    currency: string;
    branches: any[];
}

export default function SettingsProfilePage() {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBusiness() {
            try {
                const businesses = await getBusinessWithBranches();
                if (businesses.length > 0) {
                    setBusiness(businesses[0] as Business);
                }
            } catch (error) {
                console.error("Failed to fetch business details:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchBusiness();
    }, []);

  return (
    <SettingsLayout>
        <div className="grid gap-6">
            <Card>
            <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>Update your business name, type, and other details.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? <SettingsSkeleton /> : (
                <form className="grid gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="store-name">Business Name</Label>
                            <Input id="store-name" defaultValue={business?.name} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="business-type">Business Type</Label>
                            <Input id="business-type" defaultValue={business?.type} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                         <Select defaultValue={business?.currency ?? 'USD'}>
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
                </form>
                )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button disabled={loading}>Save</Button>
            </CardFooter>
            </Card>
        </div>
    </SettingsLayout>
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
            <Label htmlFor="currency">Currency</Label>
            <Skeleton className="h-10 w-[200px]" />
        </div>
    </div>
)
