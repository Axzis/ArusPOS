
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function LoginPage() {
  const router = useRouter();
  const { login, sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [resetEmail, setResetEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // The redirect is now handled by the AppShell's useEffect hook
      // which waits for the auth state to be confirmed.
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
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ title: "Email Required", description: "Please enter your email address.", variant: "destructive" });
        return;
    }
    setLoading(true);
    try {
        await sendPasswordReset(resetEmail);
        toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions to reset your password." });
        setIsResetDialogOpen(false);
        setResetEmail('');
    } catch (error) {
        console.error("Password reset failed:", error);
         toast({ title: "Error", description: "Could not send password reset email. Please check the email address.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
       <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email address below, and we'll send you a link to reset your password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reset-email" className="text-right">
                Email
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="m@example.com"
                className="col-span-3"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordReset} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                 <Button
                    type="button"
                    variant="link"
                    className="ml-auto inline-block text-sm underline"
                    onClick={() => setIsResetDialogOpen(true)}
                  >
                    Forgot password?
                  </Button>
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
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
