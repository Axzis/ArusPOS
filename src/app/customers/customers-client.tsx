
"use client";
import * as React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Download,
  Upload
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetFooter,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { getCustomers, addCustomer, deleteCustomer, upsertCustomersByEmail } from '@/lib/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
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
import ExcelImport from '@/components/excel-import';
import { utils, writeFile } from 'xlsx';


type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  avatar: string;
};

const initialCustomerState = {
    name: '',
    email: '',
    phone: ''
};

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState(initialCustomerState);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const { toast } = useToast();

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    try {
        const customersData = await getCustomers();
        setCustomers(customersData as Customer[]);
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        toast({ title: "Error", description: "Could not fetch customers.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setNewCustomer(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name) {
        toast({ title: "Validation Error", description: "Name is required.", variant: "destructive"});
        return;
    }

    try {
        await addCustomer(newCustomer);
        toast({ title: "Success", description: "New customer has been added." });
        setIsSheetOpen(false);
        setNewCustomer(initialCustomerState);
        fetchCustomers(); // Refresh the list
    } catch (error) {
        console.error("Failed to save customer:", error);
        toast({ title: "Error", description: "Could not save the new customer.", variant: "destructive"});
    }
  };
  
  const executeDelete = async () => {
    if (!customerToDelete) return;
    
    try {
      await deleteCustomer(customerToDelete.id);
      toast({ title: "Success", description: `Customer ${customerToDelete.name} has been deleted.` });
      setCustomerToDelete(null); // Close the dialog first
      fetchCustomers(); // Then refresh the list
    } catch (error) {
       console.error("Failed to delete customer:", error);
       toast({ title: "Error", description: "Could not delete the customer.", variant: "destructive"});
       setCustomerToDelete(null); // Also close dialog on error
    }
  };

  const handleDownloadTemplate = () => {
    const template = [{ name: 'John Doe', email: 'john.doe@example.com', phone: '555-0104' }];
    const ws = utils.json_to_sheet(template);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Customers");
    writeFile(wb, "customer_template.xlsx");
  };

  const handleImport = async (data: any[]) => {
    try {
        const result = await upsertCustomersByEmail(data);
        toast({
            title: "Import Successful",
            description: `${result.updated} customers updated, ${result.inserted} new customers added.`,
        });
        fetchCustomers();
    } catch (error: any) {
        toast({
            title: "Import Failed",
            description: error.message || "An unexpected error occurred during import.",
            variant: "destructive"
        });
    }
  };

  const handleDownload = () => {
    const ws = utils.json_to_sheet(filteredCustomers.map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalSpent: c.totalSpent,
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Customers");
    writeFile(wb, "customers.xlsx");
  };


  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:-mx-6 md:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Customers</h1>
        <div className="flex items-center gap-2">
            <ExcelImport 
                onImport={handleImport}
                requiredFields={['name', 'email', 'phone']}
            >
                <Button size="sm" variant="outline" className="gap-1">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                </Button>
            </ExcelImport>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Template</span>
            </Button>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button size="sm" className="gap-1" onClick={() => setIsSheetOpen(true)}>
                <PlusCircle className="h-4 w-4" />
                Add Customer
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                <SheetTitle>Add Customer</SheetTitle>
                <SheetDescription>
                    Enter the details for the new customer.
                </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input id="name" placeholder="John Doe" value={newCustomer.name} onChange={handleInputChange} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                    Email
                    </Label>
                    <Input id="email" type="email" placeholder="john@example.com" value={newCustomer.email} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                    Phone
                    </Label>
                    <Input id="phone" placeholder="555-0199" value={newCustomer.phone} onChange={handleInputChange} className="col-span-3" />
                </div>
                </div>
                <SheetFooter>
                    <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSaveCustomer}>Save customer</Button>
                </SheetFooter>
            </SheetContent>
            </Sheet>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>
            Manage your customers and view their purchase history.
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers..."
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
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Total Spent</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-9 w-full" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-9 w-full" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-9 w-full" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-9 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-9 w-9" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={customer.avatar} alt={customer.name} data-ai-hint="person portrait" />
                          <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{customer.name}</span>
                           <span className="text-muted-foreground text-sm sm:hidden">{customer.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{customer.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatCurrency(customer.totalSpent)}</TableCell>
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
                          <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                              onSelect={() => setCustomerToDelete(customer)}
                              className='text-destructive focus:text-destructive'
                            >
                              Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer "{customerToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
