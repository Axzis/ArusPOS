
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { getUsers, addUserToBusiness } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FirebaseError } from 'firebase/app';

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
}

const initialFormState = {
    name: '',
    email: '',
    password: '',
    role: 'Staff',
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [newUser, setNewUser] = useState(initialFormState);
    const { toast } = useToast();

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const usersData = await getUsers();
            setUsers(usersData as User[]);
        } catch (error) {
            console.error("Failed to fetch users", error);
             toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setNewUser(prev => ({ ...prev, [id]: value }));
    };

    const handleRoleChange = (value: string) => {
        setNewUser(prev => ({...prev, role: value}));
    };
    
    const handleSaveUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive"});
            return;
        }

        try {
            await addUserToBusiness(newUser);
            toast({ title: "Success", description: `User ${newUser.name} has been added.` });
            setIsSheetOpen(false);
            setNewUser(initialFormState);
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error("Failed to save user:", error);
            let description = "Could not save the new user.";
            if (error instanceof FirebaseError) {
                if (error.code === 'auth/email-already-in-use') {
                    description = "This email is already in use by another account.";
                } else if (error.code === 'auth/weak-password') {
                    description = "The password is too weak. It must be at least 6 characters long.";
                }
            }
            toast({ title: "Error", description: description, variant: "destructive"});
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className='flex justify-between items-center'>
                    <div>
                        <CardTitle>Users & Roles</CardTitle>
                        <CardDescription>Manage who can access your business.</CardDescription>
                    </div>
                     <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button size="sm" className="gap-1">
                                <PlusCircle className="h-4 w-4" />
                                Add User
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                            <SheetTitle>Add New User</SheetTitle>
                            <SheetDescription>
                                Create a new user account and assign them a role. They will be able to log in with the credentials you provide.
                            </SheetDescription>
                            </SheetHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Full Name</Label>
                                    <Input id="name" value={newUser.name} onChange={handleInputChange} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">Email</Label>
                                    <Input id="email" type="email" value={newUser.email} onChange={handleInputChange} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">Password</Label>
                                    <Input id="password" type="password" value={newUser.password} onChange={handleInputChange} className="col-span-3" required placeholder="Min. 6 characters" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="role" className="text-right">Role</Label>
                                    <Select value={newUser.role} onValueChange={handleRoleChange}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Admin">Admin</SelectItem>
                                            <SelectItem value="Staff">Staff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <SheetFooter>
                                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                                <Button type="submit" onClick={handleSaveUser}>Save User</Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" disabled>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 { !loading && users.length === 0 && (
                    <div className="text-center p-10 text-muted-foreground">
                        No additional users found.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
