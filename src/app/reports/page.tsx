"use client";

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
import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart } from 'recharts';
import { salesData, products } from '@/lib/data';

const salesChartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
};

const topProductsData = products.slice(0, 5).map(p => ({
  name: p.name,
  sales: Math.floor(Math.random() * 5000) + 1000
})).sort((a,b) => b.sales - a.sales);

const topProductsConfig = {
    sales: {
        label: "Sales",
        color: "hsl(var(--chart-2))"
    }
}


export default function ReportsPage() {
  return (
    <Tabs defaultValue="weekly" className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Reports</h1>
        <div className="ml-auto">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent value="daily">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
             <Card>
                <CardHeader>
                    <CardTitle>Daily Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">$1,250.00</p>
                    <p className="text-xs text-muted-foreground">+15% from yesterday</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Daily Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">85</p>
                    <p className="text-xs text-muted-foreground">+10 from yesterday</p>
                </CardContent>
            </Card>
        </div>
      </TabsContent>
      <TabsContent value="weekly">
         <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Sales</CardTitle>
                    <CardDescription>Sales trend for the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={salesChartConfig} className="h-72 w-full">
                         <LineChart accessibilityLayer data={[
                            { name: 'Mon', sales: 1200 },
                            { name: 'Tue', sales: 1500 },
                            { name: 'Wed', sales: 1300 },
                            { name: 'Thu', sales: 1800 },
                            { name: 'Fri', sales: 2200 },
                            { name: 'Sat', sales: 2500 },
                            { name: 'Sun', sales: 2300 },
                         ]}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                            dataKey="name"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            />
                            <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Line dataKey="sales" type="monotone" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products (This Week)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={topProductsConfig} className="h-72 w-full">
                        <BarChart accessibilityLayer data={topProductsData} layout="vertical">
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" hide />
                            <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="sales" fill="var(--color-sales)" radius={4} layout="vertical" />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
         </div>
      </TabsContent>
      <TabsContent value="monthly">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales Overview</CardTitle>
              <CardDescription>
                A summary of sales over the last 12 months.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={salesChartConfig} className="h-72 w-full">
                <BarChart accessibilityLayer data={salesData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
