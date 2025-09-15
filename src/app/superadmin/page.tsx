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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { getAllBusinesses, addUserAndBusiness } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import CreateBusinessForm from './_components/create-business-form';

type Business = {
    id: string;
    name: string;
    type: string;
    createdAt: {
        toDate: () => Date;
    }
}

export default function SuperAdminPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { toast } = useToast();

    const fetchBusinesses = async () => {
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
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const handleBusinessCreated = () => {
        setIsSheetOpen(false);
        fetchBusinesses();
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center">
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
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : businesses.map(business => (
                                <TableRow key={business.id}>
                                    <TableCell className="font-medium">{business.name}</TableCell>
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
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive">Deactivate</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
