
"use client";
import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  LineChart as LineChartIcon
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getTransactionsForBranch, getCustomers } from '@/lib/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/contexts/business-context';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';


const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});


const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
};

type TransactionItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    purchasePrice?: number;
};

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: TransactionItem[];
}

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  avatar: string;
  createdAt: { toDate: () => Date };
};


export default function DashboardPage() {
    const [transactions, setTransactions] = React.useState<Transaction[]>([]);
    const [customers, setCustomers] = React.useState<Customer[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null);
    const { toast } = useToast();
    const { currency, loading: loadingBusiness } = useBusiness();
    const [showSalesChart, setShowSalesChart] = React.useState(false);


    React.useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        const branch = storedBranch ? JSON.parse(storedBranch) : null;
        if (branch?.id) {
            setActiveBranchId(branch.id);
            const loadData = async () => {
                setLoading(true);
                try {
                    const [transactionsData, customersData] = await Promise.all([
                        getTransactionsForBranch(branch.id),
                        getCustomers()
                    ]);
                    setTransactions(transactionsData as Transaction[]);
                    setCustomers(customersData as Customer[]);
                } catch (error) {
                    console.error("Failed to load dashboard data:", error);
                    toast({
                        title: "Error",
                        description: "Could not fetch dashboard data.",
                        variant: "destructive"
                    });
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        } else {
          setLoading(false);
        }
    }, [toast]);


  const totalRevenue = useMemo(() => transactions
    .filter((t) => t.type === 'Sale')
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);
  
  const salesToday = useMemo(() => transactions
    .filter(
      (t) =>
        isToday(parseISO(t.date)) &&
        t.type === 'Sale'
    )
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);

    const calculateProfit = (transactionItems: TransactionItem[]) => {
        return transactionItems.reduce((profit, item) => {
            if (typeof item.purchasePrice === 'number' && item.purchasePrice > 0) {
                return profit + ((item.price - item.purchasePrice) * item.quantity);
            }
            return profit;
        }, 0);
    };

    const totalProfit = useMemo(() => transactions
        .filter(t => t.type === 'Sale')
        .reduce((sum, t) => sum + calculateProfit(t.items), 0), [transactions]);

    const profitToday = useMemo(() => transactions
        .filter(t => t.type === 'Sale' && isToday(parseISO(t.date)))
        .reduce((sum, t) => sum + calculateProfit(t.items), 0), [transactions]);

  const newCustomersThisMonth = useMemo(() => customers.filter(c => {
    if (!c.createdAt) return false;
    const createdAt = c.createdAt.toDate();
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length, [customers]);

  const totalCustomers = customers.length;
  
  const isLoading = loading || loadingBusiness;
  
  const monthlySalesData = useMemo(() => {
    const salesByMonth: { [key: string]: number } = {};

    transactions
        .filter(t => t.type === 'Sale')
        .forEach(t => {
            try {
                const transactionDate = parseISO(t.date);
                const monthKey = format(transactionDate, 'yyyy-MM');
                if (!salesByMonth[monthKey]) {
                    salesByMonth[monthKey] = 0;
                }
                salesByMonth[monthKey] += t.amount;
            } catch(e) {
                console.error("Invalid date format in transaction:", t);
            }
        });

    const data = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = format(d, 'yyyy-MM');
        const monthName = format(d, 'MMM');
        return {
            name: monthName,
            sales: salesByMonth[monthKey] || 0,
        };
    }).reverse();
    
    return data;
  }, [transactions]);


  return (
    <div className="flex flex-col gap-6">
       <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm md:-mx-6 md:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalRevenue, currency)}</div>}
            <p className="text-xs text-muted-foreground">
              Total revenue for this branch
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalProfit, currency)}</div>}
            <p className="text-xs text-muted-foreground">
              Total profit for this branch
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">+{formatCurrency(salesToday, currency)}</div>}
            <p className="text-xs text-muted-foreground">
              Sales today for this branch
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">+{formatCurrency(profitToday, currency)}</div>}
            <p className="text-xs text-muted-foreground">
              Profit today for this branch
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">+{newCustomersThisMonth}</div>}
            <p className="text-xs text-muted-foreground">
              New customers this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalCustomers}</div>}
            <p className="text-xs text-muted-foreground">
              Total customers overall
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>A summary of sales over the past 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            {showSalesChart ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart accessibilityLayer data={monthlySalesData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    />
                    <YAxis 
                        tickFormatter={(value) => formatCurrency(value as number, currency, 'compact')}
                    />
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number, currency)} />}
                    />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                </BarChart>
                </ChartContainer>
            ) : (
                <div className="flex h-64 w-full items-center justify-center bg-muted/50 rounded-lg">
                    <Button variant="outline" onClick={() => setShowSalesChart(true)}>
                        <LineChartIcon className="mr-2 h-4 w-4" />
                        Tampilkan Grafik
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              A list of the most recent transactions for this branch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.slice(0, 5).map((transaction) => (
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
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        transaction.type === 'Refund'
                          ? 'text-destructive'
                          : ''
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
      </div>
    </div>
  );
}
