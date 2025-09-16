
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { AuthError } from 'firebase/auth';

export default function ProfilePage() {
    const { updateUserPassword } = useAuth();
    const { toast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast({
                title: "Error",
                description: "New password and confirmation do not match.",
                variant: "destructive"
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters long.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            await updateUserPassword(currentPassword, newPassword);
            toast({
                title: "Success",
                description: "Your password has been updated successfully."
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Password change failed:", error);
            let description = "An unexpected error occurred.";
            if (error instanceof AuthError) {
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    description = "The current password you entered is incorrect.";
                }
            }
            toast({
                title: "Password Change Failed",
                description: description,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password here.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
