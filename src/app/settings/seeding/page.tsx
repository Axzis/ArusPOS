
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { seedInitialDataForBranch } from '@/lib/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SeedingPage() {
    const [loading, setLoading] = useState(false);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            setActiveBranchId(JSON.parse(storedBranch).id);
        }
    }, []);

    const handleSeed = async () => {
        if (!activeBranchId) {
            toast({
                title: "No Active Branch",
                description: "Please select a branch before seeding data.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await seedInitialDataForBranch(activeBranchId);
            toast({
                title: "Database Seeded!",
                description: "Sample products and customers have been added to your branch.",
            });
            // Redirect to products page to see the new data
            router.push('/products');
        } catch (error: any) {
            console.error("Failed to seed database:", error);
            toast({
                title: "Seeding Failed",
                description: error.message || "Could not add sample data. The branch may already contain data.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Database Seeding</CardTitle>
                <CardDescription>
                    Populate the database for the current branch with sample data. This is useful for new, empty branches.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Heads up!</AlertTitle>
                    <AlertDescription>
                       This action will add a predefined list of sample products and customers to your currently active branch. It will fail if the branch already contains product data to prevent duplicates.
                    </AlertDescription>
                </Alert>

                <div className="flex justify-start">
                    <Button 
                        onClick={handleSeed} 
                        disabled={loading || !activeBranchId}
                    >
                        {loading ? 'Seeding...' : 'Seed Database with Sample Data'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
