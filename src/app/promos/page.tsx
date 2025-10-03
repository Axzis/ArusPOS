
import * as React from 'react';
import { getProductsForBranch, getPromosForBranch } from '@/lib/firestore';
import PromosClient from './promos-client';

export const revalidate = 0;

// This is now a Server Component
export default async function PromosPage() {
  
  // We cannot get activeBranchId on the server easily with the current setup.
  // So we will let the client component fetch the data.
  // A more advanced setup might involve passing the branchId via params or context.
  
  return <PromosClient />;
}
