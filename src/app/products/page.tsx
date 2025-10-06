
"use client";
import * as React from 'react';
import Image from 'next/image';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash2,
  Upload,
  Download,
  X,
  Camera,
  Image as ImageIcon
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
import { getProductsForBranch, addProductToBranch, updateProductInBranch, deleteProductFromBranch, upsertProductsBySku } from '@/lib/firestore';
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
import ExcelImport from '@/components/excel-import';
import { utils, writeFile } from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ImageUploadDialog } from '@/components/image-upload-dialog';
import { useAuth } from '@/contexts/auth-context';


type Bundle = {
  quantity: number;
  price: number;
};

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
  bundles?: Bundle[];
};

export default function ProductsPage() {
    const { businessId } = useAuth();
    const [products, setProducts] = React.useState<Product[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isSheetOpen, setIsSheetOpen] = React.useState(false);
    const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
    const { toast } = useToast();
    const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = React.useState(false);
    const formRef = React.useRef<HTMLFormElement>(null);
    const { currency, units, loading: loadingBusiness } = useBusiness();
    const [productBundles, setProductBundles] = React.useState<Bundle[]>([]);
    const [productImageUrl, setProductImageUrl] = React.useState<string>('');


    React.useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            const branch = JSON.parse(storedBranch);
            setActiveBranchId(branch.id);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProducts = React.useCallback(async () => {
        if (!activeBranchId || !businessId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const productsData = await getProductsForBranch(businessId, activeBranchId);
            setProducts(productsData as Product[]);
        } catch (error) {
            console.error("Failed to fetch products:", error);
            toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, businessId, toast]);

    React.useEffect(() => {
        if(activeBranchId && businessId) {
            fetchProducts();
        }
    }, [activeBranchId, businessId, fetchProducts]);

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (formRef.current?.checkValidity()) {
            setIsSaveConfirmOpen(true);
        } else {
            formRef.current?.reportValidity();
        }
    };

    const executeSave = async () => {
        if (!activeBranchId || !businessId || !formRef.current) return;

        const formData = new FormData(formRef.current);
        const productData = {
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            price: parseFloat(formData.get('price') as string),
            purchasePrice: parseFloat(formData.get('purchasePrice') as string),
            stock: parseInt(formData.get('stock') as string, 10),
            category: formData.get('category') as string,
            unit: formData.get('unit') as string,
            imageUrl: productImageUrl,
            bundles: productBundles.filter(b => b.quantity > 0 && b.price > 0),
        };

        try {
            if (editingProduct) {
                await updateProductInBranch(businessId, activeBranchId, editingProduct.id, productData);
                toast({ title: "Success", description: "Product updated successfully." });
            } else {
                await addProductToBranch(businessId, activeBranchId, productData);
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
    
    const executeDelete = async () => {
        if (!productToDelete || !activeBranchId || !businessId) return;

        try {
            await deleteProductFromBranch(businessId, activeBranchId, productToDelete.id);
            toast({ title: "Success", description: "Product deleted successfully." });
            fetchProducts();
        } catch (error) {
            console.error("Failed to delete product:", error);
            toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
        } finally {
            setProductToDelete(null);
        }
    };

    const handleDownloadTemplate = () => {
        const template = [{
            name: 'Sample Coffee',
            sku: 'SKU-001',
            category: 'Beverages',
            unit: 'pcs',
            price: 3.50,
            purchasePrice: 1.50,
            stock: 100,
            imageUrl: 'https://example.com/image.png'
        }];
        const ws = utils.json_to_sheet(template);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Products");
        writeFile(wb, "product_template.xlsx");
    };

    const handleImport = async (data: any[]) => {
        if (!activeBranchId || !businessId) {
            toast({ title: "Error", description: "No active branch selected.", variant: "destructive" });
            return;
        }
        try {
            const result = await upsertProductsBySku(businessId, activeBranchId, data);
            toast({
                title: "Import Successful",
                description: `${result.updated} products updated, ${result.inserted} new products added.`,
            });
            fetchProducts();
        } catch (error: any) {
            toast({
                title: "Import Failed",
                description: error.message || "An unexpected error occurred during import.",
                variant: "destructive"
            });
        }
    }
    
    const handleDownload = () => {
        const ws = utils.json_to_sheet(filteredProducts.map(p => ({
            name: p.name,
            sku: p.sku,
            category: p.category,
            unit: p.unit,
            price: p.price,
            purchasePrice: p.purchasePrice,
            stock: p.stock,
            imageUrl: p.imageUrl
        })));
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Products");
        writeFile(wb, "products.xlsx");
    };

    const openSheetForEdit = (product: Product) => {
        setEditingProduct(product);
        setProductBundles(product.bundles || []);
        setProductImageUrl(product.imageUrl || '');
        setIsSheetOpen(true);
    };

    const openSheetForNew = () => {
        setEditingProduct(null);
        setProductBundles([]);
        setProductImageUrl('');
        setIsSheetOpen(true);
    };
    
    const closeSheet = () => {
        setIsSheetOpen(false);
        setEditingProduct(null);
        setProductBundles([]);
        setProductImageUrl('');
    }

    const handleBundleChange = (index: number, field: keyof Bundle, value: string) => {
        const newBundles = [...productBundles];
        newBundles[index] = { ...newBundles[index], [field]: parseFloat(value) || 0 };
        setProductBundles(newBundles);
    };

    const addBundle = () => {
        setProductBundles([...productBundles, { quantity: 0, price: 0 }]);
    };

    const removeBundle = (index: number) => {
        const newBundles = productBundles.filter((_, i) => i !== index);
        setProductBundles(newBundles);
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const isLoading = loading || loadingBusiness;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
        <div className="flex items-center gap-2">
            <ExcelImport 
                onImport={handleImport}
                requiredFields={['name', 'sku', 'category', 'unit', 'price', 'purchasePrice', 'stock']}
            >
                <Button size="sm" variant="outline" className="gap-1">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                </Button>
            </ExcelImport>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadTemplate}>
                 <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Template</span>
            </Button>
            <Sheet open={isSheetOpen} onOpenChange={(open) => {
                if (!open) {
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
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="name" className="md:text-right md:pt-2">Name</Label>
                                <Input id="name" name="name" defaultValue={editingProduct?.name ?? ''} className="md:col-span-3" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="sku" className="md:text-right md:pt-2">SKU</Label>
                                <Input id="sku" name="sku" defaultValue={editingProduct?.sku ?? ''} className="md:col-span-3" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="category" className="md:text-right md:pt-2">Category</Label>
                                <Input id="category" name="category" defaultValue={editingProduct?.category ?? ''} className="md:col-span-3" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="unit" className="md:text-right md:pt-2">Unit</Label>
                                <Select name="unit" defaultValue={editingProduct?.unit ?? units[0]}>
                                    <SelectTrigger className="md:col-span-3">
                                        <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((unit, i) => (
                                            <SelectItem key={i} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="price" className="md:text-right md:pt-2">Sale Price</Label>
                                <Input id="price" name="price" type="number" step="0.01" defaultValue={editingProduct?.price ?? ''} className="md:col-span-3" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="purchasePrice" className="md:text-right md:pt-2">Purchase Price</Label>
                                <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" defaultValue={editingProduct?.purchasePrice ?? ''} className="md:col-span-3" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label htmlFor="stock" className="md:text-right md:pt-2">Stock</Label>
                                <Input id="stock" name="stock" type="number" defaultValue={editingProduct?.stock ?? ''} className="md:col-span-3" required />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                                <Label className="md:text-right md:pt-2">Image</Label>
                                <div className="md:col-span-3 space-y-2">
                                    <div className="aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                                      {productImageUrl ? (
                                        <Image src={productImageUrl} alt="Product preview" width={200} height={112} className="object-cover" />
                                      ) : (
                                        <ImageIcon className="text-muted-foreground" size={32} />
                                      )}
                                    </div>
                                    <ImageUploadDialog onImageSelect={setProductImageUrl}>
                                       <Button type="button" variant="outline">
                                          <Upload className="mr-2 h-4 w-4" />
                                          Upload Image
                                        </Button>
                                    </ImageUploadDialog>
                                </div>
                            </div>

                            <Separator />
                            
                            <div>
                                <Label>Harga Bundel</Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Tawarkan harga khusus untuk pembelian dalam jumlah tertentu.
                                </p>
                                <div className="space-y-4">
                                    {productBundles.map((bundle, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Kuantitas"
                                                value={bundle.quantity || ''}
                                                onChange={(e) => handleBundleChange(index, 'quantity', e.target.value)}
                                            />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="Harga per item"
                                                value={bundle.price || ''}
                                                onChange={(e) => handleBundleChange(index, 'price', e.target.value)}
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeBundle(index)}>
                                                <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addBundle}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Tambah Harga Bundel
                                    </Button>
                                </div>
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

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Delete</AlertDialogAction>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">SKU</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
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
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                  ))
                ) : filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
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
                    <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                    <TableCell className="hidden sm:table-cell">
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
                          <DropdownMenuItem onSelect={() => setProductToDelete(product)} className="text-destructive focus:text-destructive">
                              <Trash2 className='mr-2 h-4 w-4' /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

