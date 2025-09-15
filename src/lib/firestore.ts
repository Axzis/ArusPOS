

import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
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
  increment,
  Timestamp,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const BUSINESSES_COLLECTION = 'businesses';
const BRANCHES_COLLECTION = 'branches';
const PRODUCTS_COLLECTION = 'products';
const CUSTOMERS_COLLECTION = 'customers';
const TRANSACTIONS_COLLECTION = 'transactions';
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

// Helper to get the business ID associated with the currently logged-in user.
async function getBusinessId(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
        console.warn("No authenticated user found.");
        return null;
    }

    const usersQuery = query(collection(db, USERS_COLLECTION), where("uid", "==", user.uid), limit(1));
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
        console.warn(`No user document found for UID: ${user.uid}`);
        return null;
    }

    const userData = usersSnapshot.docs[0].data();
    return userData.businessId || null;
}


// === New Business and User Registration ===
export async function addUserAndBusiness(data: BusinessData) {
    if (!data.email || !data.password) {
        throw new Error("Email and password are required to create a new user.");
    }
    
    // 1. Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;

    const batch = writeBatch(db);

    // 2. Create the Business document
    const businessRef = doc(collection(db, BUSINESSES_COLLECTION));
    batch.set(businessRef, {
        name: data.businessName,
        type: data.businessType,
        currency: 'USD', // Default currency
        taxEnabled: true,
        taxRate: 8,
        isActive: true,
        createdAt: serverTimestamp(),
        adminUid: user.uid,
    });

    // 3. Create Branch documents 
    data.branches.forEach(branchData => {
        const branchRef = doc(collection(db, `businesses/${businessRef.id}/branches`));
        batch.set(branchRef, {
            ...branchData,
            isActive: true,
            createdAt: serverTimestamp(),
        });
    });

    // 4. Create the User document in Firestore
    const userRef = doc(collection(db, USERS_COLLECTION));
    batch.set(userRef, {
        uid: user.uid,
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
    const businessId = await getBusinessId();
    if (!businessId) {
        return [];
    }

    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    const businessDoc = await getDoc(businessDocRef);

    if (!businessDoc.exists()) {
        console.error(`Business with ID ${businessId} not found.`);
        return [];
    }
    
    const business = { id: businessDoc.id, ...businessDoc.data() };
    
    // If business is inactive, return it but with empty branches to prevent access.
    if (business.isActive === false) {
        return [{ ...business, branches: [] }];
    }
        
    const branchesCollectionRef = collection(db, `businesses/${business.id}/branches`);
    const branchesQuery = query(branchesCollectionRef, where("isActive", "==", true));
    const branchesSnapshot = await getDocs(branchesQuery);
    const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));

    return [{ ...business, branches }];
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
    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    return await deleteDoc(businessDocRef);
}


// === Product Functions (Branch Specific) ===
export async function getProductsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) return [];
    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    const querySnapshot = await getDocs(productsCollectionRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addProductToBranch(branchId: string, productData: Omit<DocumentData, 'id'>) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");
    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    return await addDoc(productsCollectionRef, {
        ...productData,
        createdAt: serverTimestamp()
    });
}

export async function updateProductInBranch(branchId: string, productId: string, productData: Partial<DocumentData>) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");
    const productDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, productId);
    return await updateDoc(productDocRef, {
        ...productData,
        updatedAt: serverTimestamp()
    });
}

export async function deleteProductFromBranch(branchId: string, productId: string) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");
    const productDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, productId);
    return await deleteDoc(productDocRef);
}


// === Customer Functions (Global for the business) ===
export async function getCustomers() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) return [];
        const customersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);
        const querySnapshot = await getDocs(customersCollectionRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("Could not fetch customers, maybe none are created yet.", error);
        return [];
    }
}

export async function addCustomer(customerData: { name: string, email: string, phone: string }) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found to add customer to.");
    
    const customersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);
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
    const customerDocRef = doc(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION, customerId);
    return await deleteDoc(customerDocRef);
}


// === Transaction Functions (Branch Specific) ===
export async function getTransactionsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) return [];
    const transactionsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION);
    const q = query(transactionsCollectionRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to ISO string date, handle serverTimestamp pending write
        const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString();
        return {
            id: doc.id,
            ...data,
            date: date,
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

  // 1. Add the transaction document
  const transactionRef = doc(collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION));
  batch.set(transactionRef, {
    ...transactionData,
    date: serverTimestamp(),
  });

  // 2. Update stock for each item in the transaction
  for (const item of items) {
    const productRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, item.id);
    batch.update(productRef, { stock: increment(-item.quantity) });
  }
  
  // 3. Commit all writes at once
  await batch.commit();
}


