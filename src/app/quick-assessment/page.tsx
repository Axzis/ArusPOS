
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { addUserAndBusiness } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';

export default function QuickAssessmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [branchCount, setBranchCount] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  const handleBranchCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value, 10);
    setBranchCount(count > 0 ? count : 1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const branches = [];
    for (let i = 0; i < branchCount; i++) {
      const name = formData.get(`branch-name-${i}`) as string;
      const address = formData.get(`branch-address-${i}`) as string;
      const phone = formData.get(`branch-phone-${i}`) as string;
      if (name && address && phone) {
        branches.push({ name, address, phone });
      }
    }

    const businessData = {
      adminName: formData.get('admin-name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      businessName: formData.get('business-name') as string,
      businessType: formData.get('business-type') as string,
      branches: branches,
    };

    try {
        console.log('Creating user and business:', businessData);
        await addUserAndBusiness(businessData);

        toast({
            title: "Registration Successful",
            description: "Your business has been created. Please check your email to verify your account and then log in.",
            duration: 10000,
        });

        router.push('/login');

    } catch (error) {
        console.error("Registration failed:", error);
        let description = "Could not create your business. Please try again.";
         if (error instanceof FirebaseError) {
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered. Please try logging in.";
            } else if (error.code === 'auth/weak-password') {
                description = "Password is too weak. Please choose a stronger password.";
            }
        }
        toast({
            title: "Registration Failed",
            description: description,
            variant: "destructive",
        });
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4">
      <Card className="mx-auto max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Logo className="size-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">Arus POS</h1>
          </div>
          <CardTitle className="text-2xl">Quick Assessment</CardTitle>
          <CardDescription>
            Register your business to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-name">Full Name</Label>
                <Input id="admin-name" name="admin-name" placeholder="John Doe" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input id="business-name" name="business-name" placeholder="My Awesome Cafe" required />
              </div>
            </div>

             <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="admin@mycafe.com" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required placeholder="Min. 6 characters" />
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
               <div className="grid gap-2">
                    <Label htmlFor="business-type">Business Type</Label>
                    <Input id="business-type" name="business-type" placeholder="e.g., Cafe, Retail" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="branch-count">Number of Branches</Label>
                    <Input
                    id="branch-count"
                    name="branch-count"
                    type="number"
                    min="1"
                    value={branchCount}
                    onChange={handleBranchCountChange}
                    required
                    />
                </div>
            </div>
            
            <Separator />

            <h3 className="text-lg font-semibold">Branch Details</h3>

            <div className="grid gap-6">
              {Array.from({ length: branchCount }, (_, i) => (
                <div key={i} className="grid gap-4 border p-4 rounded-lg">
                    <h4 className="font-medium">Branch {i + 1}</h4>
                    <div className="grid gap-2">
                        <Label htmlFor={`branch-name-${i}`}>Branch Name</Label>
                        <Input id={`branch-name-${i}`} name={`branch-name-${i}`} placeholder="Main Outlet" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`branch-address-${i}`}>Branch Address</Label>
                        <Input id={`branch-address-${i}`} name={`branch-address-${i}`} placeholder="123 Main St, Anytown" required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor={`branch-phone-${i}`}>Branch Phone</Label>
                        <Input id={`branch-phone-${i}`} name={`branch-phone-${i}`} placeholder="555-1234" required />
                    </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Complete Registration'}
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
