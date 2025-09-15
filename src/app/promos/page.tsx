

"use client";
import * as React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { getProductsForBranch, getPromosForBranch, addPromoToBranch, deletePromoFromBranch } from '@/lib/firestore';
import { useBusiness } from '@/contexts/business-context';
import { formatCurrency, cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Product = {
  id: string;
  name: string;
  price: number;
};

type Promo = {
  id: string;
  productId: string;
  productName: string;
  promoPrice: number;
  startDate: string;
  endDate: string;
};

export default function PromosPage() {
    const [promos, setPromos] = React.useState<Promo[]>([]);
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [activeBranchId, setActiveBranchId] = React.useState<string |null>(null);
    const { toast } = useToast();
    const { currency, loading: loadingBusiness } = useBusiness();
    const [promoToDelete, setPromoToDelete] = React.useState<Promo | null>(null);

    // Form state
    const [selectedProductId, setSelectedProductId] = React.useState('');
    const [promoPrice, setPromoPrice] = React.useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

    React.useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            setActiveBranchId(JSON.parse(storedBranch).id);
        }
    }, []);

    const fetchData = React.useCallback(async () => {
        if (!activeBranchId) return;
        setLoading(true);
        try {
            const [promoData, productData] = await Promise.all([
                getPromosForBranch(activeBranchId),
                getProductsForBranch(activeBranchId),
            ]);
            setPromos(promoData as Promo[]);
            setProducts(productData as Product[]);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast({ title: "Error", description: "Could not fetch promos or products.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    React.useEffect(() => {
        if (activeBranchId) {
            fetchData();
        }
    }, [activeBranchId, fetchData]);

    const resetForm = () => {
        setSelectedProductId('');
        setPromoPrice('');
        setDateRange(undefined);
    };

    const handleSavePromo = async () => {
        if (!activeBranchId || !selectedProductId || !promoPrice || !dateRange?.from || !dateRange?.to) {
            toast({ title: "Validation Error", description: "Please fill all fields.", variant: "destructive" });
            return;
        }

        const selectedProduct = products.find(p => p.id === selectedProductId);
        if (!selectedProduct) {
             toast({ title: "Validation Error", description: "Selected product not found.", variant: "destructive" });
            return;
        }

        const promoData = {
            productId: selectedProductId,
            productName: selectedProduct.name,
            originalPrice: selectedProduct.price,
            promoPrice: parseFloat(promoPrice),
            startDate: dateRange.from.toISOString(),
            endDate: dateRange.to.toISOString(),
        };

        try {
            await addPromoToBranch(activeBranchId, promoData);
            toast({ title: "Success", description: "New promotion has been added." });
            fetchData();
            setIsSheetOpen(false);
            resetForm();
        } catch (error) {
            console.error("Failed to save promo:", error);
            toast({ title: "Error", description: "Could not save the new promotion.", variant: "destructive" });
        }
    };
    
    const handleDeletePromo = async () => {
        if (!promoToDelete || !activeBranchId) return;
        try {
            await deletePromoFromBranch(activeBranchId, promoToDelete.id);
            toast({ title: "Success", description: `Promotion for ${promoToDelete.productName} has been deleted.` });
            fetchData();
        } catch (error) {
            console.error("Failed to delete promo:", error);
            toast({ title: "Error", description: "Could not delete promotion.", variant: "destructive" });
        } finally {
            setPromoToDelete(null);
        }
    };

    const getPromoStatus = (promo: Promo): { text: 'Active' | 'Scheduled' | 'Expired', color: string } => {
        const now = new Date();
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);

        if (now < start) return { text: 'Scheduled', color: 'bg-blue-500/20 text-blue-700 border-blue-500/20' };
        if (now > end) return { text: 'Expired', color: 'bg-gray-500/20 text-gray-700 border-gray-500/20' };
        return { text: 'Active', color: 'bg-green-500/20 text-green-700 border-green-500/20' };
    };
    
    const isLoading = loading || loadingBusiness;

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex items-center justify-between md:-mx-6 md:p-6">
                <h1 className="text-lg font-semibold md:text-2xl">Promotions</h1>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm" className="ml-auto gap-1" onClick={() => { resetForm(); setIsSheetOpen(true);}}>
                            <PlusCircle className="h-4 w-4" />
                            Add Promo
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Add New Promotion</SheetTitle>
                            <SheetDescription>
                                Select a product and set a special price for a specific period.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="product" className="text-right">Product</Label>
                                <div className="col-span-3">
                                   <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(product => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="promo-price" className="text-right">Promo Price</Label>
                                <Input id="promo-price" type="number" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Date Range</Label>
                                <div className="col-span-3">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                            ) : (
                                            <span>Pick a date range</span>
                                            )}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                            <Button type="submit" onClick={handleSavePromo}>Save Promo</Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Promo List</CardTitle>
                    <CardDescription>
                        Manage your product promotions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Original Price</TableHead>
                                <TableHead>Promo Price</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                </TableRow>
                                ))
                            ) : promos.map((promo) => {
                                const status = getPromoStatus(promo);
                                const originalProduct = products.find(p => p.id === promo.productId);
                                return (
                                <TableRow key={promo.id}>
                                    <TableCell className="font-medium">{promo.productName}</TableCell>
                                    <TableCell>{formatCurrency(originalProduct?.price ?? 0, currency)}</TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(promo.promoPrice, currency)}</TableCell>
                                    <TableCell>{format(new Date(promo.startDate), "MMM dd, yyyy")}</TableCell>
                                    <TableCell>{format(new Date(promo.endDate), "MMM dd, yyyy")}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(status.color, "hover:bg-opacity-30")}>{status.text}</Badge>
                                    </TableCell>
                                    <TableCell>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onSelect={() => setPromoToDelete(promo)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                     { !isLoading && promos.length === 0 && (
                        <div className="text-center p-10 text-muted-foreground">
                            No promotions found. Add one to get started!
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!promoToDelete} onOpenChange={(open) => !open && setPromoToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the promotion for "{promoToDelete?.productName}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePromo}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    