import app from './firebase';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  limit,
  writeBatch,
  serverTimestamp,
  where,
  getDoc,
  doc,
} from 'firebase/firestore';
import { products, customers, transactions, inventory } from './data';

const db = getFirestore(app);

const USERS_COLLECTION = 'users';
const BUSINESSES_COLLECTION = 'businesses';
const BRANCHES_COLLECTION = 'branches';
const PRODUCTS_COLLECTION = 'products';
const CUSTOMERS_COLLECTION = 'customers';
const TRANSACTIONS_COLLECTION = 'transactions';
const INVENTORY_COLLECTION = 'inventory';

type BusinessData = {
    adminName: string;
    email: string;
    password?: string;
    businessName: string;
    businessType: string;
    branches: {
        name: string;
        address: string;
        phone: string;
    }[];
}

// === New Business and User Registration ===
export async function addUserAndBusiness(data: BusinessData) {
    const batch = writeBatch(db);

    // 1. Create the Business document
    const businessRef = doc(collection(db, BUSINESSES_COLLECTION));
    batch.set(businessRef, {
        name: data.businessName,
        type: data.businessType,
        createdAt: serverTimestamp(),
    });

    // 2. Create Branch documents
    data.branches.forEach(branchData => {
        const branchRef = doc(collection(db, `businesses/${businessRef.id}/branches`));
        batch.set(branchRef, {
            ...branchData,
            createdAt: serverTimestamp(),
        });
    });

    // 3. Create the User document
    const userRef = doc(collection(db, USERS_COLLECTION));
    batch.set(userRef, {
        name: data.adminName,
        email: data.email,
        // In a real app, you would use Firebase Auth and store the UID.
        // The password should be handled by Firebase Auth, not stored in Firestore.
        role: 'Admin', // Initial user is an Admin
        businessId: businessRef.id,
        createdAt: serverTimestamp(),
    });

    // Commit the batch
    await batch.commit();
    return { userId: userRef.id, businessId: businessRef.id };
}

// === Get Business and its Branches ===
export async function getBusinessWithBranches() {
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), limit(1));
    const businessSnapshot = await getDocs(businessQuery);
    
    if (businessSnapshot.empty) {
        return [];
    }

    const businesses = await Promise.all(businessSnapshot.docs.map(async (businessDoc) => {
        const business = { id: businessDoc.id, ...businessDoc.data() };
        const branchesSnapshot = await getDocs(collection(db, `businesses/${business.id}/branches`));
        const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));
        return { ...business, branches };
    }));

    return businesses;
}


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
