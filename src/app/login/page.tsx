
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


export default function LoginPage() {
  const router = useRouter();
  const { login, sendPasswordReset, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = React.useState('');


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // Redirect is handled by AppShell after successful login
    } catch (error) {
      console.error("Login failed:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error instanceof FirebaseError) {
          switch (error.code) {
              case 'auth/user-not-found':
                  description = "No account found with this email address.";
                  break;
              case 'auth/wrong-password':
                  description = "The password you entered is incorrect.";
                  break;
              case 'auth/invalid-credential':
                  description = "Invalid email or password.";
                  break;
              case 'auth/invalid-email':
                  description = "Please enter a valid email address.";
                  break;
              default:
                  description = `An error occurred: ${error.message}`;
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
  
  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({ title: "Error", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(forgotPasswordEmail);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
      setIsForgotPasswordOpen(false);
      setForgotPasswordEmail('');
    } catch (error) {
      console.error("Forgot password failed:", error);
      toast({
        title: "Error",
        description: "Could not send password reset email. Please try again later.",
        variant: "destructive",
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
             <div className="text-right text-sm">
                <Button type="button" variant="link" className="p-0 h-auto" onClick={() => setIsForgotPasswordOpen(true)}>
                  Forgot Password?
                </Button>
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
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forgot Your Password?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email address below and we'll send you a link to reset your password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forgot-email" className="text-right">
                Email
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="your.email@example.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForgotPassword} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
