
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
  setDoc,
  collectionGroup,
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
    units?: string[];
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
        // This can happen if the user is the superadmin who doesn't have a businessId
        if (user.email === 'superadmin@gmail.com') return null;
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
        units: ['pcs', 'kg', 'liter'], // Default units
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
    // 1. Fetch all businesses
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), orderBy("createdAt", "desc"));
    const businessSnapshot = await getDocs(businessQuery);
    const businessesData = businessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Business[];
    const businessMap = new Map(businessesData.map(b => [b.id, { ...b, branches: [], users: [] }]));

    // 2. Fetch all branches using a collectionGroup query
    const branchesQuery = query(collectionGroup(db, BRANCHES_COLLECTION));
    const branchesSnapshot = await getDocs(branchesQuery);
    branchesSnapshot.forEach(branchDoc => {
        const branchData = { id: branchDoc.id, ...branchDoc.data() };
        const businessId = branchDoc.ref.parent.parent?.id;
        if (businessId && businessMap.has(businessId)) {
            businessMap.get(businessId)?.branches.push(branchData as any);
        }
    });
    
    // 3. Fetch all users
    const usersQuery = query(collection(db, USERS_COLLECTION));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(userDoc => {
        const userData = { id: userDoc.id, ...userDoc.data() };
        const businessId = userData.businessId;
        if (businessId && businessMap.has(businessId)) {
            businessMap.get(businessId)?.users.push(userData as any);
        }
    });

    return Array.from(businessMap.values());
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
    if (!businessId || !branchId) {
        throw new Error("No business ID or branch ID found.");
    }

    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    const q = query(productsCollectionRef);
    const querySnapshot = await getDocs(q);
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

export async function upsertProductsBySku(branchId: string, productsData: any[]) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");

    const productsRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const existingProducts = new Map(querySnapshot.docs.map(doc => [doc.data().sku, { id: doc.id, ...doc.data() }]));

    const batch = writeBatch(db);
    let updated = 0;
    let inserted = 0;

    for (const product of productsData) {
        // Ensure numeric fields are numbers
        product.price = parseFloat(product.price);
        product.purchasePrice = parseFloat(product.purchasePrice);
        product.stock = parseInt(product.stock, 10);

        if(isNaN(product.price) || isNaN(product.purchasePrice) || isNaN(product.stock)) {
            console.warn("Skipping product with invalid number format:", product);
            continue;
        }

        const existing = existingProducts.get(product.sku);

        if (existing) {
            const docRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, existing.id);
            batch.set(docRef, product, { merge: true });
            updated++;
        } else {
            const docRef = doc(collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION));
            batch.set(docRef, { ...product, createdAt: serverTimestamp() });
            inserted++;
        }
    }

    await batch.commit();
    return { updated, inserted };
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

export async function upsertCustomersByEmail(customersData: any[]) {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("No business ID found");

    const customersRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);
    const q = query(customersRef);
    const querySnapshot = await getDocs(q);
    const existingCustomers = new Map(querySnapshot.docs.map(doc => [doc.data().email, { id: doc.id, ...doc.data() }]));

    const batch = writeBatch(db);
    let updated = 0;
    let inserted = 0;

    for (const customer of customersData) {
        if (!customer.email || !customer.name || !customer.phone) {
            console.warn("Skipping customer with missing required fields:", customer);
            continue;
        }

        const existing = existingCustomers.get(customer.email);
        const customerPayload = {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
        };

        if (existing) {
            const docRef = doc(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION, existing.id);
            batch.update(docRef, { ...customerPayload, updatedAt: serverTimestamp() });
            updated++;
        } else {
            const docRef = doc(collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION));
            batch.set(docRef, {
                ...customerPayload,
                totalSpent: 0,
                avatar: `https://picsum.photos/seed/${Math.random()}/40/40`,
                createdAt: serverTimestamp(),
            });
            inserted++;
        }
    }

    await batch.commit();
    return { updated, inserted };
}


// === Transaction Functions (Branch Specific) ===
export async function getTransactionsForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) {
        throw new Error("No business ID or branch ID found.");
    }
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

