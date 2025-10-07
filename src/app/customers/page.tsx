
import * as React from 'react';
import CustomersClient from './customers-client';

export const revalidate = 0; // Force dynamic rendering, although data fetching is now on client

// This Server Component now only acts as a wrapper for the Client Component.
// All data fetching logic has been moved to CustomersClient to ensure reliability.
export default function CustomersPage() {
  return <CustomersClient />;
}

