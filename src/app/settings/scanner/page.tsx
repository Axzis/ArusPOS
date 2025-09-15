"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function ScannerSettingsPage() {
    const [isEnabled, setIsEnabled] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const storedValue = localStorage.getItem('barcodeScannerEnabled');
        setIsEnabled(storedValue === 'true');
    }, []);

    const handleToggle = (checked: boolean) => {
        setIsEnabled(checked);
        localStorage.setItem('barcodeScannerEnabled', String(checked));
        toast({
            title: `Barcode Scanner ${checked ? 'Enabled' : 'Disabled'}`,
            description: `The app will now ${checked ? 'listen for' : 'ignore'} barcode scanner input on the transaction page.`,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Barcode Scanner Settings</CardTitle>
                <CardDescription>
                    Enable or disable the barcode scanner functionality for the transaction page.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-4 rounded-md border p-4">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="scanner-enabled" className="text-base font-medium">
                            Enable Barcode Scanner
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            When enabled, the transaction page will listen for keyboard input from a barcode scanner to automatically add products to the cart.
                        </p>
                    </div>
                    <Switch
                        id="scanner-enabled"
                        checked={isEnabled}
                        onCheckedChange={handleToggle}
                    />
                </div>
                 <div className="p-4 bg-accent/50 border border-dashed rounded-md">
                    <h4 className="font-semibold mb-2">How it works:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Make sure your cursor is not in an input field on the transaction page.</li>
                        <li>Scan a product barcode.</li>
                        <li>The scanner should input the product's SKU and press "Enter".</li>
                        <li>The product will be automatically added to the current order.</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
