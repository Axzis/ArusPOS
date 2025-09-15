import app from './firebase';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  limit,
} from 'firebase/firestore';
import { products, customers, transactions, inventory } from './data';

const db = getFirestore(app);

const PRODUCTS_COLLECTION = 'products';
const CUSTOMERS_COLLECTION = 'customers';
const TRANSACTIONS_COLLECTION = 'transactions';
const INVENTORY_COLLECTION = 'inventory';

// Function to seed initial data if collections are empty
export async function seedDatabase() {
  try {
    // Seed products
    const productsQuery = query(collection(db, PRODUCTS_COLLECTION), limit(1));
    const productsSnapshot = await getDocs(productsQuery);
    if (productsSnapshot.empty) {
      console.log('Seeding products...');
      for (const product of products) {
        await addDoc(collection(db, PRODUCTS_COLLECTION), product);
      }
      console.log('Products seeded.');
    }

    // Seed customers
    const customersQuery = query(collection(db, CUSTOMERS_COLLECTION), limit(1));
    const customersSnapshot = await getDocs(customersQuery);
    if (customersSnapshot.empty) {
        console.log('Seeding customers...');
        for (const customer of customers) {
            await addDoc(collection(db, CUSTOMERS_COLLECTION), customer);
        }
        console.log('Customers seeded.');
    }

    // Seed transactions
    const transactionsQuery = query(collection(db, TRANSACTIONS_COLLECTION), limit(1));
    const transactionsSnapshot = await getDocs(transactionsQuery);
if (transactionsSnapshot.empty) {
        console.log('Seeding transactions...');
        for (const transaction of transactions) {
            await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
                ...transaction,
                date: new Date(transaction.date) // Store date as Firestore Timestamp
            });
        }
        console.log('Transactions seeded.');
    }

    // Seed inventory
    const inventoryQuery = query(collection(db, INVENTORY_COLLECTION), limit(1));
    const inventorySnapshot = await getDocs(inventoryQuery);
    if (inventorySnapshot.empty) {
        console.log('Seeding inventory...');
        for (const item of inventory) {
            await addDoc(collection(db, INVENTORY_COLLECTION), item);
        }
        console.log('Inventory seeded.');
    }

  } catch (error) {
    console.error('Error seeding database: ', error);
  }
}

// === Product Functions ===
export async function getProducts() {
  const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return products;
}

// === Customer Functions ===
export async function getCustomers() {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const customers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return customers;
}

// === Transaction Functions ===
export async function getTransactions() {
    const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
    const transactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate().toISOString(), // Convert Timestamp to string
        }
    });
    return transactions;
}

// === Inventory Functions ===
export async function getInventory() {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const inventory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return inventory;
}