export async function getTransactionById(transactionId: string): Promise<DocumentData | null> {
    if (!transactionId) return null;
    const businessId = await getBusinessId();
    if (!businessId) {
        // This could be a superadmin, so we need to search across all businesses
        const transactionQuery = query(collectionGroup(db, TRANSACTIONS_COLLECTION));
        const snapshot = await getDocs(transactionQuery);
        const transactionDoc = snapshot.docs.find(d => d.id === transactionId);
        
        if (transactionDoc && transactionDoc.exists()) {
            const data = transactionDoc.data();
            const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString();
            return { id: transactionDoc.id, ...data, date: date };
        }

    } else {
        // Find in the user's specific business
        const transactionQuery = query(collectionGroup(db, TRANSACTIONS_COLLECTION), where('__name__', '>=', `businesses/${businessId}/`), where('__name__', '<', `businesses/${businessId}~`));
        const snapshot = await getDocs(transactionQuery);
        const transactionDoc = snapshot.docs.find(d => d.id === transactionId);

        if (transactionDoc && transactionDoc.exists()) {
             const data = transactionDoc.data();
            const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString();
            return { id: transactionDoc.id, ...data, date: date };
        }
    }


    console.warn(`Transaction with ID ${transactionId} not found.`);
    return null;
}


export async function addTransactionAndUpdateStock(
  branchId: string,
  customerId: string | null,
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
  
  // 3. Update customer's totalSpent if a customer is associated
  if (customerId && transactionData.type === 'Sale') {
    const customerRef = doc(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION, customerId);
    batch.update(customerRef, { totalSpent: increment(transactionData.amount) });
  }

  // 4. Commit all writes at once
  await batch.commit();
}

type RefundItem = {
    id: string;
    quantity: number;
    price: number;
}

export async function refundTransaction(branchId: string, originalTransaction: DocumentData, itemsToRefund: RefundItem[], totalRefundAmount: number) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) throw new Error("Missing business or branch ID");
    if (originalTransaction.status === 'Refunded') throw new Error("Transaction has already been fully refunded.");

    const batch = writeBatch(db);

    // 1. Create a new "Refund" transaction
    const refundTransactionRef = doc(collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION));
    batch.set(refundTransactionRef, {
        customerName: originalTransaction.customerName,
        amount: -totalRefundAmount, // Negative amount for refund
        originalTransactionId: originalTransaction.id,
        status: 'Refunded',
        type: 'Refund',
        items: itemsToRefund.map(item => ({
            ...originalTransaction.items.find((i: any) => i.id === item.id), // Get original item details
            quantity: item.quantity, // Overwrite with refunded quantity
        })),
        currency: originalTransaction.currency,
        date: serverTimestamp(),
    });

    // 2. Restore stock for each refunded item
    for (const item of itemsToRefund) {
        const productRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, item.id);
        batch.update(productRef, { stock: increment(item.quantity) });
    }

    // 3. Check if all items were refunded to update the original transaction status
    const allItemsRefunded = originalTransaction.items.every((origItem: any) => {
        const refundedItem = itemsToRefund.find(refItem => refItem.id === origItem.id);
        const previouslyRefunded = (originalTransaction.refundedItems || {})[origItem.id] || 0;
        return (refundedItem ? refundedItem.quantity : 0) + previouslyRefunded >= origItem.quantity;
    });

    const newStatus = allItemsRefunded ? 'Refunded' : 'Partially Refunded';

    // 4. Update the original transaction status and refunded items
    const originalTransactionRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION, originalTransaction.id);
    const updatedRefundedItems = { ...(originalTransaction.refundedItems || {}) };
    for (const item of itemsToRefund) {
        updatedRefundedItems[item.id] = (updatedRefundedItems[item.id] || 0) + item.quantity;
    }
    
    batch.update(originalTransactionRef, { 
        status: newStatus,
        refundedItems: updatedRefundedItems,
        amount: increment(-totalRefundAmount) // Decrease the original transaction amount
    });

    // 5. Update the customer's totalSpent
    if (originalTransaction.customerName !== 'Anonymous') {
        const customersQuery = query(collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION), where("name", "==", originalTransaction.customerName), limit(1));
        const customersSnapshot = await getDocs(customersQuery);
        if (!customersSnapshot.empty) {
            const customerDoc = customersSnapshot.docs[0];
            batch.update(customerDoc.ref, { totalSpent: increment(-totalRefundAmount) });
        }
    }
    
    // 6. Commit all writes
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

type NewUser = {
    name: string;
    email: string;
    password?: string;
    role: 'Admin' | 'Staff' | string;
};

