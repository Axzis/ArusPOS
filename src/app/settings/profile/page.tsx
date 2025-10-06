
"use client";

import React, { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ImageUploadDialog } from '@/components/image-upload-dialog';
import { updateUserProfile } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const { user, loading: authLoading, updateUserPassword, refreshUser } = useAuth();
    const { toast } = useToast();
    
    // State for password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // State for profile picture change
    const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
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

        setPasswordLoading(true);
        try {
            await updateUserPassword(currentPassword, newPassword);
            toast({
                title: "Success",
                description: "Your password has been updated successfully."
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Password change failed:", error);
            let description = "An unexpected error occurred.";
            if (error && typeof error === 'object' && 'code' in error) {
                const firebaseError = error as { code: string };
                if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
                    description = "The current password you entered is incorrect.";
                }
            }
            toast({
                title: "Password Change Failed",
                description: description,
                variant: "destructive"
            });
        } finally {
            setPasswordLoading(false);
        }
    };
    
    const handlePhotoSave = async () => {
        if (!newPhotoUrl || !user) return;
        setPhotoLoading(true);
        try {
            await updateUserProfile(user.uid, { photoURL: newPhotoUrl });
            await refreshUser(); // Refresh user data from context to update UI everywhere
            toast({
                title: "Success",
                description: "Your profile picture has been updated."
            });
            setNewPhotoUrl(null);
        } catch(error) {
            console.error("Failed to update photo:", error);
            toast({
                title: "Update Failed",
                description: "Could not save your new profile picture.",
                variant: "destructive"
            });
        } finally {
            setPhotoLoading(false);
        }
    };
    
    const isLoading = authLoading;

    return (
        <div className="grid gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Pengguna</CardTitle>
                    <CardDescription>Ini adalah detail akun Anda. Email tidak dapat diubah.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Nama Lengkap</Label>
                                <Input id="displayName" value={user?.displayName || user?.email || ''} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" value={user?.email || ''} disabled />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Foto Profil</CardTitle>
                    <CardDescription>Perbarui foto profil Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-24 w-24 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-40" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={newPhotoUrl || user?.photoURL || `https://picsum.photos/seed/${user?.uid}/96/96`} alt={user?.email || 'User'} />
                                <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                             <div className="flex flex-col gap-2 items-center sm:items-start">
                                <ImageUploadDialog onImageSelect={setNewPhotoUrl}>
                                    <Button variant="outline">Ubah Foto</Button>
                                </ImageUploadDialog>
                                {newPhotoUrl && (
                                    <div className="flex gap-2">
                                        <Button onClick={handlePhotoSave} disabled={photoLoading}>
                                            {photoLoading ? 'Menyimpan...' : 'Simpan Foto'}
                                        </Button>
                                        <Button variant="ghost" onClick={() => setNewPhotoUrl(null)}>Batal</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Ganti Password</CardTitle>
                    <CardDescription>Perbarui password akun Anda di sini.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Password Saat Ini</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                disabled={passwordLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">Password Baru</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={passwordLoading}
                                placeholder="Minimal 6 karakter"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={passwordLoading}
                            />
                        </div>
                        <Button type="submit" disabled={passwordLoading}>
                            {passwordLoading ? 'Memperbarui...' : 'Perbarui Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