// === Inventory Functions ===
export async function getInventoryForBranch(branchId: string) {
    const products = await getProductsForBranch(branchId);
    return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: (p as any).stock,
    }));
}


// === User Management ===
export async function getUsers() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) return [];
        const usersCollectionRef = collection(db, USERS_COLLECTION);
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
    const promosCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION);
    const q = query(promosCollectionRef, orderBy("endDate", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const startDate = data.startDate;
        const endDate = data.endDate;

        return {
            id: doc.id,
            ...data,
            startDate: startDate instanceof Timestamp ? startDate.toDate().toISOString() : startDate,
            endDate: endDate instanceof Timestamp ? endDate.toDate().toISOString() : endDate,
        }
    });
}

export async function addPromoToBranch(branchId: string, promoData: Omit<DocumentData, 'id'>) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");
    const promosCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION);
    return await addDoc(promosCollectionRef, {
        ...promoData,
        startDate: Timestamp.fromDate(new Date(promoData.startDate)),
        endDate: Timestamp.fromDate(new Date(promoData.endDate)),
        createdAt: serverTimestamp()
    });
}

export async function deletePromoFromBranch(branchId: string, promoId: string) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");
    const promoDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION, promoId);
    return await deleteDoc(promoDocRef);
}

// === Seeding & Reset Functions ===

async function deleteCollection(collectionPath: string) {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return; // Nothing to delete
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}


export async function resetBranchData(branchId: string): Promise<void> {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) {
        throw new Error("Missing Business ID or Branch ID for reset.");
    }
    
    // Define paths for collections to be deleted
    const productsPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${PRODUCTS_COLLECTION}`;
    const transactionsPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${TRANSACTIONS_COLLECTION}`;
    const promosPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${PROMOS_COLLECTION}`;

    // Note: Customers are global to the business, so we do not delete them when resetting a branch.

    // Execute deletions in parallel
    await Promise.all([
        deleteCollection(productsPath),
        deleteCollection(transactionsPath),
        deleteCollection(promosPath),
    ]);
}


export async function seedInitialDataForBranch(branchId: string): Promise<boolean> {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) {
        throw new Error("Missing Business ID or Branch ID for seeding.");
    }

    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    const customersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);

    // Check if products already exist to prevent re-seeding
    const existingProducts = await getDocs(query(productsCollectionRef, limit(1)));
    if (!existingProducts.empty) {
        console.log("Branch already has products. Seeding aborted.");
        return false; // Indicate that seeding was not performed
    }

    const batch = writeBatch(db);

    const initialProducts = [
        { name: 'Espresso', sku: 'CF-ESP-01', price: 2.99, purchasePrice: 1.50, stock: 100, category: 'Coffee', unit: 'pcs' },
        { name: 'Latte', sku: 'CF-LAT-01', price: 4.50, purchasePrice: 2.50, stock: 75, category: 'Coffee', unit: 'pcs' },
        { name: 'Croissant', sku: 'PS-CRO-01', price: 3.25, purchasePrice: 1.75, stock: 50, category: 'Pastry', unit: 'pcs' },
        { name: 'Iced Tea', sku: 'BV-TEA-01', price: 3.00, purchasePrice: 1.20, stock: 80, category: 'Beverage', unit: 'pcs' },
        { name: 'Blueberry Muffin', sku: 'PS-MUF-01', price: 3.50, purchasePrice: 2.00, stock: 40, category: 'Pastry', unit: 'pcs' },
        { name: 'Sandwich', sku: 'FD-SAN-01', price: 8.99, purchasePrice: 5.50, stock: 20, category: 'Food', unit: 'pcs' },
    ];

    initialProducts.forEach(product => {
        const docRef = doc(productsCollectionRef);
        batch.set(docRef, { ...product, createdAt: serverTimestamp() });
    });
    
    // Check if customers collection is empty before seeding
    const existingCustomers = await getDocs(query(customersCollectionRef, limit(1)));
    if (existingCustomers.empty) {
        const initialCustomers = [
            { name: 'Liam Johnson', email: 'liam@example.com', phone: '555-0101', totalSpent: 0, avatar: 'https://picsum.photos/seed/1/40/40', createdAt: serverTimestamp() },
            { name: 'Olivia Smith', email: 'olivia@example.com', phone: '555-0102', totalSpent: 0, avatar: 'https://picsum.photos/seed/2/40/40', createdAt: serverTimestamp() },
            { name: 'Noah Williams', email: 'noah@example.com', phone: '555-0103', totalSpent: 0, avatar: 'https://picsum.photos/seed/3/40/40', createdAt: serverTimestamp() },
        ];
        
        initialCustomers.forEach(customer => {
            const docRef = doc(customersCollectionRef);
            batch.set(docRef, { ...customer });
        });
    }

    await batch.commit();
    return true; // Indicate that seeding was successful
}

      