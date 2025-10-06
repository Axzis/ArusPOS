
import * as React from 'react';
import { getProductsForBranch, getPromosForBranch } from '@/lib/firestore';
import PromosClient from './promos-client';

export const revalidate = 0;

type Product = {
  id: string;
  name: string;
  price: number;
};

type Promo = {
  id: string;
  productId: string;
  productName: string;
  promoPrice: number;
  startDate: string;
  endDate: string;
};

// This is now a Server Component
export default async function PromosPage() {
  
  // We cannot get activeBranchId on the server easily with the current setup.
  // The client component will fetch data based on localStorage branchId.
  // To optimize, we pass empty arrays to prevent client from fetching on initial load if there's no branch.
  
  return <PromosClient initialPromos={[]} initialProducts={[]} />;
}

    