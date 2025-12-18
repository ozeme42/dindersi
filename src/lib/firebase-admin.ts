
import 'dotenv/config';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function initializeAdminApp() {
    if (adminApp) {
        return adminApp;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountString) {
        try {
            const serviceAccount = JSON.parse(serviceAccountString);
            adminApp = initializeApp({
                credential: cert(serviceAccount)
            }, 'adminApp-' + Date.now()); // Unique name to avoid conflicts
            return adminApp;
        } catch (e: any) {
            console.error("Firebase Admin SDK initialization error:", e.message);
             try {
                // Fallback to get default app if it exists
                adminApp = getApp();
                return adminApp;
            } catch (getAppError) {
                console.warn('Could not get default Firebase admin app.');
                return null;
            }
        }
    } else {
        // Only log on the server-side, not during client-side bundling
        if (typeof window === 'undefined') {
            console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin SDK will not be initialized.');
        }
        return null;
    }
}

// Lazy initialization getters. This ensures Admin SDK is only initialized when a function needs it.
export function getAdminApp(): App {
    if (!adminApp) {
        initializeAdminApp();
    }
    // This error will now only be thrown at runtime if the SDK truly fails to initialize,
    // for example, due to invalid credentials.
    if (!adminApp) {
        throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
    }
    return adminApp;
}

export function getAdminAuth(): Auth {
    if (!adminAuth) {
        adminAuth = getAuth(getAdminApp());
    }
    return adminAuth;
}

export function getAdminDb(): Firestore {
    if (!adminDb) {
        adminDb = getFirestore(getAdminApp());
    }
    return adminDb;
}
