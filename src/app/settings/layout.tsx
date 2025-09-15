
"use client";
import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const settingsNav = [
  { href: '/settings', label: 'Business' },
  { href: '/settings/branches', label: 'Branches' },
  { href: '/settings/users', label: 'Users & Roles' },
  { href: '/settings/profile', label: 'My Profile' },
  { href: '/settings/scanner', label: 'Barcode Scanner' },
  { href: '/settings/seeding', label: 'Seeding' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border -mx-4 -mt-4 p-4 rounded-b-lg shadow-sm md:-mx-6 md:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
      </div>
       <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-1/5">
           <nav className="flex flex-row md:flex-col gap-1">
                {settingsNav.map((item) => (
                    <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium",
                        pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    >
                    {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
        <div className="flex-1">
            {children}
        </div>
      </div>
    </div>
  );
}
