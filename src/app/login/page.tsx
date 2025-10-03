
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
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import { sendEmailVerification } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      // The redirect is handled by the AppShell's useEffect hook.
      // But we check for email verification here to provide immediate feedback.
      if (loggedInUser && !loggedInUser.emailVerified) {
          toast({
              title: "Verifikasi Email Diperlukan",
              description: "Akun Anda belum aktif. Silakan periksa email Anda untuk tautan verifikasi.",
              variant: "destructive",
              duration: 10000,
          });
          // Do not proceed with redirect logic, let the user stay on login page
      }
    } catch (error) {
      console.error("Login failed:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
          switch (error.code) {
              case 'auth/user-not-found':
              case 'auth/wrong-password':
              case 'auth/invalid-credential':
                  description = "Invalid email or password.";
                  break;
              case 'auth/invalid-email':
                  description = "Please enter a valid email address.";
                  break;
              default:
                  description = "An error occurred during login. Please try again."
                  break;
          }
      }
      toast({
        title: "Login Failed",
        description: description,
        variant: "destructive"
      });
    } finally {
        setLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
      setLoading(true);
      try {
        if(user) {
            await sendEmailVerification(user);
            toast({
                title: "Email Verifikasi Terkirim",
                description: "Tautan verifikasi baru telah dikirimkan ke email Anda.",
            });
        } else {
             toast({
                title: "Error",
                description: "Tidak dapat mengirim ulang email. Silakan coba login terlebih dahulu.",
                variant: "destructive"
            });
_
        }
      } catch (error) {
          console.error("Resend verification failed:", error);
           toast({
                title: "Error",
                description: "Gagal mengirim ulang email verifikasi. Silakan coba lagi nanti.",
                variant: "destructive"
            });
      } finally {
          setLoading(false);
      }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <div className='flex justify-center items-center gap-2 mb-4'>
                <Logo className="size-8 text-primary" />
                <h1 className="text-2xl font-bold font-headline">Arus POS</h1>
            </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || authLoading}
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
                disabled={loading || authLoading}
               />
            </div>
            <Button type="submit" className="w-full" disabled={loading || authLoading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
           <div className="mt-4 text-center text-sm space-y-2">
            <p>
                Don't have an account?{' '}
                <Link href="/quick-assessment" className="underline">
                Register
                </Link>
            </p>
             <p>
                Didn't receive verification email?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={handleResendVerification} disabled={loading || authLoading}>
                    Resend
                </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
