
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  Search,
  Trash2,
  X,
  List,
  Grid,
  Barcode,
  Printer,
  MessageSquare,
} from 'lucide-react';
import { getProductsForBranch, getCustomers, getTransactionsForBranch, addTransactionAndUpdateStock, getPromosForBranch, addCustomer as addNewCustomer } from '@/lib/firestore';
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
import { isWithinInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  originalPrice: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  imageUrl?: string;
};

type Promo = {
  id: string;
  productId: string;
  promoPrice: number;
  startDate: string;
  endDate: string;
}

type Customer = {
    id: string;
    name: string;
    phone?: string;
};

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: OrderItem[];
}

const ANONYMOUS_CUSTOMER_ID = "anonymous-customer";


const PrintableInvoice = React.forwardRef<HTMLDivElement, { transaction: Transaction | null, currency: string }>(({ transaction, currency }, ref) => {
    if (!transaction) return null;

    const subtotal = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return (
        <div ref={ref} className="print-invoice">
            <Card>
                <CardHeader className='text-center'>
                    <CardTitle>Invoice</CardTitle>
                    <CardDescription>#{transaction.id.substring(0, 8)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 text-sm">
                            <div>
                                <p className="font-medium">Billed To</p>
                                <p>{transaction.customerName}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">Date</p>
                                <p>{new Date(transaction.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Separator />
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transaction.items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.price * item.quantity, currency)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Separator />
                         <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span>{formatCurrency(transaction.amount - subtotal, currency)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(transaction.amount, currency)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex-col gap-2 text-center text-xs text-muted-foreground">
                    <p>Thank you for your business!</p>
                    <p>Arus POS</p>
                </CardFooter>
            </Card>
        </div>
    );
});
PrintableInvoice.displayName = 'PrintableInvoice';


export default function TransactionsPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(ANONYMOUS_CUSTOMER_ID);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { currency, taxEnabled, taxRate, loading: loadingBusiness } = useBusiness();
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const { toast } = useToast();
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [transactionForRegistration, setTransactionForRegistration] = useState<Transaction | null>(null);
  const [transactionToPrint, setTransactionToPrint] = useState<Transaction | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedBranch = localStorage.getItem('activeBranch');
    if (storedBranch) {
        const branch = JSON.parse(storedBranch);
        setActiveBranchId(branch.id);
    }
    const scannerPref = localStorage.getItem('barcodeScannerEnabled');
    setScannerEnabled(scannerPref === 'true');
  }, []);

  const fetchData = useCallback(async () => {
    if (!activeBranchId) return;
    setLoading(true);
    try {
        const [transactionsData, productsData, customersData, promoData] = await Promise.all([
            getTransactionsForBranch(activeBranchId),
            getProductsForBranch(activeBranchId),
            getCustomers(),
            getPromosForBranch(activeBranchId),
        ]);
        setTransactions(transactionsData as Transaction[]);
        setAllProducts(productsData as Product[]);
        setCustomers(customersData as Customer[]);
        setPromos(promoData as Promo[]);
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
  
  const productsWithPromo = useMemo(() => {
    const now = new Date();
    const activePromos = promos.filter(p => isWithinInterval(now, { start: new Date(p.startDate), end: new Date(p.endDate) }));

    return allProducts.map(product => {
        const promo = activePromos.find(p => p.productId === product.id);
        return {
            ...product,
            originalPrice: product.price,
            price: promo ? promo.promoPrice : product.price,
            hasPromo: !!promo
        };
    });
  }, [allProducts, promos]);


  const addToOrder = useCallback((product: Product & { originalPrice: number }) => {
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
  }, [toast]);

  useEffect(() => {
    if (!scannerEnabled) return;

    let barcode = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (event: KeyboardEvent) => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.getAttribute('role') === 'combobox')) {
            return;
        }
        
        const currentTime = Date.now();
        if (currentTime - lastKeyTime > 100) {
            barcode = '';
        }
        
        if (event.key === 'Enter') {
            if (barcode.length > 2) {
                const product = productsWithPromo.find(p => p.sku === barcode);
                if (product) {
                    addToOrder(product);
                    toast({
                        title: "Product Added",
                        description: `${product.name} was added to the order.`,
                    });
                } else {
                     toast({
                        title: "Product Not Found",
                        description: `No product found with SKU: ${barcode}`,
                        variant: "destructive"
                    });
                }
            }
            barcode = '';
        } else if (event.key.length === 1) {
            barcode += event.key;
        }

        lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scannerEnabled, productsWithPromo, addToOrder, toast]);

  const removeFromOrder = (productId: string) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  };

  const clearOrder = () => {
    setOrderItems([]);
    setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
  };

  const handleChargePayment = async () => {
      if (!activeBranchId || orderItems.length === 0) return;
      
      setIsProcessing(true);
      try {
          const isAnonymous = selectedCustomerId === ANONYMOUS_CUSTOMER_ID || selectedCustomerId === '';
          const customerId = isAnonymous ? null : selectedCustomerId;
          const selectedCustomer = isAnonymous ? null : customers.find(c => c.id === selectedCustomerId);

          const transactionData = {
              customerName: selectedCustomer?.name || 'Anonymous',
              amount: total,
              status: 'Paid' as 'Paid' | 'Refunded',
              type: 'Sale' as 'Sale' | 'Refund',
              items: orderItems.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price, originalPrice: item.originalPrice })),
          };

          await addTransactionAndUpdateStock(activeBranchId, customerId, transactionData, orderItems);
          
          toast({ title: "Transaction Successful", description: `Payment of ${formatCurrency(total, currency)} charged.` });
          clearOrder();
          fetchData();
      } catch (error) {
          console.error("Failed to charge payment:", error);
          toast({ title: "Error", description: "Could not process the payment.", variant: "destructive" });
      } finally {
          setIsProcessing(false);
          setIsConfirming(false);
      }
  };

  const handlePrintInvoice = (transaction: Transaction) => {
    setTransactionToPrint(transaction);
  };

  useEffect(() => {
    if (transactionToPrint) {
        // Wait for state to update the DOM, then print
        const timer = setTimeout(() => {
            window.print();
            setTransactionToPrint(null); // Reset after printing
        }, 100); // A small delay is often necessary
        return () => clearTimeout(timer);
    }
  }, [transactionToPrint]);


  const generateWhatsAppMessage = (transaction: Transaction, customerPhone: string) => {
    const itemsText = transaction.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
    const message = `Halo! Terima kasih atas pembelian Anda. Berikut adalah detail transaksi Anda:\n\n*Total:* ${formatCurrency(transaction.amount, currency)}\n*Item:* ${itemsText}\n\nTerima kasih telah berbelanja!`;
    const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendWhatsApp = (transaction: Transaction) => {
    if (transaction.customerName === 'Anonymous') {
      setTransactionForRegistration(transaction);
      setIsRegistering(true);
    } else {
      const customer = customers.find(c => c.name === transaction.customerName);
      if (customer?.phone) {
        generateWhatsAppMessage(transaction, customer.phone);
      } else {
        toast({
          title: "Nomor Telepon Tidak Ditemukan",
          description: `Pelanggan ${customer?.name} tidak memiliki nomor telepon terdaftar.`,
          variant: "destructive"
        });
      }
    }
  };

  const handleRegisterAndSend = async () => {
    if (!newCustomer.name || !newCustomer.phone || !transactionForRegistration) return;
    try {
      await addNewCustomer({ name: newCustomer.name, email: '', phone: newCustomer.phone });
      toast({ title: "Pelanggan Terdaftar", description: `${newCustomer.name} telah berhasil ditambahkan.` });
      fetchData(); 
      generateWhatsAppMessage(transactionForRegistration, newCustomer.phone);
      setIsRegistering(false);
      setNewCustomer({ name: '', phone: '' });
      setTransactionForRegistration(null);
    } catch (error) {
      toast({ title: "Error", description: "Gagal mendaftarkan pelanggan baru.", variant: "destructive" });
    }
  };

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const tax = taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + tax;

  const filteredProducts = productsWithPromo.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const isLoading = loading || loadingBusiness;


  return (
    <div className="flex flex-col gap-6" id="main-content">
       <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm md:-mx-6 md:p-6 no-print">
        <h1 className="text-lg font-semibold md:text-2xl">Transactions</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 no-print">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Transaction</CardTitle>
            <CardDescription>
              Add products to the order and process the payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select a customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value={ANONYMOUS_CUSTOMER_ID}>Anonymous</SelectItem>
                      {customers.map(customer => (
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
                            {item.price < item.originalPrice && (
                                <Badge variant="destructive" className="ml-2">Promo</Badge>
                            )}
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
                        <div
                            key={product.id}
                            className="flex items-center justify-between py-2"
                        >
                            <div>
                                <p className="font-medium">{product.name}</p>
                                <div className="text-sm text-muted-foreground">
                                    {product.hasPromo ? (
                                        <>
                                            <span className="text-destructive font-semibold">{formatCurrency(product.price, currency)}</span>
                                            <span className="line-through ml-2">{formatCurrency(product.originalPrice, currency)}</span>
                                        </>
                                    ) : (
                                        <span>{formatCurrency(product.price, currency)}</span>
                                    )}
                                </div>
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
                                         {product.hasPromo && <Badge variant="destructive" className="absolute top-1 right-1">Promo!</Badge>}
                                    </div>
                                    <div className="p-2">
                                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                        <div className="text-xs text-muted-foreground">
                                             {product.hasPromo ? (
                                                <>
                                                    <span className="text-destructive font-semibold">{formatCurrency(product.price, currency)}</span>
                                                    <span className="line-through ml-2">{formatCurrency(product.originalPrice, currency)}</span>
                                                </>
                                            ) : (
                                                <span>{formatCurrency(product.price, currency)}</span>
                                            )}
                                        </div>
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
      <Card className="no-print">
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
                <TableHead>Actions</TableHead>
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
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
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
                  <TableCell>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handlePrintInvoice(transaction)}>
                            <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleSendWhatsApp(transaction)}>
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    </div>
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

        <AlertDialog open={isRegistering} onOpenChange={setIsRegistering}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Register New Customer</AlertDialogTitle>
              <AlertDialogDescription>
                This transaction was for an anonymous customer. To send an invoice via WhatsApp, please register them first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  placeholder="e.g., 6281234567890"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsRegistering(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRegisterAndSend}>Register & Send</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <PrintableInvoice ref={invoiceRef} transaction={transactionToPrint} currency={currency} />

    </div>
  );
}
