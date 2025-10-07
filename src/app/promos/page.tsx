
import * as React from 'react';
import PromosClient from './promos-client';

export const revalidate = 0;

export default async function PromosPage() {
  
  // We cannot get activeBranchId on the server easily with the current setup.
  // The client component will fetch data based on localStorage branchId.
  // To optimize, we pass empty arrays to prevent client from fetching on initial load if there's no branch.
  
  return <PromosClient initialPromos={[]} initialProducts={[]} />;
}

    

    