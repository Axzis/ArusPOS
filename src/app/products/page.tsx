
"use client";
import * as React from 'react';
import Image from 'next/image';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash2
} from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { getProductsForBranch, addProductToBranch, updateProductInBranch, deleteProductFromBranch } from '@/lib/firestore';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBusiness } from '@/contexts/business-context';
import { formatCurrency } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  purchasePrice: number;
  stock: number;
  category: string;
  unit: string;
  imageUrl?: string;
};

export default function ProductsPage() {
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
    const { toast } = useToast();
    const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);
    const { currency, loading: loadingBusiness } = useBusiness();


    React.useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            const branch = JSON.parse(storedBranch);
            setActiveBranchId(branch.id);
        }
    }, []);

    const fetchProducts = React.useCallback(async () => {
        if (!activeBranchId) return;
        setLoading(true);
        try {
            const productsData = await getProductsForBranch(activeBranchId);
            setProducts(productsData as Product[]);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    React.useEffect(() => {
        if(activeBranchId) {
            fetchProducts();
        }
    }, [activeBranchId, fetchProducts]);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Check form validity before showing confirmation
        if (formRef.current?.checkValidity()) {
            setIsSaveConfirmOpen(true);
        } else {
            // Trigger browser's built-in validation UI
            formRef.current?.reportValidity();
        }
    };

    const executeSave = async () => {
        if (!activeBranchId || !formRef.current) return;

        const formData = new FormData(formRef.current);
        const productData = {
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            price: parseFloat(formData.get('price') as string),
            purchasePrice: parseFloat(formData.get('purchasePrice') as string),
            stock: parseInt(formData.get('stock') as string, 10),
            category: formData.get('category') as string,
            unit: formData.get('unit') as string,
            imageUrl: formData.get('imageUrl') as string,
        };

        try {
            if (editingProduct) {
                await updateProductInBranch(activeBranchId, editingProduct.id, productData);
                toast({ title: "Success", description: "Product updated successfully." });
            } else {
                await addProductToBranch(activeBranchId, productData);
                toast({ title: "Success", description: "Product added successfully." });
            }
            fetchProducts();
            closeSheet();
        } catch (error) {
            console.error("Failed to save product:", error);
            toast({ title: "Error", description: "Could not save product.", variant: "destructive" });
        } finally {
            setIsSaveConfirmOpen(false);
        }
    }
    
    const handleDeleteProduct = async (productId: string) => {
        if (!activeBranchId || !window.confirm("Are you sure you want to delete this product?")) return;

        try {
            await deleteProductFromBranch(activeBranchId, productId);
            toast({ title: "Success", description: "Product deleted successfully." });
            fetchProducts();
        } catch (error) {
            console.error("Failed to delete product:", error);
            toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
        }
    };

    const openSheetForEdit = (product: Product) => {
        setEditingProduct(product);
        setIsSheetOpen(true);
    };

    const openSheetForNew = () => {
        setEditingProduct(null);
        setIsSheetOpen(true);
    };
    
    const closeSheet = () => {
        setIsSheetOpen(false);
        setEditingProduct(null);
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const isLoading = loading || loadingBusiness;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm sticky top-[55px] z-20 flex items-center justify-between md:-mx-6 md:p-6 md:top-[71px]">
        <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
            if (!open) {
                // Prevent closing if the alert dialog is open
                if (isSaveConfirmOpen) return;
                closeSheet();
            } else {
                setIsSheetOpen(true);
            }
        }}>
          <SheetTrigger asChild>
            <Button size="sm" className="ml-auto gap-1" onClick={openSheetForNew}>
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col sm:max-w-lg">
            <SheetHeader>
                <SheetTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</SheetTitle>
                <SheetDescription>
                  {editingProduct ? 'Update the details for this product.' : 'Enter the details for the new product.'}
                </SheetDescription>
            </SheetHeader>
             <form ref={formRef} onSubmit={handleFormSubmit} id="product-form" className="flex flex-col flex-grow overflow-hidden">
                <ScrollArea className="flex-grow pr-6">
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" name="name" defaultValue={editingProduct?.name ?? ''} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sku" className="text-right">SKU</Label>
                        <Input id="sku" name="sku" defaultValue={editingProduct?.sku ?? ''} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="category" className="text-right">Category</Label>
                          <Input id="category" name="category" defaultValue={editingProduct?.category ?? ''} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="unit" className="text-right">Unit</Label>
                          <Input id="unit" name="unit" defaultValue={editingProduct?.unit ?? 'pcs'} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">Sale Price</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={editingProduct?.price ?? ''} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="purchasePrice" className="text-right">Purchase Price</Label>
                        <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" defaultValue={editingProduct?.purchasePrice ?? ''} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">Stock</Label>
                        <Input id="stock" name="stock" type="number" defaultValue={editingProduct?.stock ?? ''} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                        <Input id="imageUrl" name="imageUrl" defaultValue={editingProduct?.imageUrl ?? ''} className="col-span-3" placeholder="https://example.com/image.png" />
                      </div>
                  </div>
                </ScrollArea>
                <SheetFooter className="pt-4 mt-auto">
                    <Button type="button" variant="outline" onClick={closeSheet}>Cancel</Button>
                    <Button type="submit">Save changes</Button>
                </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
      
      <AlertDialog open={isSaveConfirmOpen} onOpenChange={setIsSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save the product data to the database. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            Manage products for the current branch.
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="w-full pl-8 sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
              ) : filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image
                      src={product.imageUrl || `https://picsum.photos/seed/${product.id}/40/40`}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="rounded-md object-cover"
                      data-ai-hint="product image"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                   <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{formatCurrency(product.price, currency)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openSheetForEdit(product)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteProduct(product.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className='mr-2 h-4 w-4' /> Delete
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
    </div>
  );
}
