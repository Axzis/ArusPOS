
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBusiness } from '@/lib/firestore';
import { useBusiness } from '@/contexts/business-context';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/auth-context';

export default function UnitsPage() {
    const { business, units: initialUnits, loading: loadingBusiness } = useBusiness();
    const { db } = useAuth();
    const [units, setUnits] = useState<string[]>(initialUnits);
    const [newUnit, setNewUnit] = useState('');
    const [saving, setSaving] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setUnits(initialUnits);
    }, [initialUnits]);
    
    const handleAddUnit = () => {
        if (newUnit && !units.includes(newUnit)) {
            const updatedUnits = [...units, newUnit];
            setUnits(updatedUnits);
            setNewUnit('');
        }
    };
    
    const handleDeleteUnit = (unitToRemove: string) => {
        const updatedUnits = units.filter(unit => unit !== unitToRemove);
        setUnits(updatedUnits);
        setUnitToDelete(null);
    };

    const handleSave = async () => {
        if (!business) return;
        setSaving(true);
        try {
            await updateBusiness(db, business.id, { units });
            toast({ title: "Success", description: "Units updated successfully. The app will now reload." });
            // Force a reload to make sure the business context picks up the new units everywhere.
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error("Failed to save units:", error);
            toast({ title: "Error", description: "Could not save units.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify(units) !== JSON.stringify(initialUnits);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Product Units</CardTitle>
                <CardDescription>Add or remove units of measurement for your products (e.g., pcs, kg, liter, box).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Current Units</Label>
                     {units.length > 0 ? (
                        <ul className="space-y-2">
                           {units.map((unit, index) => (
                            <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                               <span>{unit}</span>
                               <Button variant="ghost" size="icon" onClick={() => setUnitToDelete(unit)}>
                                   <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                            </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No units defined yet. Add one to get started.</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Input
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        placeholder="Add new unit"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                    />
                    <Button type="button" onClick={handleAddUnit}>Add Unit</Button>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={saving || !hasChanges}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </CardFooter>

            <AlertDialog open={!!unitToDelete} onOpenChange={() => setUnitToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the unit "{unitToDelete}". Make sure no products are currently using this unit before deleting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUnit(unitToDelete!)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
