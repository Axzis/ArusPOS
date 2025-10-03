
import * as React from 'react';
import { getProductsForBranch } from '@/lib/firestore';
import InventoryClient from './inventory-client';

export const revalidate = 0;

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

// This is now a Server Component
export default async function InventoryPage() {
  
  // We can't get activeBranchId on server, so we'll pass this component to a client one
  // In a real scenario with server-side branch selection, we could do more here.
  // For now, the client component will handle the data fetching based on localStorage.
  
  return <InventoryClient />;
}
