
import { Auth, createUserWithEmailAndPassword, User } from 'firebase/auth';
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
  increment,
  Timestamp,
  setDoc,
  collectionGroup,
  Firestore,
} from 'firebase/firestore';
import { isSuperAdminUser } from './config';


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
    paperSize?: 'A4' | '8cm' | '5.8cm';
    branches: {
        name: string;
        address: string;
        phone: string;
    }[];
}

// === Super Admin User Creation (Auth only) ===
export async function createAuthUser(auth: Auth, email: string, password?: string) {
     if (!email || !password) {
        throw new Error("Email and password are required to create a new user.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

// Get Business ID for a given user
export async function getBusinessId(db: Firestore, user: User): Promise<{ businessId: string | null; userData: DocumentData | null; }> {
    if (!user || !user.uid) {
        console.warn("getBusinessId called with an invalid user object.");
        return { businessId: null, userData: null };
    }

    if (user.email && isSuperAdminUser(user.email)) {
        return { businessId: null, userData: null };
    }
    
    const usersQuery = query(collectionGroup(db, USERS_COLLECTION), where("uid", "==", user.uid), limit(1));
    const userSnapshot = await getDocs(usersQuery);

    if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        return { businessId: userData.businessId || null, userData: userData };
    } else {
        console.warn(`No user document found for UID: ${user.uid}`);
        return { businessId: null, userData: null };
    }
}


// === New Business and User Registration ===
export async function addUserAndBusiness(auth: Auth, db: Firestore, data: BusinessData) {
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
        paperSize: '8cm', // Default paper size
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

    // 4. Create the User document in a sub-collection of the business
    const userRef = doc(collection(db, `businesses/${businessRef.id}/${USERS_COLLECTION}`));
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
export async function getBusinessWithBranches(db: Firestore, businessId: string | null) {
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
    
    if (business.isActive === false) {
        return [{ ...business, branches: [] }];
    }
        
    const branchesCollectionRef = collection(db, `businesses/${business.id}/branches`);
    const branchesQuery = query(branchesCollectionRef);
    const branchesSnapshot = await getDocs(branchesQuery);
    const branches = branchesSnapshot.docs.map(branchDoc => ({ id: branchDoc.id, ...branchDoc.data() }));

    return [{ ...business, branches }];
}


// === Super Admin functions ===
export async function getAllBusinesses(db: Firestore) {
    // 1. Fetch all businesses
    const businessQuery = query(collection(db, BUSINESSES_COLLECTION), orderBy("createdAt", "desc"));
    const businessSnapshot = await getDocs(businessQuery);
    const businessesData = businessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
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
    
    // 3. Fetch all users using a collectionGroup query
    const usersQuery = query(collectionGroup(db, USERS_COLLECTION));
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


export async function updateBusiness(db: Firestore, businessId: string, businessData: Partial<BusinessData>) {
    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    return await updateDoc(businessDocRef, {
        ...businessData,
        updatedAt: serverTimestamp()
    });
}

export async function deleteBusiness(db: Firestore, businessId: string) {
    const businessDocRef = doc(db, BUSINESSES_COLLECTION, businessId);
    return await deleteDoc(businessDocRef);
}


// === Product Functions (Branch Specific) ===
export async function getProductsForBranch(db: Firestore, businessId: string, branchId: string) {
    if (!businessId || !branchId) {
        throw new Error("No business ID or branch ID found.");
    }

    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    const q = query(productsCollectionRef, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addProductToBranch(db: Firestore, businessId: string, branchId: string, productData: Omit<DocumentData, 'id'>) {
    if (!businessId) throw new Error("No business ID found");
    
    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    return await addDoc(productsCollectionRef, {
        ...productData,
        createdAt: serverTimestamp()
    });
}

export async function updateProductInBranch(db: Firestore, businessId: string, branchId: string, productId: string, productData: Partial<DocumentData>) {
    if (!businessId) throw new Error("No business ID found");

    const productDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, productId);
    return await updateDoc(productDocRef, {
        ...productData,
        updatedAt: serverTimestamp()
    });
}

export async function deleteProductFromBranch(db: Firestore, businessId: string, branchId: string, productId: string) {
    if (!businessId) throw new Error("No business ID found");

    const productDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, productId);
    return await deleteDoc(productDocRef);
}

export async function upsertProductsBySku(db: Firestore, businessId: string, branchId: string, productsData: any[]) {
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
export async function getCustomers(db: Firestore, businessId: string) {
    if (!businessId) return [];
    try {
        const customersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);
        const q = query(customersCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("Could not fetch customers, maybe none are created yet.", error);
        return [];
    }
}

export async function addCustomer(db: Firestore, businessId: string, customerData: { name: string, email: string, phone: string }) {
    if (!businessId) throw new Error("No business ID found to add customer to.");
    
    const customersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);
    const newCustomer = {
        ...customerData,
        totalSpent: 0,
        createdAt: serverTimestamp(),
    };
    return await addDoc(customersCollectionRef, newCustomer);
}

export async function deleteCustomer(db: Firestore, businessId: string, customerId: string) {
    if (!businessId) throw new Error("No business ID found to delete customer from.");
    const customerDocRef = doc(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION, customerId);
    return await deleteDoc(customerDocRef);
}

export async function upsertCustomersByEmail(db: Firestore, businessId: string, customersData: any[]) {
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
export async function getTransactionsForBranch(db: Firestore, businessId: string, branchId: string) {
    if (!businessId || !branchId) {
        throw new Error("No business ID or branch ID found.");
    }
    const transactionsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION);
    const q = query(transactionsCollectionRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString();
        return {
            id: doc.id,
            ...data,
            date: date,
        }
    });
}

export async function getTransactionById(db: Firestore, businessId: string, branchId: string, transactionId: string): Promise<DocumentData | null> {
    if (!businessId || !branchId || !transactionId) {
        console.warn("Get transaction by ID requires a valid business, branch, and transaction ID.");
        return null;
    }

    const transactionDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION, transactionId);
    const transactionDoc = await getDoc(transactionDocRef);

    if (transactionDoc.exists()) {
        const data = transactionDoc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString();
        return { id: transactionDoc.id, ...data, date: date };
    }

    console.warn(`Transaction with ID ${transactionId} not found in branch ${branchId}.`);
    return null;
}


export async function addTransactionAndUpdateStock(
  db: Firestore,
  businessId: string,
  branchId: string,
  customerId: string | null,
  transactionData: Omit<DocumentData, 'id'>,
  items: { id: string; quantity: number }[],
  cashierName: string,
) {
  if (!businessId || !branchId) throw new Error("Missing business or branch ID");
  
  const batch = writeBatch(db);

  // 1. Add the transaction document
  const transactionRef = doc(collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION));
  batch.set(transactionRef, {
    ...transactionData,
    cashierName: cashierName,
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

export async function refundTransaction(
    db: Firestore,
    businessId: string,
    branchId: string, 
    originalTransaction: DocumentData, 
    itemsToRefund: RefundItem[], 
    totalRefundAmount: number,
    currency: string,
    cashierName: string,
) {
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
        currency: currency || 'Rp',
        cashierName: cashierName,
        date: serverTimestamp(),
    });

    // 2. Restore stock for each refunded item (check for existence first)
    for (const item of itemsToRefund) {
        const productRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION, item.id);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
            batch.update(productRef, { stock: increment(item.quantity) });
        } else {
            console.warn(`Product with ID ${item.id} not found. Could not restore stock.`);
        }
    }
    
    // 3. Calculate new status for original transaction
    const allRefundsQuery = query(
        collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION),
        where('originalTransactionId', '==', originalTransaction.id)
    );
    const allRefundsSnapshot = await getDocs(allRefundsQuery);
    
    const totalRefundedQuantities: { [key: string]: number } = {};
    allRefundsSnapshot.docs.forEach(doc => {
        doc.data().items.forEach((item: any) => {
            totalRefundedQuantities[item.id] = (totalRefundedQuantities[item.id] || 0) + item.quantity;
        });
    });
    
    // Add the current refund items to the total
    itemsToRefund.forEach(item => {
        totalRefundedQuantities[item.id] = (totalRefundedQuantities[item.id] || 0) + item.quantity;
    });

    const allItemsRefunded = originalTransaction.items.every((origItem: any) => {
        return (totalRefundedQuantities[origItem.id] || 0) >= origItem.quantity;
    });

    const newStatus = allItemsRefunded ? 'Refunded' : 'Partially Refunded';

    // 4. Update the original transaction status
    const originalTransactionRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, TRANSACTIONS_COLLECTION, originalTransaction.id);
    
    batch.update(originalTransactionRef, { 
        status: newStatus
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
export async function getInventoryForBranch(db: Firestore, businessId: string, branchId: string) {
    const products = await getProductsForBranch(db, businessId, branchId);
    return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: (p as any).stock,
    }));
}


