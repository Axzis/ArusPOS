"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  Search,
  Trash2,
  X,
  List,
  Grid
} from 'lucide-react';
import { getProductsForBranch, getCustomers, getTransactionsForBranch, addTransactionAndUpdateStock } from '@/lib/firestore';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusiness } from '@/contexts/business-context';
import { formatCurrency, cn } from '@/lib/utils';
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
import { useToast } from '@/hooks/use-toast';


type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
};

type Customer = {
    id: string;
    name: string;
};

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
}

export default function TransactionsPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currency, taxEnabled, taxRate, loading: loadingBusiness } = useBusiness();
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const { toast } = useToast();


  useEffect(() => {
    const storedBranch = localStorage.getItem('activeBranch');
    if (storedBranch) {
        const branch = JSON.parse(storedBranch);
        setActiveBranchId(branch.id);
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!activeBranchId) return;
    setLoading(true);
    try {
        const [transactionsData, productsData, customersData] = await Promise.all([
            getTransactionsForBranch(activeBranchId),
            getProductsForBranch(activeBranchId),
            getCustomers(),
        ]);
        setTransactions(transactionsData as Transaction[]);
        setAllProducts(productsData as Product[]);
        setCustomers(customersData as Customer[]);
    } catch (error) {
        console.error("Failed to load transaction page data:", error);
        toast({ title: "Error", description: "Could not load data for transactions.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
}, [activeBranchId, toast]);

  useEffect(() => {
    if (activeBranchId) {
        fetchData();
    }
  }, [activeBranchId, fetchData]);


  const addToOrder = (product: Product) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
          if (existingItem.quantity >= existingItem.stock) {
              toast({ title: "Stock limit reached", description: `Cannot add more ${product.name}.`, variant: "destructive" });
              return prevItems;
          }
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
       if (product.stock < 1) {
            toast({ title: "Out of Stock", description: `${product.name} is out of stock.`, variant: "destructive" });
            return prevItems;
        }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromOrder = (productId: string) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const clearOrder = () => {
    setOrderItems([]);
    setSelectedCustomer(null);
  };

  const handleChargePayment = async () => {
      if (!activeBranchId || orderItems.length === 0) return;
      
      setIsProcessing(true);
      try {
          const transactionData = {
              customerName: selectedCustomer?.name || 'Anonymous',
              amount: total,
              status: 'Paid' as 'Paid' | 'Refunded',
              type: 'Sale' as 'Sale' | 'Refund',
              items: orderItems.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
          };

          await addTransactionAndUpdateStock(activeBranchId, transactionData, orderItems);
          
          toast({ title: "Transaction Successful", description: `Payment of ${formatCurrency(total, currency)} charged.` });
          clearOrder();
          fetchData(); // Refresh recent transactions
      } catch (error) {
          console.error("Failed to charge payment:", error);
          toast({ title: "Error", description: "Could not process the payment.", variant: "destructive" });
      } finally {
          setIsProcessing(false);
          setIsConfirming(false);
      }
  };


  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;

  const filteredProducts = allProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const isLoading = loading || loadingBusiness;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Transaction</CardTitle>
            <CardDescription>
              Add products to the order and process the payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Select onValueChange={(value) => {
                  const cust = customers.find(c => c.id === value);
                  setSelectedCustomer(cust || null);
              }} value={selectedCustomer?.id || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="w-0"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.length > 0 ? (
                      orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.price * item.quantity, currency)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromOrder(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No items in order
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {orderItems.length > 0 && (
                <div className="flex flex-col items-end gap-2 text-sm">
                  <div className="flex w-full max-w-xs justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  {taxEnabled && (
                    <div className="flex w-full max-w-xs justify-between">
                        <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                        <span>{formatCurrency(tax, currency)}</span>
                    </div>
                  )}
                  <Separator className="my-1 w-full max-w-xs" />
                  <div className="flex w-full max-w-xs justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total, currency)}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-2">
            <Button variant="outline" onClick={clearOrder} disabled={isProcessing}>
              <X className="mr-2 h-4 w-4" /> Clear Order
            </Button>
            <Button disabled={orderItems.length === 0 || isProcessing} onClick={() => setIsConfirming(true)}>
                {isProcessing ? 'Processing...' : 'Charge Payment'}
            </Button>
          </CardFooter>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
                 <CardTitle>Products</CardTitle>
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
                        <div
                            key={product.id}
                            className="flex items-center justify-between py-2"
                        >
                            <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatCurrency(product.price, currency)}
                            </p>
                            </div>
                            <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => addToOrder(product)}
                            disabled={product.stock < 1}
                            >
                            <PlusCircle className="h-5 w-5" />
                            </Button>
                        </div>
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
                            <Card key={product.id} className={cn("overflow-hidden", product.stock < 1 && "opacity-50")}>
                                <button className="w-full text-left" onClick={() => addToOrder(product)} disabled={product.stock < 1}>
                                    <div className="relative aspect-square w-full">
                                        <Image
                                            src={product.imageUrl || `https://picsum.photos/seed/${product.id}/150/150`}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                            data-ai-hint="product image"
                                        />
                                         {product.stock < 1 && <Badge variant="destructive" className="absolute top-1 left-1">Out of Stock</Badge>}
                                    </div>
                                    <div className="p-2">
                                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(product.price, currency)}</p>
                                    </div>
                                </button>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="font-medium">
                      {transaction.customerName}
                    </div>
                  </TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === 'Paid'
                          ? 'default'
                          : 'destructive'
                      }
                      className={
                        transaction.status === 'Paid'
                          ? 'bg-green-500/20 text-green-700 border-green-500/20 hover:bg-green-500/30'
                          : ''
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      transaction.type === 'Refund' ? 'text-destructive' : ''
                    }`}
                  >
                    {formatCurrency(Math.abs(transaction.amount), currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to charge {formatCurrency(total, currency)}? This will complete the transaction and update stock levels.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleChargePayment} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Confirm'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
