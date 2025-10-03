
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

function ImageUploadDialog({ onImageSelect }: { onImageSelect: (url: string) => void }) {
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isCameraOpen) {
      setCapturedImage(null);
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      };
      getCameraPermission();
    } else {
      // Stop camera stream when component is not open
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOpen]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // In a real app, you would upload the file and get a URL.
        // For now, we'll use the Base64 data URI as a placeholder.
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedImage(dataUrl);
        setIsCameraOpen(false); // Close camera view
      }
    }
  };
  
  const handleConfirmCapturedImage = () => {
      if(capturedImage) {
          onImageSelect(capturedImage);
          setCapturedImage(null);
      }
  }

  return (
    <Dialog onOpenChange={(open) => !open && setIsCameraOpen(false)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pilih Sumber Gambar</DialogTitle>
          <DialogDescription>
            Unggah file gambar dari perangkat Anda atau gunakan kamera untuk mengambil foto baru.
          </DialogDescription>
        </DialogHeader>

        {isCameraOpen ? (
          <div className="space-y-4">
             {hasCameraPermission === false ? (
                 <Alert variant="destructive">
                    <Camera className="h-4 w-4" />
                    <AlertTitle>Izin Kamera Ditolak</AlertTitle>
                    <AlertDescription>
                        Mohon izinkan akses kamera di pengaturan browser Anda untuk menggunakan fitur ini.
                    </AlertDescription>
                </Alert>
             ) : (
                <>
                    <div className="bg-muted rounded-md overflow-hidden aspect-video flex items-center justify-center">
                         <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                         <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <Button onClick={handleCapture} className="w-full">
                        <Camera className="mr-2 h-4 w-4" /> Ambil Gambar
                    </Button>
                </>
             )}
              <Button variant="outline" onClick={() => setIsCameraOpen(false)} className="w-full">Kembali</Button>
          </div>
        ) : capturedImage ? (
             <div className="space-y-4">
                <p className="text-sm font-medium">Pratinjau Gambar:</p>
                <div className="bg-muted rounded-md overflow-hidden aspect-video flex items-center justify-center">
                    <Image src={capturedImage} alt="Captured preview" width={400} height={225} className="object-contain"/>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCapturedImage(null)} className="w-full">Ambil Ulang</Button>
                    <Button onClick={handleConfirmCapturedImage} className="w-full">Konfirmasi Gambar</Button>
                </div>
            </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-8 w-8" />
              <span>Unggah File</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsCameraOpen(true)}>
              <Camera className="h-8 w-8" />
              <span>Gunakan Kamera</span>
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}


export default function ProductsPage() {
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
        if (formRef.current?.checkValidity()) {
            setIsSaveConfirmOpen(true);
        } else {
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
            imageUrl: productImageUrl,
            bundles: productBundles.filter(b => b.quantity > 0 && b.price > 0),
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
    
    const executeDelete = async () => {
        if (!productToDelete || !activeBranchId) return;

        try {
            await deleteProductFromBranch(activeBranchId, productToDelete.id);
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
        if (!activeBranchId) {
            toast({ title: "Error", description: "No active branch selected.", variant: "destructive" });
            return;
        }
        try {
            const result = await upsertProductsBySku(activeBranchId, data);
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
      <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex items-center justify-between md:-mx-6 md:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Products</h1>
        <div className="flex items-center gap-2">
            <ExcelImport 
                onImport={handleImport}
                requiredFields={['name', 'sku', 'category', 'unit', 'price', 'purchasePrice', 'stock']}
            >
                <Button size="sm" variant="outline" className="gap-1">
                    <Upload className="h-4 w-4" />
                    Import
                </Button>
            </ExcelImport>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Export
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadTemplate}>
                Template
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
                                <Select name="unit" defaultValue={editingProduct?.unit ?? units[0]}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map((unit, i) => (
                                            <SelectItem key={i} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Sale Price</Label>
                                <Input id="price" name="price" type="number" step="0.01" defaultValue={editingProduct?.price ?? ''} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="purchasePrice" className="text-right">Purchase Price</Label>
                                <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" defaultValue={editingProduct?.purchasePrice ?? ''} className=" col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">Stock</Label>
                                <Input id="stock" name="stock" type="number" defaultValue={editingProduct?.stock ?? ''} className="col-span-3" required />
                            </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">Image</Label>
                                <div className="col-span-3 space-y-2">
                                    <div className="aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                                      {productImageUrl ? (
                                        <Image src={productImageUrl} alt="Product preview" width={200} height={112} className="object-cover" />
                                      ) : (
                                        <ImageIcon className="text-muted-foreground" size={32} />
                                      )}
                                    </div>
                                    <ImageUploadDialog onImageSelect={setProductImageUrl} />
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
        </CardContent>
      </Card>
    </div>
  );
}
    