// === User Management ===
export async function getUsers(db: Firestore, businessId: string) {
    if (!businessId) return [];
    try {
        const usersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, USERS_COLLECTION);
        const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
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

export async function addUserToBusiness(auth: Auth, db: Firestore, businessId: string, userData: NewUser) {
    if (!businessId) {
        throw new Error("Current user is not associated with a business.");
    }
    if (!userData.email || !userData.password) {
        throw new Error("Email and password are required to create a new user.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;
    
    const batch = writeBatch(db);
    const userRef = doc(collection(db, BUSINESSES_COLLECTION, businessId, USERS_COLLECTION));

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


export async function deleteUserFromBusiness(db: Firestore, businessId: string, userId: string): Promise<void> {
    if (!businessId) throw new Error("Current user is not associated with a business.");

    const userDocRef = doc(db, BUSINESSES_COLLECTION, businessId, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (!userData || userData.businessId !== businessId) {
        throw new Error("User does not belong to this business or does not exist.");
    }
    
    await deleteDoc(userDocRef);
}

export async function updateUserProfile(db: Firestore, uid: string, data: { photoURL: string }) {
    if (!uid) throw new Error("User ID is required to update profile.");
    
    const usersQuery = query(collectionGroup(db, USERS_COLLECTION), where("uid", "==", uid), limit(1));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
        throw new Error("User document not found.");
    }
    
    const userDocRef = usersSnapshot.docs[0].ref;
    
    return await updateDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}


// === Promotion Functions (Branch Specific) ===
export async function getPromosForBranch(db: Firestore, businessId: string, branchId: string) {
    if (!businessId || !branchId) {
        throw new Error("No business ID or branch ID found.");
    }
    
    const promosCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION);
    const q = query(promosCollectionRef, orderBy("createdAt", "desc"));

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

export async function addPromoToBranch(db: Firestore, businessId: string, branchId: string, promoData: Omit<DocumentData, 'id'>) {
    if (!businessId) throw new Error("No business ID found");
    const promosCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION);
    return await addDoc(promosCollectionRef, {
        ...promoData,
        startDate: Timestamp.fromDate(new Date(promoData.startDate)),
        endDate: Timestamp.fromDate(new Date(promoData.endDate)),
        createdAt: serverTimestamp()
    });
}

export async function deletePromoFromBranch(db: Firestore, businessId: string, branchId: string, promoId: string) {
    if (!businessId) throw new Error("No business ID found");
    const promoDocRef = doc(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PROMOS_COLLECTION, promoId);
    return await deleteDoc(promoDocRef);
}

// === Seeding & Reset Functions ===

async function deleteCollection(db: Firestore, collectionPath: string) {
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


export async function resetBranchData(db: Firestore, businessId: string, branchId: string): Promise<void> {
    if (!businessId || !branchId) {
        throw new Error("Missing Business ID or Branch ID for reset.");
    }
    
    const productsPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${PRODUCTS_COLLECTION}`;
    const transactionsPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${TRANSACTIONS_COLLECTION}`;
    const promosPath = `${BUSINESSES_COLLECTION}/${businessId}/${BRANCHES_COLLECTION}/${branchId}/${PROMOS_COLLECTION}`;
    
    await Promise.all([
        deleteCollection(db, productsPath),
        deleteCollection(db, transactionsPath),
        deleteCollection(db, promosPath),
    ]);
}


export async function seedInitialDataForBranch(db: Firestore, businessId: string, branchId: string): Promise<boolean> {
    if (!businessId || !branchId) {
        throw new Error("Missing Business ID or Branch ID for seeding.");
    }

    const productsCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, BRANCHES_COLLECTION, branchId, PRODUCTS_COLLECTION);
    const customersCollectionRef = collection(db, BUSINESSES_COLLECTION, businessId, CUSTOMERS_COLLECTION);

    const existingProductsQuery = query(productsCollectionRef, limit(1));
    const existingProducts = await getDocs(existingProductsQuery);
    if (!existingProducts.empty) {
        console.log("Branch already has products. Seeding aborted.");
        return false;
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
    return true;
}
