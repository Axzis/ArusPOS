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
} from 'firebase/firestore';
import { products as initialProducts, customers, transactions, inventory } from './data';

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
    });

    // 3. Create the User document
    const userRef = doc(collection(db, USERS_COLLECTION));
    batch.set(userRef, {
        name: data.adminName,
        email: data.email,
        role: 'Admin',
        businessId: businessRef.id,
        // In a real app, assign user to all branches initially or a specific one
        assignedBranches: data.branches.map((_, index) => ({ branchId: `GENERATED_ID_${index}`, role: 'Admin' })),
        createdAt: serverTimestamp(),
    });

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
        const branchesCollectionRef = collection(db, `businesses/${business.id}/branches`);
        const branchesQuery = query(branchesCollectionRef, where("isActive", "==", true));
        const branchesSnapshot = await getDocs(branchesQuery);
        const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));
        return { ...business, branches };
    }));

    return businesses;
}


// === Product Functions (Branch Specific) ===
export async function getProductsForBranch(branchId: string) {
    const businessId = (await getBusinessWithBranches())[0].id; // Assuming single business for now
    const productsCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/products`);
    const querySnapshot = await getDocs(productsCollectionRef);
    const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return products;
}

export async function addProductToBranch(branchId: string, productData: Omit<DocumentData, 'id'>) {
    const businessId = (await getBusinessWithBranches())[0].id;
    const productsCollectionRef = collection(db, `businesses/${businessId}/branches/${branchId}/products`);
    return await addDoc(productsCollectionRef, {
        ...productData,
        createdAt: serverTimestamp()
    });
}

export async function updateProductInBranch(branchId: string, productId: string, productData: Partial<DocumentData>) {
    const businessId = (await getBusinessWithBranches())[0].id;
    const productDocRef = doc(db, `businesses/${businessId}/branches/${branchId}/products`, productId);
    return await updateDoc(productDocRef, {
        ...productData,
        updatedAt: serverTimestamp()
    });
}

export async function deleteProductFromBranch(branchId: string, productId: string) {
    const businessId = (await getBusinessWithBranches())[0].id;
    const productDocRef = doc(db, `businesses/${businessId}/branches/${branchId}/products`, productId);
    return await deleteDoc(productDocRef);
}


// === Customer Functions (Global for now, can be branch specific) ===
export async function getCustomers() {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const customers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (customers.length === 0) { // Seed if empty
        const batch = writeBatch(db);
        customers.forEach(c => {
            const docRef = doc(collection(db, CUSTOMERS_COLLECTION));
            batch.set(docRef, c);
        });
        await batch.commit();
        return await getCustomers();
    }
    return customers;
}

// === Transaction Functions (Branch Specific) ===
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
        transactions.forEach(t => {
            const docRef = doc(collection(db, TRANSACTIONS_COLLECTION));
            batch.set(docRef, {...t, date: new Date(t.date)});
        });
        await batch.commit();
        return await getTransactions();
    }
    return transactions;
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


// === Generic Getters (Used for legacy data) ===
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