
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, KeyRound, Ban } from 'lucide-react';
import { getAllBusinesses, updateBusiness, deleteBusiness } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import CreateBusinessForm from './_components/create-business-form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context';
import { isSuperAdminUser } from '@/lib/config';

type Branch = {
    id: string;
    name: string;
    address: string;
    phone: string;
}

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
}

type Business = {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    branches: Branch[];
    users: User[];
    createdAt: {
        toDate: () => Date;
    }
}

export default function SuperAdminPage() {
    const { user, loading: authLoading, db } = useAuth();
    const router = useRouter();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
    const [businessToDeactivate, setBusinessToDeactivate] = useState<Business | null>(null);
    const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const { toast } = useToast();
    const { sendPasswordReset } = useAuth();

    const isSuperAdmin = user?.email ? isSuperAdminUser(user.email) : false;

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, isSuperAdmin, router]);


    const fetchBusinesses = useCallback(async () => {
        if (!isSuperAdmin) return;
        setLoading(true);
        try {
            const bizData = await getAllBusinesses(db);
            setBusinesses(bizData as Business[]);
        } catch (error) {
            console.error("Failed to fetch businesses", error);
            toast({ title: "Error", description: "Could not fetch business list.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast, isSuperAdmin, db]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchBusinesses();
        } else {
            setLoading(false);
        }
    }, [fetchBusinesses, isSuperAdmin]);

    const handleBusinessCreated = () => {
        setIsSheetOpen(false);
        fetchBusinesses();
    }
    
    const handleViewDetails = (business: Business) => {
        setSelectedBusiness(business);
        setIsDetailSheetOpen(true);
    }
    
    const executeDeactivation = async () => {
        if (!businessToDeactivate) return;
        
        try {
            const newStatus = !businessToDeactivate.isActive;
            await updateBusiness(db, businessToDeactivate.id, { isActive: newStatus });
            toast({ title: "Success", description: `Business ${businessToDeactivate.name} has been ${newStatus ? 'activated' : 'deactivated'}.` });
            fetchBusinesses(); // Refresh list
        } catch (error) {
            console.error("Failed to update business status:", error);
            toast({ title: "Error", description: "Could not update business status.", variant: "destructive" });
        } finally {
            setBusinessToDeactivate(null);
        }
    }
    
    const executeDelete = async () => {
        if (!businessToDelete) return;
        
        try {
            await deleteBusiness(db, businessToDelete.id);
            toast({ title: "Success", description: `Business document for ${businessToDelete.name} has been deleted.` });
            fetchBusinesses(); // Refresh list
        } catch (error) {
            console.error("Failed to delete business:", error);
            toast({ title: "Error", description: "Could not delete the business document.", variant: "destructive" });
        } finally {
            setBusinessToDelete(null);
        }
    }
    
    const executePasswordReset = async () => {
        if (!userToReset) return;
        
        try {
            await sendPasswordReset(userToReset.email);
            toast({ title: "Success", description: `Password reset email sent to ${userToReset.email}.` });
        } catch (error) {
            console.error("Failed to send password reset email:", error);
            toast({ title: "Error", description: "Could not send password reset email.", variant: "destructive" });
        } finally {
            setUserToReset(null);
        }
    }

    if (authLoading || !isSuperAdmin) {
        return (
            <Card className="mx-auto w-full max-w-7xl">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                        <Ban className='text-destructive' /> Access Denied
                    </CardTitle>
                    <CardDescription>
                        Redirecting... You do not have permission to view this page.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }


    return (
        <div className="flex flex-col gap-6 mx-auto w-full max-w-7xl">
            <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm md:-mx-6 md:p-6">
                <h1 className="text-lg font-semibold md:text-2xl">Super Admin</h1>
            </div>
            <Card>
                <CardHeader>
                        <div className='flex justify-between items-center'>
                        <div>
                            <CardTitle>Business Management</CardTitle>
                            <CardDescription>Create new POS instances and manage existing ones.</CardDescription>
                        </div>
                         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button size="sm" className="gap-1">
                                    <PlusCircle className="h-4 w-4" />
                                    Create New Business
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="sm:max-w-2xl">
                                <SheetHeader>
                                    <SheetTitle>Create New Business</SheetTitle>
                                    <SheetDescription>
                                        Fill out the form to generate a new, isolated POS instance.
                                    </SheetDescription>
                                </SheetHeader>
                               <CreateBusinessForm onBusinessCreated={handleBusinessCreated} />
                            </SheetContent>
                        </Sheet>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Business Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Business Type</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : businesses.map(business => (
                                <TableRow key={business.id}>
                                    <TableCell className="font-medium">{business.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={business.isActive ? 'default' : 'outline'}>
                                            {business.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{business.type}</TableCell>
                                    <TableCell>{business.createdAt?.toDate().toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => handleViewDetails(business)}>View Details</DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onSelect={() => setBusinessToDeactivate(business)}
                                                >
                                                    {business.isActive ? 'Deactivate' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    onSelect={() => setBusinessToDelete(business)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* View Details Sheet */}
            <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
                <SheetContent className="sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>{selectedBusiness?.name}</SheetTitle>
                        <SheetDescription>
                            Type: {selectedBusiness?.type}
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-8rem)]">
                        <div className="py-4 pr-6 space-y-8">
                            <div>
                                <h4 className="mb-4 text-lg font-semibold">Branches</h4>
                                <div className="space-y-4">
                                    {selectedBusiness?.branches?.map(branch => (
                                        <Card key={branch.id}>
                                            <CardHeader>
                                                <CardTitle className="text-base">{branch.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-sm text-muted-foreground">
                                                <p>{branch.address}</p>
                                                <p>{branch.phone}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    { !selectedBusiness?.branches?.length && <p className="text-sm text-muted-foreground">No branches found for this business.</p>}
                                </div>
                            </div>
                            
                            <Separator />

                            <div>
                                <h4 className="mb-4 text-lg font-semibold">Users</h4>
                                <Card>
                                    <CardContent className="p-0">
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
                                                {selectedBusiness?.users?.map(user => (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium">{user.name}</TableCell>
                                                        <TableCell>{user.email}</TableCell>
                                                        <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setUserToReset(user)}>
                                                                <KeyRound className="h-4 w-4" />
                                                                <span className="sr-only">Reset Password</span>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                         { !selectedBusiness?.users?.length && <p className="p-4 text-sm text-center text-muted-foreground">No users found for this business.</p>}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
            
            {/* Deactivation Alert */}
            <AlertDialog open={!!businessToDeactivate} onOpenChange={(open) => !open && setBusinessToDeactivate(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will {businessToDeactivate?.isActive ? 'deactivate' : 'activate'} the business "{businessToDeactivate?.name}". They may lose access temporarily.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={executeDeactivation}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Delete Alert */}
            <AlertDialog open={!!businessToDelete} onOpenChange={(open) => !open && setBusinessToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Business "{businessToDelete?.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the business document. 
                        <br/><br/>
                        <strong className='text-destructive-foreground'>Important:</strong> This will NOT delete sub-collections like branches, products, or transactions. For a full data wipe, you must use a Firebase Cloud Function or do it manually in the Firebase console.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className='bg-destructive hover:bg-destructive/90' onClick={executeDelete}>Delete Anyway</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             {/* Password Reset Alert */}
            <AlertDialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Reset Password?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will send a password reset email to "{userToReset?.email}". The user will be able to set a new password by following the link in the email.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={executePasswordReset}>Send Email</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
