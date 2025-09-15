
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart, YAxis, Tooltip } from 'recharts';
import { getTransactionsForBranch, getProductsForBranch } from '@/lib/firestore';
import { useBusiness } from '@/contexts/business-context';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, getMonth, getYear, parseISO, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: { id: string; quantity: number; name: string }[];
};

type Product = {
    id: string;
    name: string;
}

const salesChartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
};

const topProductsConfig = {
    sales: {
        label: "Units Sold",
        color: "hsl(var(--chart-2))"
    }
};

export default function ReportsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

    const { currency, loading: loadingBusiness } = useBusiness();
    const { toast } = useToast();

    useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            const branch = JSON.parse(storedBranch);
            setActiveBranchId(branch.id);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!activeBranchId) return;
        setLoading(true);
        try {
            const [transactionsData, productsData] = await Promise.all([
                getTransactionsForBranch(activeBranchId),
                getProductsForBranch(activeBranchId)
            ]);
            setTransactions(transactionsData as Transaction[]);
            setProducts(productsData as Product[]);
        } catch (error) {
            console.error("Failed to load report data:", error);
            toast({ title: "Error", description: "Could not fetch report data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    useEffect(() => {
        if (activeBranchId) {
            fetchData();
        }
    }, [activeBranchId, fetchData]);

    const salesTransactions = useMemo(() => transactions.filter(t => t.type === 'Sale'), [transactions]);

    const dailyStats = useMemo(() => {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);
        
        const todaysTransactions = salesTransactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));

        const revenue = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);
        const count = todaysTransactions.length;
        
        return { revenue, count };
    }, [salesTransactions]);
    
    const weeklySalesData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const day = subDays(today, i);
            const start = startOfDay(day);
            const end = endOfDay(day);

            const dailyTotal = salesTransactions
                .filter(t => isWithinInterval(parseISO(t.date), { start, end }))
                .reduce((sum, t) => sum + t.amount, 0);
            
            data.push({
                name: format(day, 'EEE'), // Mon, Tue, etc.
                sales: dailyTotal
            });
        }
        return data;
    }, [salesTransactions]);

    const monthlySalesData = useMemo(() => {
        const now = new Date();
        const yearStart = startOfYear(subDays(now, 365)); // start from 12 months ago
        const yearEnd = endOfYear(now);
        
        const months = eachMonthOfInterval({
          start: yearStart,
          end: yearEnd,
        });

        const monthlyTotals = months.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const monthTotal = salesTransactions
                .filter(t => isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }))
                .reduce((sum, t) => sum + t.amount, 0);
            
            return {
                name: format(monthStart, 'MMM'),
                sales: monthTotal,
            };
        });

        return monthlyTotals.slice(-12);
    }, [salesTransactions]);

    const topProductsData = useMemo(() => {
        const productCounts: { [key: string]: { name: string, sales: number } } = {};
        const today = new Date();
        const startOfThisWeek = startOfDay(subDays(today, today.getDay())); // Start of Sunday
        const endOfThisWeek = endOfDay(today);

        const thisWeeksTransactions = salesTransactions.filter(t => isWithinInterval(parseISO(t.date), {start: startOfThisWeek, end: endOfThisWeek}));

        thisWeeksTransactions.forEach(t => {
            if(t.items) {
                t.items.forEach(item => {
                    if (!productCounts[item.id]) {
                        // Find the product name from the full product list for consistency
                        const productName = products.find(p => p.id === item.id)?.name || item.name;
                        productCounts[item.id] = { name: productName, sales: 0 };
                    }
                    productCounts[item.id].sales += item.quantity;
                });
            }
        });
        
        return Object.values(productCounts)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

    }, [salesTransactions, products]);

    const isLoading = loading || loadingBusiness;

    return (
        <div className='flex flex-col gap-6'>
            <Tabs defaultValue="weekly" className="w-full">
                <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex items-center justify-between md:-mx-6 md:p-6">
                    <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
                    <div className="ml-auto">
                        <TabsList>
                            <TabsTrigger value="daily">Daily</TabsTrigger>
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                        </TabsList>
                    </div>
                </div>
                <TabsContent value="daily" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-9 w-3/4" /> : <p className="text-3xl font-bold">{formatCurrency(dailyStats.revenue, currency)}</p>}
                                <p className="text-xs text-muted-foreground">Total revenue for today</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Transactions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-9 w-1/2" /> : <p className="text-3xl font-bold">{dailyStats.count}</p>}
                                <p className="text-xs text-muted-foreground">Total sales transactions today</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="weekly" className="mt-6">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Weekly Sales</CardTitle>
                                <CardDescription>Sales trend for the last 7 days.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-72 w-full" /> : (
                                <ChartContainer config={salesChartConfig} className="h-72 w-full">
                                    <LineChart accessibilityLayer data={weeklySalesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            tickMargin={10}
                                            axisLine={false}
                                        />
                                        <YAxis tickFormatter={(value) => formatCurrency(value as number, currency, 'compact')} />
                                        <Tooltip content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number, currency)} />} />
                                        <Line dataKey="sales" type="monotone" stroke="var(--color-sales)" strokeWidth={2} dot={true} />
                                    </LineChart>
                                </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Selling Products (This Week)</CardTitle>
                                <CardDescription>Top 5 products by units sold this week.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-72 w-full" /> : (
                                <ChartContainer config={topProductsConfig} className="h-72 w-full">
                                    <BarChart accessibilityLayer data={topProductsData} layout="vertical" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                        <CartesianGrid horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} />
                                        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} layout="vertical" />
                                    </BarChart>
                                </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="monthly" className="mt-6">
                    <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                        <CardTitle>Monthly Sales Overview</CardTitle>
                        <CardDescription>
                            A summary of sales over the past 12 months.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        {isLoading ? <Skeleton className="h-72 w-full" /> : (
                        <ChartContainer config={salesChartConfig} className="h-72 w-full">
                            <BarChart accessibilityLayer data={monthlySalesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis tickFormatter={(value) => formatCurrency(value as number, currency, 'compact')} />
                            <Tooltip content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number, currency)} />} />
                            <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                        )}
                        </CardContent>
                    </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
