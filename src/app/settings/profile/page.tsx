
"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { FirebaseError } from 'firebase/app';

export default function MyProfilePage() {
    const { user, updateUserPassword } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
            return;
        }
        if (newPassword.length < 6) {
             toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await updateUserPassword(newPassword);
            toast({ title: "Success", description: "Your password has been updated. Please log in again." });
            // The auth context handles the logout.
        } catch (error) {
            console.error("Failed to update password:", error);
             let description = "An error occurred. You may need to log out and log back in before changing your password.";
             if (error instanceof FirebaseError) {
                if (error.code === 'auth/requires-recent-login') {
                    description = "This action is sensitive and requires recent authentication. Please log out and log back in before trying again.";
                } else if (error.code === 'auth/weak-password') {
                    description = "Password is too weak. Please choose a stronger one.";
                }
             }
            toast({ title: "Password Update Failed", description: description, variant: "destructive" });
        } finally {
            setLoading(false);
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Manage your account settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className='p-4 border rounded-lg bg-card-foreground/5'>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    
                    <div className='space-y-4'>
                        <h3 className="font-medium">Change Password</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
