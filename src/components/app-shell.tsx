
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
  User,
  PanelLeft,
  ChevronRight,
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
import { useAuth } from '@/contexts/auth-context';
import { isSuperAdminUser } from '@/lib/config';


const allNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/products', icon: Package, label: 'Products' },
  { href: '/promos', icon: Tag, label: 'Promotions' },
  { href: '/inventory', icon: Boxes, label: 'Inventory' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/reports', icon: BarChart, label: 'Reports' },
];

const staffNavItems = [
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/customers', icon: Users, label: 'Customers' },
];

const superAdminExtraNav = [
    { href: '/superadmin', icon: Shield, label: 'Super Admin' },
];

const bottomNavItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const publicRoutes = ['/login', '/print', '/superadmin/register'];

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

function NavMenu() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { setOpen, setOpenMobile, isMobile } = useSidebar();

    const isSuperAdmin = user?.email ? isSuperAdminUser(user.email) : false;
    const isAdmin = user?.role === 'Admin';
    
    let navItems = staffNavItems;
    if (isAdmin) {
        navItems = allNavItems;
    }
    if (isSuperAdmin) {
        navItems = [...allNavItems, ...superAdminExtraNav];
    }

    const showBottomNav = isAdmin || isSuperAdmin;
    
    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <>
            <SidebarContent>
                <SidebarMenu>
                    {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <Link href={item.href} onClick={handleLinkClick}>
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
                    {showBottomNav && bottomNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <Link href={item.href} onClick={handleLinkClick}>
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
            </SidebarFooter>
        </>
    )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, businessId, logout, loading: authLoading } = useAuth();
  
  const [activeBranch, setActiveBranch] = React.useState<ActiveBranch | null>(null);
  const [branchChecked, setBranchChecked] = React.useState(false);
  
  const isSuperAdmin = user?.email ? isSuperAdminUser(user.email) : false;

  React.useEffect(() => {
    // This effect handles routing logic once auth state is determined.
    if (authLoading) {
      return; // Wait until loading is false
    }

    const isPublic = publicRoutes.some(route => pathname.startsWith(route));

    // If no user, redirect to login unless it's a public page
    if (!user) {
      if (!isPublic) {
        router.replace('/login');
      }
      return;
    }

    // If user is logged in, handle redirects away from public pages
    if (pathname === '/login' || pathname === '/superadmin/register') {
       if (isSuperAdmin) {
           router.replace('/superadmin');
       } else {
           router.replace('/select-branch');
       }
       return;
    }

    // If user is not superadmin but on superadmin page, redirect
    if (pathname.startsWith('/superadmin') && !isSuperAdmin) {
        router.replace('/dashboard');
        return;
    }

    // For regular users, check for an active branch
    if (!isSuperAdmin && !isPublic) {
      try {
        const storedBranch = localStorage.getItem('activeBranch');
        if (storedBranch) {
          setActiveBranch(JSON.parse(storedBranch));
        } else if (!pathname.startsWith('/select-branch')) {
          router.replace('/select-branch');
        }
      } catch (error) {
        console.error("Could not parse active branch, redirecting.", error);
        router.replace('/select-branch');
      } finally {
          setBranchChecked(true);
      }
    } else {
        setBranchChecked(true);
    }
  }, [pathname, router, user, authLoading, isSuperAdmin]);


  // Set sidebar open state based on cookie
  const [open, setOpen] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sidebar_state='));
    return stored ? stored.split('=')[1] === 'true' : false;
  });

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('activeBranch');
    router.replace('/login');
  };

  const handleSwitchBranch = () => {
    localStorage.removeItem('activeBranch');
    router.push('/select-branch');
  }

  const isPublicPage = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicPage && !pathname.startsWith('/print')) {
      return <>{children}</>;
  }
  
  if (pathname.startsWith('/print')) {
    return <div className="print-invoice">{children}</div>;
  }

  // Show a loading screen while auth is loading or branch check is pending
  if (authLoading || (!branchChecked && !isPublicPage)) {
      return (
          <div className="flex h-screen items-center justify-center">
              <Logo className="size-10 text-primary animate-pulse" />
          </div>
      )
  }
  
  // If no user and not a public page, we are in the process of redirecting, render nothing.
  if (!user && !isPublicPage) {
    return null;
  }
   
  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <div className="fixed top-1/2 left-3 -translate-y-1/2 z-50">
        <SidebarTrigger asChild>
           <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
              <ChevronRight className="h-5 w-5" />
            </Button>
        </SidebarTrigger>
      </div>
      <Sidebar collapsible="offcanvas" side="left">
        <SidebarHeader className="h-14">
        <div className="flex items-center gap-2">
            <Logo className="size-7 text-primary" />
            <h1 className="text-lg font-bold font-headline">Arus POS</h1>
        </div>
        </SidebarHeader>
        <NavMenu />
    </Sidebar>
    <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:h-[72px]">
        
            <div className="flex items-center gap-2 text-sm font-medium">
                {!isSuperAdmin && (
                    <>
                        <Building className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Managing:</span>
                        {authLoading ? <Skeleton className="h-5 w-24" /> : <span>{activeBranch?.name ?? '...'}</span>}
                    </>
                )}
            </div>

        <div className="ml-auto flex items-center gap-2">
            <FullscreenButton />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                <Avatar>
                    <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/${user?.uid}/40/40`} alt={user?.email || 'User'} />
                    <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.displayName || user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings/profile')}>My Profile</DropdownMenuItem>
                {!isSuperAdmin && <DropdownMenuItem onClick={handleSwitchBranch}>Switch Branch</DropdownMenuItem>}
                {isSuperAdmin && <DropdownMenuItem onClick={() => router.push('/superadmin')}>Super Admin</DropdownMenuItem>}
                {(user?.role === 'Admin' || isSuperAdmin) && <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>}
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
  );
}
