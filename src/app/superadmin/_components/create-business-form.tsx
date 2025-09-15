"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { addUserAndBusiness } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

type CreateBusinessFormProps = {
    onBusinessCreated: () => void;
}

export default function CreateBusinessForm({ onBusinessCreated }: CreateBusinessFormProps) {
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
        await addUserAndBusiness(businessData);
        toast({
            title: "Business Created",
            description: `${businessData.businessName} has been successfully created.`,
        });
        onBusinessCreated();
    } catch (error) {
        console.error("Business creation failed:", error);
        toast({
            title: "Creation Failed",
            description: "Could not create the new business. Please try again.",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
        <form onSubmit={handleSubmit} className="grid gap-6 p-4">
            <h3 className="text-lg font-semibold">Admin User Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="admin-name">Full Name</Label>
                <Input id="admin-name" name="admin-name" placeholder="John Doe" required />
              </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Admin Email</Label>
                    <Input id="email" name="email" type="email" placeholder="admin@mycafe.com" required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="password">Admin Password</Label>
                    <Input id="password" name="password" type="password" required />
                </div>
            </div>

            <Separator />
            <h3 className="text-lg font-semibold">Business Details</h3>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input id="business-name" name="business-name" placeholder="My Awesome Cafe" required />
                </div>
               <div className="grid gap-2">
                    <Label htmlFor="business-type">Business Type</Label>
                    <Input id="business-type" name="business-type" placeholder="e.g., Cafe, Retail" required />
                </div>
            </div>

            <Separator />

            <div className='flex items-center justify-between'>
                <h3 className="text-lg font-semibold">Branch Details</h3>
                <div className="grid gap-2 w-48">
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

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Creating Business...' : 'Create Business'}
            </Button>
          </form>
    </ScrollArea>
  );
}