export async function addUserToBusiness(userData: NewUser) {
    const businessId = await getBusinessId();
    if (!businessId) {
        throw new Error("Current user is not associated with a business.");
    }
    if (!userData.email || !userData.password) {
        throw new Error("Email and password are required to create a new user.");
    }

    // First, check if a user with this email already exists in the Firebase Authentication
    // This is a more reliable way to check for existing users system-wide.
    // However, for simplicity and to avoid admin SDK, we'll rely on createUserWithEmailAndPassword's error.
    
    // Firestore check (optional, but good for specific error messages)
    const usersCollectionRef = collection(db, USERS_COLLECTION);
    const existingUserQuery = query(usersCollectionRef, where("email", "==", userData.email), limit(1));
    const existingUserSnapshot = await getDocs(existingUserQuery);

    if (!existingUserSnapshot.empty) {
        const error = new Error("Email address is already in use by another account in the system.") as any;
        error.code = "auth/email-already-in-use";
        throw error;
    }
    
    // If no user in Firestore, proceed to create in Auth and then Firestore
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;
    
    const batch = writeBatch(db);
    const userRef = doc(collection(db, USERS_COLLECTION));

    batch.set(userRef, {
        uid: user.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        businessId: businessId,
        createdAt: serverTimestamp(),
    });
    
    await batch.commit();

    return { userId: userRef.id };
}


export async function deleteUserFromBusiness(userId: string): Promise<void> {
    const businessId = await getBusinessId();
    if (!businessId) throw new Error("Current user is not associated with a business.");

    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (!userData || userData.businessId !== businessId) {
        throw new Error("User does not belong to this business or does not exist.");
    }
    
    // Note: This only deletes the Firestore document, revoking access to the app's business logic.
    // It does NOT delete the user from Firebase Authentication.
    await deleteDoc(userDocRef);
}



// === Promotion Functions (Branch Specific) ===
export async function getPromosForBranch(branchId: string) {
    const businessId = await getBusinessId();
    if (!businessId || !branchId) {
        throw new Error("No business ID or branch ID found.");
    }
    
    const promosCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION);
    const q = query(promosCollectionRef);

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
    
    const productsPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${PRODUCTS_COLLECTION}`;
    const transactionsPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${TRANSACTIONS_COLLECTION}`;
    const promosPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${PROMOS_COLLECTION}`;
    
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
    const existingProductsQuery = query(productsCollectionRef, limit(1));
    const existingProducts = await getDocs(existingProductsQuery);
    if (!existingProducts.empty) {
        console.log("Branch already has products. Seeding aborted.");
        return false; // Indicate that seeding was not performed
    }

    const batch = writeBatch(db);

    const initialProducts = [
        { name: 'Espresso', sku: 'CF-ESP-01', price: 2.99, purchasePrice: 1.50, stock: 100, category: 'Coffee', unit: 'pcs', imageUrl: `https://picsum.photos/seed/espresso/400/400` },
        { name: 'Latte', sku: 'CF-LAT-01', price: 4.50, purchasePrice: 2.50, stock: 75, category: 'Coffee', unit: 'pcs', imageUrl: `https://picsum.photos/seed/latte/400/400` },
        { name: 'Croissant', sku: 'PS-CRO-01', price: 3.25, purchasePrice: 1.75, stock: 50, category: 'Pastry', unit: 'pcs', imageUrl: `https://picsum.photos/seed/croissant/400/400` },
        { name: 'Iced Tea', sku: 'BV-TEA-01', price: 3.00, purchasePrice: 1.20, stock: 80, category: 'Beverage', unit: 'pcs', imageUrl: `https://picsum.photos/seed/icedtea/400/400` },
        { name: 'Blueberry Muffin', sku: 'PS-MUF-01', price: 3.50, purchasePrice: 2.00, stock: 40, category: 'Pastry', unit: 'pcs', imageUrl: `https://picsum.photos/seed/muffin/400/400` },
        { name: 'Sandwich', sku: 'FD-SAN-01', price: 8.99, purchasePrice: 5.50, stock: 20, category: 'Food', unit: 'pcs', imageUrl: `https://picsum.photos/seed/sandwich/400/400` },
    ];

    initialProducts.forEach(product => {
        const docRef = doc(productsCollectionRef);
        batch.set(docRef, { 
            ...product, 
            createdAt: serverTimestamp() 
        });
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
