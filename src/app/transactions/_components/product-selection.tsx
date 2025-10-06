"use client";

import React from 'react';
import Image from 'next/image';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Grid, List, Search, Barcode, PlusCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  price: number;
  purchasePrice: number;
  stock: number;
  sku: string;
  imageUrl?: string;
  unit: string;
  bundles?: { quantity: number; price: number }[];
};

type ProductWithPromo = Product & {
    originalPrice: number;
    hasPromo: boolean;
}

const ProductListItem = React.memo(({ product, onAddToOrder, currency }: { product: ProductWithPromo, onAddToOrder: (product: ProductWithPromo) => void, currency: string }) => {
  return (
    <div
        className="flex items-center justify-between py-2"
    >
        <div>
            <p className="font-medium">{product.name}</p>
            <div className="text-sm text-muted-foreground">
                {product.hasPromo ? (
                    <>
                        <span className="text-destructive font-semibold">{formatCurrency(product.price, currency)}</span>
                        <span className="line-through ml-2">{formatCurrency(product.originalPrice, currency)}</span>
                         <span className="ml-1">/ {product.unit}</span>
                    </>
                ) : (
                    <span>{formatCurrency(product.price, currency)} / {product.unit}</span>
                )}
            </div>
        </div>
        <Button
        size="icon"
        variant="ghost"
        onClick={() => onAddToOrder(product)}
        disabled={product.stock < 1}
        >
        <PlusCircle className="h-5 w-5" />
        </Button>
    </div>
  );
});
ProductListItem.displayName = 'ProductListItem';

const ProductGridItem = React.memo(({ product, onAddToOrder, currency }: { product: ProductWithPromo, onAddToOrder: (product: ProductWithPromo) => void, currency: string }) => {
  return (
    <Card className={cn("overflow-hidden", product.stock < 1 && "opacity-50")}>
        <button className="w-full text-left" onClick={() => onAddToOrder(product)} disabled={product.stock < 1}>
            <div className="relative aspect-square w-full">
                <Image
                    src={product.imageUrl || `https://picsum.photos/seed/${product.id}/150/150`}
                    alt={product.name}
                    fill
                    className="object-cover"
                    data-ai-hint="product image"
                />
                    {product.stock < 1 && <Badge variant="destructive" className="absolute top-1 left-1">Out of Stock</Badge>}
                    {product.hasPromo && <Badge variant="destructive" className="absolute top-1 right-1">Promo</Badge>}
            </div>
            <div className="p-2">
                <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground">
                        {product.hasPromo ? (
                        <>
                            <span className="text-destructive font-semibold">{formatCurrency(product.price, currency)}</span>
                            <span className="line-through ml-2">{formatCurrency(product.originalPrice, currency)}</span>
                             <span className="ml-1">/ {product.unit}</span>
                        </>
                    ) : (
                        <span>{formatCurrency(product.price, currency)} / {product.unit}</span>
                    )}
                </p>
            </div>
        </button>
    </Card>
  );
});
ProductGridItem.displayName = 'ProductGridItem';


interface ProductSelectionProps {
    productsWithPromo: ProductWithPromo[];
    onAddToOrder: (product: ProductWithPromo) => void;
    isLoading: boolean;
    currency: string;
    scannerEnabled: boolean;
}

export default function ProductSelection({
    productsWithPromo,
    onAddToOrder,
    isLoading,
    currency,
    scannerEnabled
}: ProductSelectionProps) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');

    const filteredProducts = React.useMemo(() => productsWithPromo.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [productsWithPromo, searchTerm]);

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className='flex items-center gap-2'>
                        <CardTitle>Products</CardTitle>
                        {scannerEnabled && <Badge variant="secondary" className="gap-1.5 pl-1.5"><Barcode className="h-3.5 w-3.5" /> On</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                            <List className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                            <Grid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search products..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
                <ScrollArea className="h-[450px]">
                    {viewMode === 'list' && (
                        <div className="p-4 pt-0">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between py-2">
                                        <div>
                                            <Skeleton className="h-5 w-24 mb-1" />
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                        <Skeleton className="h-9 w-9" />
                                    </div>
                                ))
                            ) : filteredProducts.map((product) => (
                            <ProductListItem key={product.id} product={product} onAddToOrder={onAddToOrder} currency={currency} />
                            ))}
                        </div>
                    )}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 pt-0">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <Card key={i}>
                                        <CardContent className="p-2">
                                            <Skeleton className="aspect-square w-full rounded-md" />
                                            <Skeleton className="h-4 w-2/3 mt-2" />
                                            <Skeleton className="h-4 w-1/3 mt-1" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : filteredProducts.map((product) => (
                                <ProductGridItem key={product.id} product={product} onAddToOrder={onAddToOrder} currency={currency} />
                            ))}
                        </div>
                    )}
                    { !isLoading && filteredProducts.length === 0 && (
                        <div className="text-center p-10 text-muted-foreground">
                            No products found.
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}