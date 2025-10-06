
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import OrderSummary from './_components/order-summary';
import ProductSelection from './_components/product-selection';
import RecentTransactions from './_components/recent-transactions';
import RefundDialog from './_components/refund-dialog';
import ConfirmationDialogs from './_components/confirmation-dialogs';

import {
  getProductsForBranch,
  getCustomers,
  getTransactionsForBranch,
  addTransactionAndUpdateStock,
  getPromosForBranch,
  addCustomer,
  refundTransaction,
} from '@/lib/firestore';

import { useBusiness } from '@/contexts/business-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { isWithinInterval, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

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
    originalTransactionId?: string;
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

const getBestPrice = (product: Product | ProductWithPromo, quantity: number): { price: number, originalPrice: number} => {
    if ('hasPromo' in product && product.hasPromo) {
        return { price: product.price, originalPrice: product.originalPrice };
    }

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

export default function TransactionsPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(ANONYMOUS_CUSTOMER_ID);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [transactionForRegistration, setTransactionForRegistration] = useState<Transaction | null>(null);
  const [discount, setDiscount] = useState(0);
  
  const [transactionToRefund, setTransactionToRefund] = useState<Transaction | null>(null);
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);
  
  const { currency, taxEnabled, taxRate, loading: loadingBusiness, paperSize } = useBusiness();
  const { toast } = useToast();
  const { user, businessId } = useAuth();


  const fetchData = useCallback(async (busId: string, branchId: string) => {
    setLoading(true);
    try {
        const [transactionsData, productsData, customersData, promoData] = await Promise.all([
            getTransactionsForBranch(busId, branchId),
            getProductsForBranch(busId, branchId),
            getCustomers(busId),
            getPromosForBranch(busId, branchId),
        ]);
        
        setTransactions((transactionsData as Transaction[] || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setCustomers(customersData as Customer[] || []);
        setAllProducts(productsData as Product[] || []);
        setPromos(promoData as Promo[] || []);

    } catch (error) {
        console.error("Failed to load transaction page data:", error);
        toast({ title: "Error", description: "Could not load data for transactions.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
    const generateInvoiceHtml = (transaction: Transaction) => {
        const subtotal = transaction.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const transactionDiscount = transaction.discount || 0;
        const tax = transaction.amount + transactionDiscount - subtotal;
        const transactionCurrency = transaction.currency || 'Rp';

        const getPaperWidthClass = () => {
            switch (paperSize) {
                case '5.8cm': return 'width: 58mm;';
                case '8cm': return 'width: 80mm;';
                case 'A4':
                default: return 'width: 210mm;';
            }
        };

        const numberFormatter = new Intl.NumberFormat('id-ID');

        const itemsHtml = transaction.items.map(item => `
            <tr>
                <td style="padding: 2px 4px; vertical-align: top; word-break: break-word;">${item.name}</td>
                <td style="padding: 2px 4px; vertical-align: top; text-align: center;">${item.unit}</td>
                <td style="padding: 2px 4px; vertical-align: top; text-align: center;">${item.quantity}</td>
                <td style="padding: 2px 4px; vertical-align: top; text-align: right;">${numberFormatter.format(item.price)}</td>
                <td style="padding: 2px 4px; vertical-align: top; text-align: right;">${numberFormatter.format(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        return `
            <html>
                <head>
                    <title>Invoice #${transaction.id.substring(0, 8)}</title>
                    <style>
                        body { font-family: monospace; font-size: 10px; }
                        .invoice-box { ${getPaperWidthClass()} margin: auto; padding: 10px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
                        table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .my-2 { margin-top: 8px; margin-bottom: 8px; }
                        .separator { border-top: 1px dashed #ccc; }
                    </style>
                </head>
                <body>
                    <div class="invoice-box">
                        <div class="text-center">
                            <h2 style="font-size: 14px; margin: 0;">Invoice</h2>
                            <p>#${transaction.id.substring(0, 8)}</p>
                        </div>
                        <div style="margin-top: 10px;">
                            <p><strong>Billed To:</strong> ${transaction.customerName}</p>
                            <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}</p>
                            ${transaction.cashierName ? `<p><strong>Cashier:</strong> ${transaction.cashierName}</p>` : ''}
                        </div>
                        <hr class="my-2 separator">
                        <table>
                            <thead>
                                <tr>
                                    <th style="padding: 2px 4px;">Product</th>
                                    <th style="padding: 2px 4px; text-align: center;">Unit</th>
                                    <th style="padding: 2px 4px; text-align: center;">Qty</th>
                                    <th style="padding: 2px 4px; text-align: right;">Price</th>
                                    <th style="padding: 2px 4px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <hr class="my-2 separator">
                        <div>
                            <p><span>Subtotal:</span> <span style="float: right;">${formatCurrency(subtotal, transactionCurrency)}</span></p>
                            ${tax > 0 ? `<p><span>Tax:</span> <span style="float: right;">${formatCurrency(tax, transactionCurrency)}</span></p>` : ''}
                            ${transactionDiscount > 0 ? `<p><span>Discount:</span> <span style="float: right;">-${formatCurrency(transactionDiscount, transactionCurrency)}</span></p>` : ''}
                            <hr class="my-2 separator">
                            <p class="font-bold" style="font-size: 12px;"><span>Total:</span> <span style="float: right;">${formatCurrency(transaction.amount, transactionCurrency)}</span></p>
                        </div>
                        <div class="text-center" style="margin-top: 20px; font-size: 9px;">
                            <p>Thank you for your business!</p>
                            <p>Arus POS</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const handlePrintInvoice = (transaction: Transaction) => {
        const htmlContent = generateInvoiceHtml(transaction);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        } else {
            toast({
                title: "Print Error",
                description: "Could not open a new window for printing. Please check your browser's pop-up settings.",
                variant: "destructive",
            });
        }
    };


  const productsWithPromo = useMemo(() => {
    if (loading) return [];
    
    const now = new Date();
    const activePromos = promos.filter(p => isWithinInterval(now, { start: new Date(p.startDate), end: new Date(p.endDate) }));

    return allProducts.map(product => {
        const promo = activePromos.find(p => p.productId === product.id);
        const { price, originalPrice } = getBestPrice(product, 1);
        const finalPrice = promo ? promo.promoPrice : price;
        
        return {
            ...product,
            originalPrice: product.price,
            price: finalPrice,
            hasPromo: !!promo || finalPrice < product.price,
        };
    });
  }, [allProducts, promos, loading]);


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
    if (activeBranchId && businessId) {
        fetchData(businessId, activeBranchId);
    } else {
        setLoading(false);
    }
  }, [activeBranchId, businessId, fetchData]);

  const updateOrderItemQuantity = useCallback((productId: string, newQuantity: number) => {
    setOrderItems(prevItems => {
        const itemToUpdate = prevItems.find(item => item.id === productId);
        const productInfo = productsWithPromo.find(p => p.id === productId);
        if (!itemToUpdate || !productInfo) return prevItems;

        let cappedQuantity = Math.max(1, newQuantity);

        if (cappedQuantity > itemToUpdate.stock) {
            cappedQuantity = itemToUpdate.stock;
            toast({
                title: "Stock limit reached",
                description: `Quantity for ${itemToUpdate.name} set to max available (${itemToUpdate.stock}).`,
                variant: 'destructive',
            });
        }
        
        const { price, originalPrice } = getBestPrice(productInfo, cappedQuantity);

        return prevItems.map(item => 
            item.id === productId 
                ? { ...item, quantity: cappedQuantity, price: price, originalPrice: originalPrice }
                : item
        );
    });
  }, [productsWithPromo, toast]);


  const addToOrder = useCallback((product: ProductWithPromo) => {
    setOrderItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
          if (existingItem.quantity >= existingItem.stock) {
              toast({ title: "Stock limit reached", description: `Cannot add more ${product.name}.`, variant: "destructive" });
              return prevItems;
          }
        const newQuantity = existingItem.quantity + 1;
        const { price, originalPrice } = getBestPrice(product, newQuantity);

        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, price: price, originalPrice: originalPrice }
            : item
        );
      }
       if (product.stock < 1) {
            toast({ title: "Out of Stock", description: `${product.name} is out of stock.`, variant: "destructive" });
            return prevItems;
        }
        
      const { price, originalPrice } = getBestPrice(product, 1);
      return [...prevItems, { ...product, quantity: 1, price: price, originalPrice: originalPrice, unit: product.unit }];
    });
  }, [toast, productsWithPromo]);


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
      if (!activeBranchId || !businessId || orderItems.length === 0 || !user) return;
      
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
              currency: currency || 'Rp',
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

          await addTransactionAndUpdateStock(businessId, activeBranchId, customerId, transactionData, orderItems, cashierName);
          
          toast({ title: "Transaction Successful", description: `Payment of ${formatCurrency(total, currency)} charged.` });
          clearOrder();
          if(activeBranchId && businessId) fetchData(businessId, activeBranchId);
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
    
    const previousRefunds = transactions.filter(t => t.type === 'Refund' && t.originalTransactionId === transaction.id);
    
    const refundedQuantities: { [key: string]: number } = {};
    previousRefunds.forEach(refund => {
        refund.items.forEach(item => {
            refundedQuantities[item.id] = (refundedQuantities[item.id] || 0) + item.quantity;
        });
    });

    const refundableItems: RefundItem[] = transaction.items.map(item => {
        const alreadyRefunded = refundedQuantities[item.id] || 0;
        const maxQuantity = item.quantity - alreadyRefunded;
        return {
            ...item,
            quantity: 0,
            maxQuantity: maxQuantity > 0 ? maxQuantity : 0
        }
    }).filter(item => item.maxQuantity > 0);

    if (refundableItems.length === 0) {
        toast({ title: "No Items to Refund", description: "All items in this transaction have already been fully refunded.", variant: "default" });
        setTransactionToRefund(null);
        return;
    }

    setRefundItems(refundableItems);
  }

  const handleRefundQuantityChange = (itemId: string, quantity: number) => {
    setRefundItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: Math.max(0, Math.min(quantity, item.maxQuantity)) } : item
    ));
  };

  const executeRefund = async () => {
    if (!transactionToRefund || !activeBranchId || !businessId || !user) return;

    const itemsToRefund = refundItems.filter(item => item.quantity > 0);
    if (itemsToRefund.length === 0) {
        toast({ title: "No Items Selected", description: "Please select a quantity to refund.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    try {
      const cashierName = user.displayName || user.email || 'System';
      const totalRefundAmount = refundItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      await refundTransaction(businessId, activeBranchId, transactionToRefund, itemsToRefund, totalRefundAmount, currency, cashierName);
      toast({
        title: "Refund Successful",
        description: `Refund of ${formatCurrency(totalRefundAmount, currency)} processed.`,
      });
      if(activeBranchId && businessId) fetchData(businessId, activeBranchId);
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

  const handleRegisterAndSend = async (newCustomer: {name: string, phone: string}) => {
    if (!newCustomer.name || !newCustomer.phone || !transactionForRegistration || !businessId) return;
    try {
      await addCustomer(businessId, { name: newCustomer.name, email: '', phone: newCustomer.phone });
      toast({ title: "Pelanggan Terdaftar", description: `${newCustomer.name} telah berhasil ditambahkan.` });
      if (activeBranchId && businessId) fetchData(businessId, activeBranchId); 
      generateWhatsAppMessage(transactionForRegistration, newCustomer.phone);
      setIsRegistering(false);
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
  
  const isLoadingData = loading || loadingBusiness;

  return (
    <div className="flex flex-col gap-6" id="main-content">
       <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6 no-print">
        <h1 className="text-lg font-semibold md:text-2xl">Transactions</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 no-print">
        <OrderSummary 
          orderItems={orderItems}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onCustomerChange={setSelectedCustomerId}
          onUpdateQuantity={updateOrderItemQuantity}
          onRemoveItem={removeFromOrder}
          onClearOrder={clearOrder}
          onCharge={() => setIsConfirming(true)}
          subtotal={subtotal}
          tax={tax}
          total={total}
          discount={discount}
          onDiscountChange={setDiscount}
          currency={currency}
          taxEnabled={taxEnabled}
          taxRate={taxRate}
          isProcessing={isProcessing}
          anonymousCustomerId={ANONYMOUS_CUSTOMER_ID}
        />

        <ProductSelection
          productsWithPromo={productsWithPromo}
          onAddToOrder={addToOrder}
          isLoading={isLoadingData}
          currency={currency}
          scannerEnabled={scannerEnabled}
        />
      </div>

      <RecentTransactions
        transactions={transactions}
        isLoading={isLoadingData}
        currency={currency}
        onPrint={handlePrintInvoice}
        onSendWhatsApp={handleSendWhatsApp}
        onOpenRefundDialog={handleOpenRefundDialog}
      />
      
      <ConfirmationDialogs
        isConfirming={isConfirming}
        onConfirmingChange={setIsConfirming}
        onConfirmCharge={handleChargePayment}
        chargeAmount={total}
        currency={currency}
        isRegistering={isRegistering}
        onRegisteringChange={setIsRegistering}
        onRegisterAndSend={handleRegisterAndSend}
      />
      
      <RefundDialog
        transactionToRefund={transactionToRefund}
        onClose={() => setTransactionToRefund(null)}
        refundItems={refundItems}
        onRefundQuantityChange={handleRefundQuantityChange}
        onExecuteRefund={executeRefund}
        isProcessing={isProcessing}
        currency={currency}
      />

    </div>
  );
}
