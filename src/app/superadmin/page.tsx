
"use client";
import React, { useState, useEffect, useCallback } from 'react';
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
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { getAllBusinesses, updateBusiness, deleteBusiness } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import CreateBusinessForm from './_components/create-business-form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type Branch = {
    id: string;
    name: string;
    address: string;
    phone: string;
}

type Business = {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    branches: Branch[];
    createdAt: {
        toDate: () => Date;
    }
}

export default function SuperAdminPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
    const [businessToDeactivate, setBusinessToDeactivate] = useState<Business | null>(null);
    const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const { toast } = useToast();

    const fetchBusinesses = useCallback(async () => {
        setLoading(true);
        try {
            const bizData = await getAllBusinesses();
            setBusinesses(bizData as Business[]);
        } catch (error) {
            console.error("Failed to fetch businesses", error);
            toast({ title: "Error", description: "Could not fetch business list.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchBusinesses();
    }, [fetchBusinesses]);

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
            const newStatus = !(businessToDeactivate.isActive !== false);
            await updateBusiness(businessToDeactivate.id, { isActive: newStatus });
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
            await deleteBusiness(businessToDelete.id);
            toast({ title: "Success", description: `Business document for ${businessToDelete.name} has been deleted.` });
            fetchBusinesses(); // Refresh list
        } catch (error) {
            console.error("Failed to delete business:", error);
            toast({ title: "Error", description: "Could not delete the business document.", variant: "destructive" });
        } finally {
            setBusinessToDelete(null);
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm sticky top-14 z-20 md:-mx-6 md:p-6 md:top-[60px]">
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
                                        <Badge variant={business.isActive !== false ? 'default' : 'outline'}>
                                            {business.isActive !== false ? 'Active' : 'Inactive'}
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
                                                    {business.isActive !== false ? 'Deactivate' : 'Activate'}
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
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{selectedBusiness?.name}</SheetTitle>
                        <SheetDescription>
                            Type: {selectedBusiness?.type}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
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
                </SheetContent>
            </Sheet>
            
            {/* Deactivation Alert */}
            <AlertDialog open={!!businessToDeactivate} onOpenChange={(open) => !open && setBusinessToDeactivate(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will {businessToDeactivate?.isActive !== false ? 'deactivate' : 'activate'} the business "{businessToDeactivate?.name}". They may lose access temporarily.
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

        </div>
    )
}
