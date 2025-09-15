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
  ChevronsLeft,
  Maximize,
  Minimize,
  Shield,
  Tag,
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
  useSidebar,
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
import { BusinessProvider } from '@/contexts/business-context';
import { useAuth } from '@/contexts/auth-context';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/products', icon: Package, label: 'Products' },
  { href: '/promos', icon: Tag, label: 'Promotions' },
  { href: '/inventory', icon: Boxes, label: 'Inventory' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/reports', icon: BarChart, label: 'Reports' },
];

const bottomNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/superadmin', icon: Shield, label: 'Super Admin' },
];

type ActiveBranch = {
    id: string;
    name: string;
}

function SidebarToggleButton() {
    const { toggleSidebar, state } = useSidebar();
    return (
        <SidebarMenuButton
            onClick={toggleSidebar}
            tooltip={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
        >
            <ChevronsLeft
                className={cn(
                    'duration-200',
                    state === 'collapsed' && 'rotate-180'
                )}
            />
            <span className="sr-only">Toggle Sidebar</span>
        </SidebarMenuButton>
    )
}

function FullscreenButton() {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };
    
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);


    return (
        <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            <span className="sr-only">Toggle fullscreen</span>
        </Button>
    );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isLoggedIn, logout } = useAuth();
  
  const [activeBranch, setActiveBranch] = React.useState<ActiveBranch | null>(null);
  const [loadingBranch, setLoadingBranch] = React.useState(true);

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/quick-assessment'];

  React.useEffect(() => {
     // Check authentication status
    if (!isLoggedIn && !publicRoutes.includes(pathname)) {
      router.replace('/login');
      return; // Stop further execution in this effect
    }
    
     // localStorage is only available in the browser.
     if (typeof window === 'undefined') {
      return;
    }

     try {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            setActiveBranch(JSON.parse(storedBranch));
        } else if (isLoggedIn && !['/select-branch', '/superadmin', ...publicRoutes].includes(pathname)) {
            // If logged in but no branch selected, redirect to select one
            router.replace('/select-branch');
        }
     } catch (error) {
        console.error("Could not parse active branch", error);
         if (isLoggedIn && !['/select-branch', '/superadmin', ...publicRoutes].includes(pathname)) {
            router.replace('/select-branch');
        }
     } finally {
        setLoadingBranch(false);
     }
  }, [pathname, router, isLoggedIn, publicRoutes]);


  // Set sidebar open state based on cookie
  const [open, setOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sidebar_state='));
    return stored ? stored.split('=')[1] === 'true' : true;
  });

  const handleLogout = () => {
    logout(); // Clear auth state
    localStorage.removeItem('activeBranch'); // Clear branch state
    router.push('/login');
  };

  const handleSwitchBranch = () => {
    router.push('/select-branch');
  }

  // Don't render the shell for public pages
  if (publicRoutes.includes(pathname)) {
      return <>{children}</>;
  }

  if (!isLoggedIn) {
     return (
          <div className="flex h-screen items-center justify-center">
              <Logo className="size-10 text-primary animate-pulse" />
          </div>
      )
  }
   
   // Use a simpler layout for the Super Admin and branch selection page
  if (pathname.startsWith('/superadmin') || pathname === '/select-branch') {
     return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 z-30">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 font-semibold"
                    >
                    <Logo className="h-6 w-6" />
                    <span>Arus POS</span>
                </Link>
                 <div className="ml-auto flex items-center gap-4">
                  {pathname !== '/select-branch' && <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to App</Button>}
                  <Button variant="secondary" onClick={handleLogout}><LogOut className='mr-2' /> Logout</Button>
                </div>
             </header>
             <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:gap-6 lg:p-6">
                {children}
            </main>
        </div>
     )
  }
  
  if (loadingBranch) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Logo className="size-10 text-primary animate-pulse" />
          </div>
      )
  }


  return (
    <BusinessProvider>
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
                       tooltip={item.label}
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
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
               <SidebarMenuItem>
                  <SidebarToggleButton />
               </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:h-[72px]">
            <SidebarTrigger className={cn(!isMobile && open ? 'invisible' : '')} />

              <div className="flex items-center gap-2 text-sm font-medium">
                  <Building className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Managing:</span>
                  {loadingBranch ? <Skeleton className="h-5 w-24" /> : <span>{activeBranch?.name ?? '...'}</span>}
              </div>

            <div className="ml-auto flex items-center gap-2">
               <FullscreenButton />
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
    </BusinessProvider>
  );
}
