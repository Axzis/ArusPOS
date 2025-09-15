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
  updateDoc,
  deleteDoc,
  DocumentData,
  orderBy,
} from 'firebase/firestore';
import { products as initialProducts, customers as initialCustomers, transactions as initialTransactions, inventory } from './data';

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

// Helper to get the first (and only) business ID.
// This is a simplification for the current single-business model.
let businessIdCache: string | null = null;
async function getBusinessId(): Promise<string> {
    if (businessIdCache) {
        return businessIdCache;
    }
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), limit(1));
    const businessSnapshot = await getDocs(businessQuery);
    if (businessSnapshot.empty) {
        throw new Error("No business found in the database.");
    }
    businessIdCache = businessSnapshot.docs[0].id;
    return businessIdCache;
}


// === New Business and User Registration ===
export async function addUserAndBusiness(data: BusinessData) {
    const batch = writeBatch(db);

    // 1. Create the Business document
    const businessRef = doc(collection(db, BUSINESSES_COLLECTION));
    batch.set(businessRef, {
        name: data.businessName,
        type: data.businessType,
        currency: 'USD', // Default currency
        createdAt: serverTimestamp(),
    });

    // 2. Create Branch documents and initial data for each branch
    data.branches.forEach(branchData => {
        const branchRef = doc(collection(db, `businesses/${businessRef.id}/branches`));
        batch.set(branchRef, {
            ...branchData,
            isActive: true,
            createdAt: serverTimestamp(),
        });
        
        // Seed initial products for this new branch
        initialProducts.forEach(product => {
            const productRef = doc(collection(db, `businesses/${businessRef.id}/branches/${branchRef.id}/products`));
            batch.set(productRef, product);
        });

        // Seed initial transactions for this new branch
        initialTransactions.forEach(t => {
            const transactionRef = doc(collection(db, `businesses/${businessRef.id}/branches/${branchRef.id}/transactions`));
            batch.set(transactionRef, {...t, date: new Date(t.date)});
        });
    });

     // 3. Create global customers
    initialCustomers.forEach(c => {
        const customerRef = doc(collection(db, `businesses/${businessRef.id}/customers`));
        batch.set(customerRef, c);
    });

    // 4. Create the User document
    const userRef = doc(collection(db, USERS_COLLECTION));
    batch.set(userRef, {
        name: data.adminName,
        email: data.email,
        role: 'Admin',
        businessId: businessRef.id,
        createdAt: serverTimestamp(),
    });

    await batch.commit();
    businessIdCache = businessRef.id; // Cache the new business ID
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
        const branchesCollectionRef = collection(db, `businesses/${business.id}/branches`);
        const branchesQuery = query(branchesCollectionRef);
        const branchesSnapshot = await getDocs(branchesQuery);
        const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));
        return { ...business, branches };
    }));

    if (businesses.length > 0) {
        businessIdCache = businesses[0].id;
    }

    return businesses;
}


// === Product Functions (Branch Specific) ===
export async function getProductsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    const productsCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/products`);
    const querySnapshot = await getDocs(productsCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addProductToBranch(branchId: string, productData: Omit<DocumentData, 'id'>) {
    const businessId = await getBusinessId();
    const productsCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/products`);
    return await addDoc(productsCollectionRef, {
        ...productData,
        createdAt: serverTimestamp()
    });
}

export async function updateProductInBranch(branchId: string, productId: string, productData: Partial<DocumentData>) {
    const businessId = await getBusinessId();
    const productDocRef = doc(db, `businesses/${businessId}/branches/${branchId}/products`, productId);
    return await updateDoc(productDocRef, {
        ...productData,
        updatedAt: serverTimestamp()
    });
}

export async function deleteProductFromBranch(branchId: string, productId: string) {
    const businessId = await getBusinessId();
    const productDocRef = doc(db, `businesses/${businessId}/branches/${branchId}/products`, productId);
    return await deleteDoc(productDocRef);
}


// === Customer Functions (Global for the business) ===
export async function getCustomers() {
    const businessId = await getBusinessId();
    const customersCollectionRef = collection(db, `businesses/${businessId}/customers`);
    const querySnapshot = await getDocs(customersCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// === Transaction Functions (Branch Specific) ===
export async function getTransactionsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    const transactionsCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/transactions`);
    const q = query(transactionsCollectionRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Ensure date is a string for client-side rendering
            date: data.date.toDate().toISOString(), 
        }
    });
}

// === Inventory Functions (Readonly for now) ===
export async function getInventory() {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    const inventoryItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     if (inventoryItems.length === 0) { // Seed if empty
        const batch = writeBatch(db);
        inventory.forEach(i => {
            const docRef = doc(collection(db, INVENTORY_COLLECTION));
            batch.set(docRef, i);
        });
        await batch.commit();
        return await getInventory();
    }
    return inventoryItems;
}


// === User Management ===
export async function getUsers() {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// === Generic Getters (Used for legacy data if needed) ===
export async function getProducts() {
  const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
   if (products.length === 0) { // Seed if empty
        const batch = writeBatch(db);
        initialProducts.forEach(p => {
            const docRef = doc(collection(db, PRODUCTS_COLLECTION));
            batch.set(docRef, p);
        });
        await batch.commit();
        return await getProducts();
    }
  return products;
}

export async function getTransactions() {
    const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
    const transactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate().toISOString(),
        }
    });
     if (transactions.length === 0) { // Seed if empty
        const batch = writeBatch(db);
        initialTransactions.forEach(t => {
            const docRef = doc(collection(db, TRANSACTIONS_COLLECTION));
            batch.set(docRef, {...t, date: new Date(t.date)});
        });
        await batch.commit();
        return await getTransactions();
    }
    return transactions;
}
