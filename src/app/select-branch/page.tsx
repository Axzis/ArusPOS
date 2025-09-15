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

type Branch = {
  id: string;
  name: string;
  address: string;
};

type Business = {
    id: string;
    name: string;
    branches: Branch[];
}

export default function SelectBranchPage() {
  const router = useRouter();
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchBusiness() {
      // In a real app, you'd get the business ID from the logged-in user session
      const businesses = await getBusinessWithBranches();
      // For this demo, we'll just take the first business found
      if (businesses.length > 0) {
        setBusiness(businesses[0] as Business);
      }
      setLoading(false);
    }
    fetchBusiness();
  }, []);

  const handleSelectBranch = (branch: Branch) => {
    console.log(`Selected branch: ${branch.name}`);
    // Store selected branch in localStorage to be accessed by AppShell
    localStorage.setItem('activeBranch', JSON.stringify(branch));
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <div className='flex justify-center items-center gap-2 mb-4'>
             <Logo className="size-8 text-primary" />
             <h1 className="text-2xl font-bold font-headline">{loading ? <Skeleton className="h-8 w-40" /> : business?.name}</h1>
          </div>
          <CardTitle className="text-2xl">Select a Branch</CardTitle>
          <CardDescription>
            Choose which branch you want to manage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
              ))
            ) : business?.branches.map((branch) => (
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
            ))}
             { !loading && !business && (
                <p className='text-center text-muted-foreground'>No business found. Please <a href="/quick-assessment" className='underline'>register</a> first.</p>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
