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
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import SettingsLayout from '../layout';
import { getBusinessWithBranches } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type Branch = {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBranches() {
            try {
                const businessData = await getBusinessWithBranches();
                if (businessData.length > 0) {
                    setBranches(businessData[0].branches as Branch[]);
                }
            } catch (error) {
                console.error("Failed to fetch branches", error);
            } finally {
                setLoading(false);
            }
        }
        fetchBranches();
    }, []);

    return (
        <SettingsLayout>
             <Card>
                <CardHeader>
                     <div className='flex justify-between items-center'>
                        <div>
                            <CardTitle>Branch Management</CardTitle>
                            <CardDescription>Add, edit, or disable your business branches.</CardDescription>
                        </div>
                        <Button size="sm" className="gap-1">
                            <PlusCircle className="h-4 w-4" />
                            Add Branch
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Branch Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : branches.map(branch => (
                                <TableRow key={branch.id}>
                                    <TableCell className="font-medium">{branch.name}</TableCell>
                                    <TableCell>{branch.address}</TableCell>
                                    <TableCell>{branch.phone}</TableCell>
                                    <TableCell>
                                        <Badge variant={branch.isActive ? 'default' : 'destructive'}>
                                            {branch.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                         <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                         </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </SettingsLayout>
    )
}
