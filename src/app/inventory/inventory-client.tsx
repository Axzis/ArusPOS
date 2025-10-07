
"use client";
import * as React from 'react';
import {
  MoreHorizontal,
  Search,
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
import { getProductsForBranch, updateProductInBranch } from '@/lib/firestore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

function getStatus(stock: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= 20) return 'Low Stock';
    return 'In Stock';
}


export default function InventoryClient() {
  const { businessId } = useAuth();
  const [inventoryData, setInventoryData] = React.useState<InventoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [newStock, setNewStock] = React.useState(0);
  const { toast } = useToast();

   React.useEffect(() => {
    const storedBranch = localStorage.getItem('activeBranch');
    if (storedBranch) {
        const branch = JSON.parse(storedBranch);
        setActiveBranchId(branch.id);
    } else {
        setLoading(false);
    }
  }, []);

  const fetchInventory = React.useCallback(async () => {
    if (!activeBranchId || !businessId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const data = await getProductsForBranch(businessId, activeBranchId);
      setInventoryData(data as InventoryItem[]);
    } catch(error) {
        console.error("Failed to fetch inventory data:", error);
        toast({ title: "Error", description: "Could not fetch inventory for this branch.", variant: "destructive"});
    } finally {
        setLoading(false);
    }
  }, [activeBranchId, businessId, toast]);

  React.useEffect(() => {
    if (activeBranchId && businessId) {
        fetchInventory();
    }
  }, [activeBranchId, businessId, fetchInventory]);
  
  const handleUpdateClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewStock(item.stock);
    setIsAlertOpen(true);
  };

  const executeStockUpdate = async () => {
    if (!selectedItem || !activeBranchId || !businessId) return;
    
    try {
        await updateProductInBranch(businessId, activeBranchId, selectedItem.id, { stock: newStock });
        toast({ title: "Success", description: `Stock for ${selectedItem.name} updated.` });
        fetchInventory(); // Refresh data
    } catch(error) {
        console.error("Failed to update stock:", error);
        toast({ title: "Error", description: "Could not update stock.", variant: "destructive" });
    } finally {
        setIsAlertOpen(false);
        setSelectedItem(null);
    }
  };


  const filteredInventory = inventoryData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-7xl">
       <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Inventory</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>
            View and manage product stock levels for the current branch.
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                  ))
                ) : filteredInventory.map((item) => {
                    const status = getStatus(item.stock);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-muted-foreground text-sm sm:hidden">{item.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{item.sku}</TableCell>
                        <TableCell>
                          <Badge
                            className={cn({
                              'bg-green-500/20 text-green-700 border-green-500/20 hover:bg-green-500/30': status === 'In Stock',
                              'bg-yellow-500/20 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/30': status === 'Low Stock',
                              'bg-red-500/20 text-red-700 border-red-500/20 hover:bg-red-500/30': status === 'Out of Stock',
                            })}
                            variant="outline"
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.stock}</TableCell>
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
                                <DropdownMenuItem onSelect={() => handleUpdateClick(item)}>Update Stock</DropdownMenuItem>
                                <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Stock for {selectedItem?.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Enter the new stock quantity. This will overwrite the current value.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock" className="text-right">
                    New Quantity
                </Label>
                <Input 
                    id="stock" 
                    type="number" 
                    value={newStock} 
                    onChange={(e) => setNewStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="col-span-3" 
                />
                </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeStockUpdate}>Update</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}

    