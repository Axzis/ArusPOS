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
  runTransaction,
} from 'firebase/firestore';
import { products as initialProducts, customers as initialCustomers, transactions as initialTransactions } from './data';
import { formatCurrency } from './utils';

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
    currency?: string;
    taxEnabled?: boolean;
    taxRate?: number;
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
        // If there's no business, let's not throw an error but return an empty string,
        // so pages that rely on it don't break before registration.
        console.warn("No business found in the database. Please register a business.");
        return "";
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
        taxEnabled: true,
        taxRate: 8,
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
    // This is called by the main app, so we assume we want the first business
    // for now. A multi-business login flow would change this.
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

// === Super Admin functions ===
export async function getAllBusinesses() {
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), orderBy("createdAt", "desc"));
    const businessSnapshot = await getDocs(businessQuery);
    return businessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


export async function updateBusiness(businessId: string, businessData: Partial<BusinessData>) {
    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    return await updateDoc(businessDocRef, {
        ...businessData,
        updatedAt: serverTimestamp()
    });
}


// === Product Functions (Branch Specific) ===
export async function getProductsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) return [];
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
    try {
        const businessId = await getBusinessId();
        if (!businessId) return [];
        const customersCollectionRef = collection(db, `businesses/${businessId}/customers`);
        const querySnapshot = await getDocs(customersCollectionRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("Could not fetch customers, maybe none are created yet.", error);
        return []; // Return empty array if no business/customers found
    }
}

export async function addCustomer(customerData: { name: string, email: string, phone: string }) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found to add customer to.");
    
    const customersCollectionRef = collection(db, `businesses/${businessId}/customers`);
    const newCustomer = {
        ...customerData,
        totalSpent: 0,
        avatar: `https://picsum.photos/seed/${Math.random()}/40/40`,
        createdAt: serverTimestamp(),
    };
    return await addDoc(customersCollectionRef, newCustomer);
}

export async function deleteCustomer(customerId: string) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found to delete customer from.");
    const customerDocRef = doc(db, `businesses/${businessId}/customers`, customerId);
    return await deleteDoc(customerDocRef);
}


// === Transaction Functions (Branch Specific) ===
export async function getTransactionsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) return [];
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

export async function addTransactionAndUpdateStock(branchId: string, transactionData: Omit<DocumentData, 'id'>, items: { id: string, quantity: number }[]) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) throw new Error("Missing business or branch ID");

    const batch = writeBatch(db);

    // 1. Add the new transaction
    const transactionRef = doc(collection(db, `businesses/${businessId}/branches/${branchId}/transactions`));
    batch.set(transactionRef, {
        ...transactionData,
        date: serverTimestamp(),
    });

    // 2. Update stock for each product
    await Promise.all(items.map(async (item) => {
        const productRef = doc(db, `businesses/${businessId}/branches/${branchId}/products`, item.id);
        
        // To safely decrement stock, we need a transaction
        await runTransaction(db, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error(`Product ${item.id} not found!`);
            }
            const currentStock = productDoc.data().stock || 0;
            const newStock = currentStock - item.quantity;
            if (newStock < 0) {
                 throw new Error(`Not enough stock for ${productDoc.data().name}.`);
            }
            transaction.update(productRef, { stock: newStock });
        });
    }));

    // The stock updates are done in separate transactions, so we don't commit them in the main batch.
    // We only commit the transaction creation here.
    const transactionCreationBatch = writeBatch(db);
    transactionCreationBatch.set(transactionRef, { ...transactionData, date: serverTimestamp() });
    
    // We need to re-run the stock updates in batch mode if we want them to be atomic with the transaction creation.
    // For simplicity and safety, we will use Firestore transactions for stock updates which run separately.
    // The below batch will just add the transaction record. The stock has been updated above.

    return await batch.commit();
}


// === Inventory Functions (Readonly for now, derived from products) ===
export async function getInventoryForBranch(branchId: string) {
    // Inventory is now derived from the products of a specific branch
    const products = await getProductsForBranch(branchId);
    return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
    }));
}


// === User Management ===
export async function getUsers() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) return [];
        const usersCollectionRef = collection(db, USERS_COLLECTION);
        // This queries all users, in a real app you'd filter by businessId
        const q = query(usersCollectionRef, where("businessId", "==", businessId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("Could not fetch users, maybe none are created yet.", error);
        return [];
    }
}


// === Generic Getters (Legacy, to be phased out) ===
// These functions might be useful for a global view but most logic should be branch-specific.
export async function getProducts() {
    const businessId = await getBusinessId();
    if (!businessId) return [];
    // This is ambiguous. Let's assume it gets products from the first branch for now.
    // A better implementation would require a branchId or be removed.
    const businesses = await getBusinessWithBranches();
    if (businesses.length > 0 && businesses[0].branches && businesses[0].branches.length > 0) {
        return getProductsForBranch(businesses[0].branches[0].id);
    }
    return [];
}

export async function getTransactions() {
    const businessId = await getBusinessId();
    if (!businessId) return [];
    const businesses = await getBusinessWithBranches();
    if (businesses.length > 0 && businesses[0].branches && businesses[0].branches.length > 0) {
        return getTransactionsForBranch(businesses[0].branches[0].id);
    }
    return [];
}
