"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getBusinessWithBranches } from '@/lib/firestore';
import { Building, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

type Branch = {
  id: string;
  name: string;
  address: string;
};

type Business = {
    id: string;
    name: string;
    isActive: boolean;
    branches: Branch[];
}

export default function SelectBranchPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Don't fetch until auth state is resolved and we have a user
    if (authLoading || !user) {
        return;
    }

    async function fetchBusiness() {
      try {
        const businesses = await getBusinessWithBranches();
        if (businesses.length > 0) {
          setBusiness(businesses[0] as Business);
        } else {
            // This case can happen if the user's business doc is missing or they have no businessId
            setError("Your user account is not associated with a business. Please contact support or register a new business.");
        }
      } catch (e) {
          console.error("Failed to fetch business:", e);
          setError("An error occurred while fetching business data.");
      } finally {
          setLoading(false);
      }
    }
    fetchBusiness();
  }, [user, authLoading]);

  const handleSelectBranch = (branch: Branch) => {
    console.log(`Selected branch: ${branch.name}`);
    localStorage.setItem('activeBranch', JSON.stringify(branch));
    router.push('/dashboard');
  };

  const hasActiveBranches = business && business.branches && business.branches.length > 0;
  const isBusinessInactive = business && business.isActive === false;
  const isLoading = loading || authLoading;

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <div className='flex justify-center items-center gap-2 mb-4'>
             <Logo className="size-8 text-primary" />
             <h1 className="text-2xl font-bold font-headline">{isLoading ? <Skeleton className="h-8 w-40" /> : business?.name}</h1>
          </div>
          <CardTitle className="text-2xl">Select a Branch</CardTitle>
          <CardDescription>
            {isBusinessInactive 
                ? "This business is currently inactive. Please contact support."
                : "Choose which branch you want to manage."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
              ))
            ) : error ? (
                <p className='text-center text-destructive p-4 border border-destructive/50 bg-destructive/10 rounded-md'>
                    {error}
                 </p>
            ) : hasActiveBranches ? (
                business.branches.map((branch) => (
                <button
                    key={branch.id}
                    onClick={() => handleSelectBranch(branch)}
                    className="flex items-center justify-between text-left p-4 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors w-full"
                >
                    <div className="flex items-center gap-4">
                        <Building className="h-6 w-6 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">{branch.name}</p>
                            <p className="text-sm text-muted-foreground">{branch.address}</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                ))
            ) : (
                 <p className='text-center text-muted-foreground p-4 border rounded-md'>
                    { isBusinessInactive 
                        ? "This business is inactive and has no available branches."
                        : "No active branches available for this business."
                    }
                 </p>
            )}
             { !isLoading && !business && !error && (
                 <p className='text-center text-muted-foreground p-4 border rounded-md'>
                     No business found for your account. Please <Link href="/quick-assessment" className='underline'>register</Link> a new one.
                 </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
