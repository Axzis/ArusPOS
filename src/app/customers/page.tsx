
import * as React from 'react';
import { getCustomers } from '@/lib/firestore';
import CustomersClient from './customers-client';

export const revalidate = 0; // Force dynamic rendering

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  avatar: string;
};

export default async function CustomersPage() {
  // Fetch data on the server
  const customersData = (await getCustomers()) as Customer[];

  return <CustomersClient initialCustomers={customersData} />;
}
