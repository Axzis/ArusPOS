
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

const publicRoutes = ['/login', '/quick-assessment'];

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
  const { user, logout, loading: authLoading } = useAuth();
  
  const [activeBranch, setActiveBranch] = React.useState<ActiveBranch | null>(null);
  const [loadingBranch, setLoadingBranch] = React.useState(true);


  React.useEffect(() => {
    if (authLoading) return; // Wait until auth state is confirmed

    if (!user && !publicRoutes.includes(pathname)) {
        router.replace('/login');
        return;
    }

    if (user && publicRoutes.includes(pathname)) {
        router.replace('/select-branch');
        return;
    }
    
     if (typeof window === 'undefined') {
      return;
    }

     try {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
            setActiveBranch(JSON.parse(storedBranch));
        } else if (user && !['/select-branch', '/superadmin'].some(p => pathname.startsWith(p))) {
            router.replace('/select-branch');
        }
     } catch (error) {
        console.error("Could not parse active branch", error);
         if (user && !['/select-branch', '/superadmin'].some(p => pathname.startsWith(p))) {
            router.replace('/select-branch');
        }
     } finally {
        setLoadingBranch(false);
     }
  }, [pathname, router, user, authLoading]);


  // Set sidebar open state based on cookie
  const [open, setOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sidebar_state='));
    return stored ? stored.split('=')[1] === 'true' : true;
  });

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('activeBranch');
    router.push('/login');
  };

  const handleSwitchBranch = () => {
    localStorage.removeItem('activeBranch');
    router.push('/select-branch');
  }

  if (authLoading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Logo className="size-10 text-primary animate-pulse" />
          </div>
      )
  }
  
  // Don't render the shell for public pages if user is not logged in
  if (!user && publicRoutes.includes(pathname)) {
      return <>{children}</>;
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
                  <Button variant="secondary" onClick={handleLogout}><LogOut className='mr-2 h-4 w-4' /> Logout</Button>
                </div>
             </header>
             <main className="flex-1 p-4 lg:p-6">
                {children}
            </main>
        </div>
     )
  }
  
  if (loadingBranch && user) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Logo className="size-10 text-primary animate-pulse" />
          </div>
      )
  }

  // If we are on a protected route and don't have a user, show nothing (or a loader) while redirecting
  if (!user && !publicRoutes.includes(pathname)) {
      return null;
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
                      <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/40/40`} alt={user?.email || 'User'} />
                      <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSwitchBranch}>Switch Branch</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className='mr-2 h-4 w-4' />
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
