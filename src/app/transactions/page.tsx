

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import { getProductsForBranch, getCustomers, getTransactionsForBranch, addTransactionAndUpdateStock, getPromosForBranch, addCustomer as addNewCustomer, refundTransaction } from '@/lib/firestore';
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
import { format as formatDate, isWithinInterval, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  originalPrice: number;
  unit: string;
  purchasePrice?: number;
};

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

type TransactionStatus = 'Paid' | 'Refunded' | 'Partially Refunded';

type Transaction = {
    id: string;
    customerName: string;
    cashierName?: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    type: 'Sale' | 'Refund';
    items: OrderItem[];
    discount?: number;
    currency: string;
}

type RefundItem = {
    id: string;
    name: string;
    quantity: number;
    price: number;
    originalPrice: number;
    purchasePrice?: number;
    unit: string;
    maxQuantity: number;
}

const ANONYMOUS_CUSTOMER_ID = "anonymous-customer";

const getBestPrice = (product: Product, quantity: number): { price: number, originalPrice: number} => {
    if (!product.bundles || product.bundles.length === 0) {
        return { price: product.price, originalPrice: product.price };
    }

    const sortedBundles = [...product.bundles].sort((a, b) => b.quantity - a.quantity);
    
    for (const bundle of sortedBundles) {
        if (quantity >= bundle.quantity) {
            return { price: bundle.price, originalPrice: product.price };
        }
    }

    return { price: product.price, originalPrice: product.price };
};

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


