
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
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import { createAuthUser } from '@/lib/firestore';
import { useAuth } from '@/contexts/auth-context';

export default function SuperAdminRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useAuth();
  const [email, setEmail] = React.useState('arus.superadmin@gmail.com');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAuthUser(auth, email, password);
      toast({
        title: "Registration Successful",
        description: "Superadmin account created. You can now log in.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Registration failed:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
          switch (error.code) {
              case 'auth/email-already-in-use':
                  description = "This email is already registered. Please try logging in.";
                  break;
              case 'auth/weak-password':
                  description = "Password is too weak. Please use at least 6 characters.";
                  break;
              default:
                  description = "An error occurred during registration."
                  break;
          }
      }
      toast({
        title: "Registration Failed",
        description: description,
        variant: "destructive"
      });
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <div className='flex justify-center items-center gap-2 mb-4'>
                <Logo className="size-8 text-primary" />
                <h1 className="text-2xl font-bold font-headline">Arus POS</h1>
            </div>
          <CardTitle className="text-2xl">Superadmin Registration</CardTitle>
          <CardDescription>
            Create a new standalone superadmin user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="superadmin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
               />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Create Superadmin'}
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
