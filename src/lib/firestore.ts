
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
  increment,
  Timestamp,
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
const PROMOS_COLLECTION = 'promos';


type BusinessData = {
    adminName: string;
    email: string;
    password?: string;
    businessName: string;
    businessType: string;
    currency?: string;
    taxEnabled?: boolean;
    taxRate?: number;
    isActive?: boolean;
    branches: {
        name: string;
        address: string;
        phone: string;
    }[];
}

// Helper to get the first (and only) active business ID.
async function getBusinessId(): Promise<string> {
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), where("isActive", "!=", false), limit(1));
    const businessSnapshot = await getDocs(businessQuery);
    if (businessSnapshot.empty) {
        console.warn("No active business found in the database. Please register a business or activate one.");
        return "";
    }
    return businessSnapshot.docs[0].id;
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
        isActive: true,
        createdAt: serverTimestamp(),
    });

    // 2. Create Branch documents 
    data.branches.forEach(branchData => {
        const branchRef = doc(collection(db, `businesses/${businessRef.id}/branches`));
        batch.set(branchRef, {
            ...branchData,
            isActive: true,
            createdAt: serverTimestamp(),
        });
    });

    // 3. Create the User document
    const userRef = doc(collection(db, USERS_COLLECTION));
    batch.set(userRef, {
        name: data.adminName,
        email: data.email,
        role: 'Admin',
        businessId: businessRef.id,
        createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { userId: userRef.id, businessId: businessRef.id };
}

// === Get Business and its Branches ===
export async function getBusinessWithBranches() {
    // This is called by the main app, so we assume we want the first active business
    // for now. A multi-business login flow would change this.
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), where("isActive", "!=", false), limit(1));
    const businessSnapshot = await getDocs(businessQuery);
    
    if (businessSnapshot.empty) {
        // Attempt to find any business, even inactive ones, to guide user.
        const anyBusinessQuery = query(collection(db, BUSINESSES_COLLECTION), limit(1));
        const anyBusinessSnapshot = await getDocs(anyBusinessQuery);
        if (anyBusinessSnapshot.empty) {
             console.log("No businesses found at all.");
             return [];
        }
         console.log("Found an inactive business. User should see no active branches.");
         // returning the inactive business so the select branch page can inform the user
         const businessDoc = anyBusinessSnapshot.docs[0];
         const business = { id: businessDoc.id, ...businessDoc.data(), branches: [] }; // No branches to select
         return [business];
    }

    const businesses = await Promise.all(businessSnapshot.docs.map(async (businessDoc) => {
        const business = { id: businessDoc.id, ...businessDoc.data() };
        const branchesCollectionRef = collection(db, `businesses/${business.id}/branches`);
        const branchesQuery = query(branchesCollectionRef, where("isActive", "==", true));
        const branchesSnapshot = await getDocs(branchesQuery);
        const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));
        return { ...business, branches };
    }));

    return businesses;
}

// === Super Admin functions ===
export async function getAllBusinesses() {
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), orderBy("createdAt", "desc"));
    const businessSnapshot = await getDocs(businessQuery);
    
    const businesses = await Promise.all(businessSnapshot.docs.map(async (businessDoc) => {
        const business = { id: businessDoc.id, ...businessDoc.data() };
        const branchesCollectionRef = collection(db, `businesses/${business.id}/branches`);
        const branchesQuery = query(branchesCollectionRef);
        const branchesSnapshot = await getDocs(branchesQuery);
        const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));
        return { ...business, branches };
    }));

    return businesses;
}


export async function updateBusiness(businessId: string, businessData: Partial<BusinessData>) {
    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    return await updateDoc(businessDocRef, {
        ...businessData,
        updatedAt: serverTimestamp()
    });
}

export async function deleteBusiness(businessId: string) {
    // IMPORTANT: This deletes the business document but NOT its sub-collections (branches, products, etc.).
    // A complete deletion requires a Firebase Cloud Function. This is a client-side simplification.
    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    return await deleteDoc(businessDocRef);
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

export async function addTransactionAndUpdateStock(
  branchId: string,
  transactionData: Omit<DocumentData, 'id'>,
  items: { id: string; quantity: number }[]
) {
  const businessId = await getBusinessId();
  if (!businessId || !branchId) throw new Error("Missing business or branch ID");

  const batch = writeBatch(db);

  // 1. Add the new transaction document
  const transactionRef = doc(collection(db, `businesses/${businessId}/branches/${branchId}/transactions`));
  batch.set(transactionRef, {
    ...transactionData,
    date: serverTimestamp(), // Use server timestamp for consistency
  });

  // 2. Update stock for each product in the same batch
  for (const item of items) {
    const productRef = doc(db, `businesses/${businessId}/branches/${branchId}/products`, item.id);
    // Decrement stock by the quantity sold.
    batch.update(productRef, { stock: increment(-item.quantity) });
  }
  
  // 3. Commit the batch
  await batch.commit();
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

// === Promotion Functions (Branch Specific) ===
export async function getPromosForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) return [];
    const promosCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/${PROMOS_COLLECTION}`);
    const q = query(promosCollectionRef, orderBy("endDate", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Ensure dates are strings for client-side rendering
            startDate: data.startDate.toDate().toISOString(),
            endDate: data.endDate.toDate().toISOString(),
        }
    });
}

export async function addPromoToBranch(branchId: string, promoData: Omit<DocumentData, 'id'>) {
    const businessId = await getBusinessId();
    const promosCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/${PROMOS_COLLECTION}`);
    return await addDoc(promosCollectionRef, {
        ...promoData,
        // Convert JS dates to Firestore Timestamps
        startDate: Timestamp.fromDate(new Date(promoData.startDate)),
        endDate: Timestamp.fromDate(new Date(promoData.endDate)),
        createdAt: serverTimestamp()
    });
}

export async function deletePromoFromBranch(branchId: string, promoId: string) {
    const businessId = await getBusinessId();
    const promoDocRef = doc(db, `businesses/${businessId}/branches/${branchId}/${PROMOS_COLLECTION}`, promoId);
    return await deleteDoc(promoDocRef);
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
