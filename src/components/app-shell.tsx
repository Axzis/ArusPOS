"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart,
  Boxes,
  Building,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/products', icon: Package, label: 'Products' },
  { href: '/inventory', icon: Boxes, label: 'Inventory' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/reports', icon: BarChart, label: 'Reports' },
];

const bottomNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

type ActiveBranch = {
    id: string;
    name: string;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeBranch, setActiveBranch] = React.useState<ActiveBranch | null>(null);
  const [loadingBranch, setLoadingBranch] = React.useState(true);

  React.useEffect(() => {
     try {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            setActiveBranch(JSON.parse(storedBranch));
        } else if (pathname !== '/select-branch') {
            router.replace('/select-branch');
        }
     } catch (error) {
        console.error("Could not parse active branch", error);
        router.replace('/select-branch');
     } finally {
        setLoadingBranch(false);
     }
  }, [pathname, router]);

  // Set sidebar open state based on cookie
  const [open, setOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sidebar_state='));
    return stored ? stored.split('=')[1] === 'true' : true;
  });

  const handleLogout = () => {
    localStorage.removeItem('activeBranch');
    router.push('/login');
  };

  const handleSwitchBranch = () => {
    router.push('/select-branch');
  }

  // Don't render the shell for auth/setup pages
  if (['/login', '/quick-assessment', '/select-branch'].includes(pathname)) {
      return <>{children}</>;
  }
  
  if (loadingBranch) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Logo className="size-10 text-primary animate-pulse" />
          </div>
      )
  }


  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar>
        <SidebarHeader className="h-14">
          <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <h1 className="text-lg font-bold font-headline">Arus POS</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {bottomNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className={cn(!isMobile && open ? 'invisible' : '')} />

            <div className="flex items-center gap-2 text-sm font-medium">
                <Building className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Managing:</span>
                {loadingBranch ? <Skeleton className="h-5 w-24" /> : <span>{activeBranch?.name ?? '...'}</span>}
            </div>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                  <Avatar>
                    <AvatarImage src="https://picsum.photos/seed/user/40/40" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSwitchBranch}>Switch Branch</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className='mr-2' />
                    Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
