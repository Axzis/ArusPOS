
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { seedInitialDataForBranch, resetBranchData } from '@/lib/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ShieldAlert, Ban } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

export default function SeedingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [seedingLoading, setSeedingLoading] = useState(false);
    const [resettingLoading, setResettingLoading] = useState(false);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const [activeBranchName, setActiveBranchName] = useState<string | null>(null);
    const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState("");
    const { toast } = useToast();

    const isSuperAdmin = user?.email === 'superadmin@gmail.com';

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, isSuperAdmin, router]);


    useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            const branch = JSON.parse(storedBranch);
            setActiveBranchId(branch.id);
            setActiveBranchName(branch.name);
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

        setSeedingLoading(true);
        try {
            const success = await seedInitialDataForBranch(activeBranchId);
            if (success) {
                toast({
                    title: "Database Seeded!",
                    description: "Sample products and customers have been added to your branch.",
                });
                router.push('/products');
            } else {
                 toast({
                    title: "Seeding Skipped",
                    description: "This branch already contains product data. No action was taken.",
                    variant: 'default',
                });
            }
        } catch (error: any) {
            console.error("Failed to seed database:", error);
            toast({
                title: "Seeding Failed",
                description: error.message || "An unexpected error occurred during seeding.",
                variant: "destructive",
            });
        } finally {
            setSeedingLoading(false);
        }
    };
    
    const handleReset = async () => {
        if (!activeBranchId) {
            toast({
                title: "No Active Branch",
                description: "Please select a branch before resetting data.",
                variant: "destructive",
            });
            return;
        }

        setResettingLoading(true);
        try {
            await resetBranchData(activeBranchId);
            toast({
                title: "Branch Reset Successful!",
                description: `All products, transactions, and promos for ${activeBranchName} have been deleted.`,
            });
            setIsResetAlertOpen(false);
            setResetConfirmText("");
            router.refresh();
        } catch (error: any) {
            console.error("Failed to reset branch:", error);
            toast({
                title: "Reset Failed",
                description: error.message || "An unexpected error occurred during reset.",
                variant: "destructive",
            });
        } finally {
            setResettingLoading(false);
        }
    };
    
    if (!isSuperAdmin) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <Ban className='text-destructive' /> Access Denied
                    </CardTitle>
                    <CardDescription>
                        This page is restricted to super administrators only.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className='text-muted-foreground'>You do not have the necessary permissions to view or use the data seeding and reset tools.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
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
                           This action will add sample products and customers. It will not run if the branch already has products.
                        </AlertDescription>
                    </Alert>

                    <div className="flex justify-start">
                        <Button 
                            onClick={handleSeed} 
                            disabled={seedingLoading || !activeBranchId}
                        >
                            {seedingLoading ? 'Seeding...' : 'Seed Sample Data'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
             <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Reset Branch Data</CardTitle>
                    <CardDescription>
                        Permanently delete all products, transactions, and promos from the currently active branch.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Danger Zone</AlertTitle>
                        <AlertDescription>
                           This action is irreversible. All data for the branch "{activeBranchName}" will be lost. Customer data will not be affected.
                        </AlertDescription>
                    </Alert>

                    <div className="flex justify-start">
                        <Button
                            variant="destructive"
                            onClick={() => setIsResetAlertOpen(true)}
                            disabled={resettingLoading || !activeBranchId}
                        >
                            {resettingLoading ? 'Resetting...' : 'Reset Branch Data'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all products, transactions, and promos for the branch "{activeBranchName}".
                            <br/><br/>
                            To confirm, please type <strong>RESET</strong> in the box below.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label htmlFor="confirm-reset-text" className="sr-only">Confirm Reset</Label>
                        <Input
                            id="confirm-reset-text"
                            value={resetConfirmText}
                            onChange={(e) => setResetConfirmText(e.target.value)}
                            placeholder='Type "RESET" to confirm'
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReset}
                            disabled={resetConfirmText !== 'RESET' || resettingLoading}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {resettingLoading ? 'Deleting...' : 'Delete All Data'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