export default function TransactionsPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [productsWithPromo, setProductsWithPromo] = useState<ProductWithPromo[]>([]);
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
  const [discount, setDiscount] = useState(0);
  const { user } = useAuth();
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState('customer');
  const [filterValue, setFilterValue] = useState('');


  // Refund state
  const [transactionToRefund, setTransactionToRefund] = useState<Transaction | null>(null);
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);

  const fetchData = useCallback(async (branchId: string) => {
    setLoading(true);
    try {
        const [transactionsData, productsData, customersData, promoData] = await Promise.all([
            getTransactionsForBranch(branchId),
            getProductsForBranch(branchId),
            getCustomers(),
            getPromosForBranch(branchId),
        ]);
        
        setTransactions(transactionsData as Transaction[] || []);
        const fetchedCustomers = customersData as Customer[] || [];
        setCustomers(fetchedCustomers);
        const fetchedProducts = productsData as Product[] || [];
        setAllProducts(fetchedProducts);
        const fetchedPromos = promoData as Promo[] || [];
        setPromos(fetchedPromos);

        const now = new Date();
        const activePromos = fetchedPromos.filter(p => isWithinInterval(now, { start: new Date(p.startDate), end: new Date(p.endDate) }));

        const processedProducts = fetchedProducts.map(product => {
            const promo = activePromos.find(p => p.productId === product.id);
            const { price: bestPrice, originalPrice } = getBestPrice(product, 1);
            const finalPrice = promo ? promo.promoPrice : bestPrice;
            
            return {
                ...product,
                originalPrice: originalPrice,
                price: finalPrice,
                hasPromo: !!promo,
            };
        });
        setProductsWithPromo(processedProducts);


    } catch (error) {
        console.error("Failed to load transaction page data:", error);
        toast({ title: "Error", description: "Could not load data for transactions.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const storedBranch = localStorage.getItem('activeBranch');
    const branch = storedBranch ? JSON.parse(storedBranch) : null;
    if (branch?.id) {
        setActiveBranchId(branch.id);
    }
    const scannerPref = localStorage.getItem('barcodeScannerEnabled');
    setScannerEnabled(scannerPref === 'true');
  }, []);

  useEffect(() => {
    if (activeBranchId) {
        fetchData(activeBranchId);
    } else {
        setLoading(false);
    }
  }, [activeBranchId, fetchData]);

  const handlePrintInvoice = (transactionId: string) => {
    window.open(`/print/invoice/${transactionId}`, '_blank');
  };
  
  const updateOrderItemQuantity = useCallback((productId: string, newQuantity: number) => {
    setOrderItems(prevItems => {
        return prevItems.map(item => {
            if (item.id === productId) {
                const product = allProducts.find(p => p.id === productId);
                if (!product) return item;

                const cappedQuantity = Math.max(1, Math.min(newQuantity, item.stock));
                const { price } = getBestPrice(product, cappedQuantity);

                return {
                    ...item,
                    quantity: cappedQuantity,
                    price: price,
                };
            }
            return item;
        });
    });
  }, [allProducts]);

  const addToOrder = useCallback((product: ProductWithPromo) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
          if (existingItem.quantity >= existingItem.stock) {
              toast({ title: "Stock limit reached", description: `Cannot add more ${product.name}.`, variant: "destructive" });
              return prevItems;
          }
        const newQuantity = existingItem.quantity + 1;
        const { price } = getBestPrice(product, newQuantity);
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, price: price }
            : item
        );
      }
       if (product.stock < 1) {
            toast({ title: "Out of Stock", description: `${product.name} is out of stock.`, variant: "destructive" });
            return prevItems;
        }
      const { price, originalPrice } = getBestPrice(product, 1);
      return [...prevItems, { ...product, quantity: 1, price, originalPrice, unit: product.unit }];
    });
  }, [toast, allProducts]);

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

  const removeFromOrder = useCallback((productId: string) => {
    setOrderItems((prevItems) =>
      prevItems.filter((item) => item.id !== productId)
    );
  }, []);

  const clearOrder = () => {
    setOrderItems([]);
    setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
    setDiscount(0);
  };

  const handleChargePayment = async () => {
      if (!activeBranchId || orderItems.length === 0 || !user) return;
      
      setIsProcessing(true);
      try {
          const isAnonymous = selectedCustomerId === ANONYMOUS_CUSTOMER_ID || selectedCustomerId === '';
          const customerId = isAnonymous ? null : selectedCustomerId;
          const selectedCustomer = isAnonymous ? null : customers.find(c => c.id === selectedCustomerId);
          const cashierName = user.displayName || user.email || 'System';


          const transactionData = {
              customerName: selectedCustomer?.name || 'Anonymous',
              amount: total,
              discount: discount,
              status: 'Paid' as TransactionStatus,
              type: 'Sale' as 'Sale' | 'Refund',
              currency: currency || 'USD',
              items: orderItems.map(item => ({ 
                  id: item.id, 
                  name: item.name, 
                  quantity: item.quantity, 
                  price: item.price, 
                  originalPrice: item.originalPrice, 
                  unit: item.unit || '',
                  purchasePrice: item.purchasePrice,
                })),
          };

          await addTransactionAndUpdateStock(activeBranchId, customerId, transactionData, orderItems, cashierName);
          
          toast({ title: "Transaction Successful", description: `Payment of ${formatCurrency(total, currency)} charged.` });
          clearOrder();
          if(activeBranchId) fetchData(activeBranchId);
      } catch (error) {
          console.error("Failed to charge payment:", error);
          toast({ title: "Error", description: "Could not process the payment.", variant: "destructive" });
      } finally {
          setIsProcessing(false);
          setIsConfirming(false);
      }
  };

  const handleOpenRefundDialog = (transaction: Transaction) => {
    setTransactionToRefund(transaction);
    const refundableItems: RefundItem[] = transaction.items.map(item => ({
        ...item,
        quantity: 0, // Start with 0 quantity to refund
        maxQuantity: item.quantity
    }));
    setRefundItems(refundableItems);
  }

  const handleRefundQuantityChange = (itemId: string, quantity: number) => {
    setRefundItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: Math.max(0, Math.min(quantity, item.maxQuantity)) } : item
    ));
  };
  
  const totalRefundAmount = useMemo(() => {
    return refundItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [refundItems]);

  const executeRefund = async () => {
    if (!transactionToRefund || !activeBranchId || !user) return;

    const itemsToRefund = refundItems.filter(item => item.quantity > 0);
    if (itemsToRefund.length === 0) {
        toast({ title: "No Items Selected", description: "Please select a quantity to refund.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    try {
      const cashierName = user.displayName || user.email || 'System';
      await refundTransaction(activeBranchId, transactionToRefund, itemsToRefund, totalRefundAmount, currency, cashierName);
      toast({
        title: "Refund Successful",
        description: `Refund of ${formatCurrency(totalRefundAmount, currency)} processed.`,
      });
      if(activeBranchId) fetchData(activeBranchId); // Refresh data
    } catch (error: any) {
      console.error("Failed to process refund:", error);
      toast({
        title: "Refund Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTransactionToRefund(null);
      setRefundItems([]);
    }
  };

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
    if (!newCustomer.name || !newCustomer.phone || !transactionForRegistration || !activeBranchId) return;
    try {
      await addNewCustomer({ name: newCustomer.name, email: '', phone: newCustomer.phone });
      toast({ title: "Pelanggan Terdaftar", description: `${newCustomer.name} telah berhasil ditambahkan.` });
      fetchData(activeBranchId); 
      generateWhatsAppMessage(transactionForRegistration, newCustomer.phone);
      setIsRegistering(false);
      setNewCustomer({ name: '', phone: '' });
      setTransactionForRegistration(null);
    } catch (error) {
      toast({ title: "Error", description: "Gagal mendaftarkan pelanggan baru.", variant: "destructive" });
    }
  };

  const subtotal = useMemo(() => orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ), [orderItems]);
  
  const tax = useMemo(() => taxEnabled ? subtotal * (taxRate / 100) : 0, [subtotal, taxEnabled, taxRate]);
  const total = useMemo(() => subtotal + tax - discount, [subtotal, tax, discount]);

  const filteredProducts = useMemo(() => productsWithPromo.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [productsWithPromo, searchTerm]);
  
  const isLoading = loading || loadingBusiness;

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    setCurrentPage(1); // Reset to first page on new filter
  };
  
  const handleFilterTypeChange = (type: string) => {
      setFilterType(type);
      setFilterValue('');
      setCurrentPage(1);
  };
  
  const clearFilter = () => {
    setFilterValue('');
    setFilterType('customer');
    setCurrentPage(1);
  };


  const filteredTransactions = useMemo(() => {
    if (!filterValue) return transactions;

    return transactions.filter(transaction => {
        if (filterType === 'customer') {
            return transaction.customerName.toLowerCase().includes(filterValue.toLowerCase());
        }
        if (filterType === 'date') {
            // Compare YYYY-MM-DD strings
            try {
                return formatDate(parseISO(transaction.date), 'yyyy-MM-dd') === filterValue;
            } catch {
                return false;
            }
        }
        if (filterType === 'item') {
            return transaction.items.some(item => item.name.toLowerCase().includes(filterValue.toLowerCase()));
        }
        return true;
    });
  }, [transactions, filterType, filterValue]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(filteredTransactions.length / itemsPerPage) : 1;
  const currentTransactions = useMemo(() => {
    if (itemsPerPage === 0) return filteredTransactions;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const handleItemsPerPageChange = (value: string) => {
    const numValue = parseInt(value, 10);
    setItemsPerPage(isNaN(numValue) ? 0 : numValue);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="flex flex-col gap-6" id="main-content">
       <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6 no-print">
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
                      <TableHead className="w-[100px]">Quantity</TableHead>
                      <TableHead className="hidden sm:table-cell">Unit</TableHead>
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
                          <TableCell>
                            <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateOrderItemQuantity(item.id, parseInt(e.target.value, 10))}
                                min="1"
                                max={item.stock}
                                className="h-8 w-16 text-center"
                            />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{item.unit}</TableCell>
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
                          colSpan={5}
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
                 <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  {taxEnabled && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                        <span>{formatCurrency(tax, currency)}</span>
                    </div>
                  )}
                   <div className="flex justify-between items-center">
                    <Label htmlFor="discount" className="text-muted-foreground">Discount</Label>
                    <Input 
                      id="discount"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="h-8 w-[100px] text-right"
                      placeholder="0"
                    />
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total, currency)}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-2">
            <Button variant="outline" onClick={clearOrder} disabled={isProcessing} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" /> Clear Order
            </Button>
            <Button disabled={orderItems.length === 0 || isProcessing} onClick={() => setIsConfirming(true)} className="w-full sm:w-auto">
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
                          <ProductListItem key={product.id} product={product} onAddToOrder={addToOrder} currency={currency} />
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
                            <ProductGridItem key={product.id} product={product} onAddToOrder={addToOrder} currency={currency} />
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
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardDescription>A list of the most recent sales for this branch.</CardDescription>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Select value={filterType} onValueChange={handleFilterTypeChange}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Filter by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="item">Item</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type={filterType === 'date' ? 'date' : 'text'}
                        placeholder="Search..."
                        value={filterValue}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        className="w-full sm:w-auto"
                    />
                    <Button variant="ghost" onClick={clearFilter}>Clear</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Items</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">User</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                            <TableCell className="flex gap-2 justify-end"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))
                    ) : currentTransactions.map((transaction) => {
                    const itemsSummary = transaction.items?.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'No items';
                    return (
                    <TableRow key={transaction.id}>
                        <TableCell>
                        <div className="font-medium">
                            {transaction.customerName || 'Anonymous'}
                        </div>
                        </TableCell>
                        <TableCell className='max-w-[200px] hidden sm:table-cell whitespace-normal break-words'>{itemsSummary}</TableCell>
                        <TableCell className="hidden md:table-cell">{formatDate(new Date(transaction.date), "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell>
                        <Badge
                             variant={
                                transaction.status === 'Paid' ? 'default'
                                : transaction.status === 'Refunded' ? 'destructive'
                                : 'secondary'
                            }
                        >
                            {transaction.status || 'N/A'}
                        </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{transaction.cashierName}</TableCell>
                        <TableCell
                        className={`text-right ${
                            transaction.type === 'Refund'
                            ? 'text-destructive'
                            : ''
                        }`}
                        >
                        {formatCurrency(transaction.amount || 0, transaction.currency || currency)}
                        </TableCell>
                        <TableCell className='text-right'>
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
                                    <DropdownMenuItem onSelect={() => handlePrintInvoice(transaction.id)}>
                                        <Printer className="mr-2 h-4 w-4" />
                                        Print
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleSendWhatsApp(transaction)}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Send WA
                                    </DropdownMenuItem>
                                    {(transaction.status === 'Paid' || transaction.status === 'Partially Refunded') && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => handleOpenRefundDialog(transaction)} className="text-destructive focus:text-destructive">
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Refund
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    )})}
                </TableBody>
                </Table>
            </div>
             { !isLoading && filteredTransactions.length === 0 && (
                <div className="text-center p-10 text-muted-foreground">
                    No transactions found for this branch or filter.
                </div>
            )}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * (itemsPerPage || 0) + 1, filteredTransactions.length)} to {Math.min(currentPage * (itemsPerPage || filteredTransactions.length), filteredTransactions.length)} of {filteredTransactions.length} transactions.
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="15">15</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="0">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </CardFooter>
      </Card>
      
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to charge {formatCurrency(total, currency)}? This will complete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleChargePayment}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialog open={!!transactionToRefund} onOpenChange={() => setTransactionToRefund(null)}>
            <AlertDialogContent className="sm:max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>Process Refund</AlertDialogTitle>
                    <AlertDialogDescription>
                        Select the quantity of each item to refund. Stock will be restored accordingly.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {transactionToRefund && (
                    <div className="space-y-4">
                       <ScrollArea className="h-64 pr-4">
                            <div className="space-y-4">
                                {refundItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-4 p-2 border rounded-md">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Purchased: {item.maxQuantity} @ {formatCurrency(item.price, currency)}
                                            </p>
                                        </div>
                                        <div className="w-24">
                                            <Label htmlFor={`refund-${item.id}`} className="sr-only">Quantity</Label>
                                            <Input
                                                id={`refund-${item.id}`}
                                                type="number"
                                                min={0}
                                                max={item.maxQuantity}
                                                value={item.quantity}
                                                onChange={(e) => handleRefundQuantityChange(item.id, parseInt(e.target.value, 10))}
                                                className="h-8 text-center"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total Refund:</span>
                            <span>{formatCurrency(totalRefundAmount, currency)}</span>
                        </div>
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={executeRefund} disabled={isProcessing || totalRefundAmount <= 0}>
                        {isProcessing ? 'Refunding...' : 'Confirm Refund'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      
      <AlertDialog open={isRegistering} onOpenChange={setIsRegistering}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Daftarkan Pelanggan Baru</AlertDialogTitle>
            <AlertDialogDescription>
              Masukkan detail pelanggan untuk mendaftar dan mengirim struk via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nama</Label>
              <Input id="name" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">No. WhatsApp</Label>
              <Input id="phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} className="col-span-3" placeholder="628123456789" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegisterAndSend}>Daftar & Kirim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



    


      
