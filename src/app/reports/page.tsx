
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getTransactionsForBranch } from '@/lib/firestore';
import { useBusiness } from '@/contexts/business-context';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth, parseISO, startOfYear, endOfYear, eachMonthOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';


type Transaction = {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'Paid' | 'Refunded';
    type: 'Sale' | 'Refund';
    items: { id: string; quantity: number; name: string, price: number }[];
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
    const [loading, setLoading] = useState(true);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const { currency, loading: loadingBusiness } = useBusiness();
    const { toast } = useToast();

    useEffect(() => {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            const branch = JSON.parse(storedBranch);
            setActiveBranchId(branch.id);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchData = useCallback(async () => {
        if (!activeBranchId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const transactionsData = await getTransactionsForBranch(activeBranchId);
            setTransactions(transactionsData as Transaction[]);
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
        if (salesTransactions.length === 0) return { revenue: 0, count: 0 };
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);
        
        const todaysTransactions = salesTransactions.filter(t => {
            try {
                return isWithinInterval(parseISO(t.date), { start, end });
            } catch { return false; }
        });

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
                .filter(t => {
                    try {
                        return isWithinInterval(parseISO(t.date), { start, end });
                    } catch {
                        return false;
                    }
                })
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
        // Go back 11 months to get a 12-month interval including the current month
        const yearStart = startOfMonth(subDays(now, 335)); 
        const yearEnd = endOfMonth(now);
        
        const months = eachMonthOfInterval({
          start: yearStart,
          end: yearEnd,
        });

        const monthlyTotals = months.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const monthTotal = salesTransactions
                .filter(t => {
                     try {
                        return isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd });
                    } catch {
                        return false;
                    }
                })
                .reduce((sum, t) => sum + t.amount, 0);
            
            return {
                name: format(monthStart, 'MMM'),
                sales: monthTotal,
            };
        });

        return monthlyTotals;
    }, [salesTransactions]);

    const topProductsData = useMemo(() => {
        if (salesTransactions.length === 0) return [];
        const productCounts: { [key: string]: { name: string, sales: number } } = {};
        const today = new Date();
        // Setting weekStartsOn: 1 makes Monday the start of the week. Adjust if your locale is different.
        const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); 
        const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });

        const thisWeeksTransactions = salesTransactions.filter(t => {
            try {
                return isWithinInterval(parseISO(t.date), {start: startOfThisWeek, end: endOfThisWeek});
            } catch {
                return false;
            }
        });
        
        if (thisWeeksTransactions.length === 0) return [];

        thisWeeksTransactions.forEach(t => {
            if(t.items) {
                t.items.forEach(item => {
                    if (!productCounts[item.id]) {
                        productCounts[item.id] = { name: item.name, sales: 0 };
                    }
                    productCounts[item.id].sales += item.quantity;
                });
            }
        });
        
        return Object.values(productCounts)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

    }, [salesTransactions]);

    const handleDownloadCsv = () => {
        if (!dateRange || !dateRange.from || !dateRange.to) {
            toast({
                title: "Date Range Required",
                description: "Please select a date range to download the report.",
                variant: "destructive"
            });
            return;
        }

        const filtered = transactions.filter(t => {
            try {
                return isWithinInterval(parseISO(t.date), { start: dateRange.from!, end: dateRange.to! })
            } catch {
                return false;
            }
        });
        
        if (filtered.length === 0) {
            toast({
                title: "No Data",
                description: "No transactions found in the selected date range.",
            });
            return;
        }

        const headers = ["Transaction ID", "Customer Name", "Date", "Type", "Status", "Amount", "Items"];
        const csvContent = [
            headers.join(','),
            ...filtered.map(t => [
                t.id,
                `"${t.customerName}"`,
                format(parseISO(t.date), "yyyy-MM-dd HH:mm:ss"),
                t.type,
                t.status,
                t.amount,
                `"${t.items.map(item => `${item.quantity}x ${item.name} @ ${formatCurrency(item.price, currency)}`).join('; ')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            const from = format(dateRange.from, 'yyyy-MM-dd');
            const to = format(dateRange.to, 'yyyy-MM-dd');
            link.setAttribute('href', url);
            link.setAttribute('download', `report-${from}_to_${to}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    const isLoading = loading || loadingBusiness;

    return (
        <div className='flex flex-col gap-6'>
            <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex-col flex gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
                    <p className="text-sm text-muted-foreground">Analyze your business performance.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full sm:w-[300px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range for download</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleDownloadCsv} disabled={!dateRange?.from || !dateRange?.to}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Report (CSV)
                    </Button>
                </div>
            </div>
            <Tabs defaultValue="weekly" className="w-full">
                <div className="flex justify-start sm:justify-end overflow-x-auto">
                    <TabsList>
                        <TabsTrigger value="daily">Daily</TabsTrigger>
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    </TabsList>
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
                                
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Selling Products (This Week)</CardTitle>
                                <CardDescription>Top 5 products by units sold this week.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                
                                <ChartContainer config={topProductsConfig} className="h-72 w-full">
                                    <BarChart accessibilityLayer data={topProductsData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                        <CartesianGrid horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={100} tick={{fontSize: 12}} />
                                        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} layout="vertical" />
                                    </BarChart>
                                </ChartContainer>
                                
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
                        
                        </CardContent>
                    </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    