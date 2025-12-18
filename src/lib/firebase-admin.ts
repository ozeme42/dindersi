
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
            }, 'adminApp-' + Date.now());
            return adminApp;
        } catch (e: any) {
            console.error("Firebase Admin SDK initialization error:", e.message);
            try {
                // Fallback to get default app if it exists (useful in some environments)
                adminApp = getApp();
                return adminApp;
            } catch (getAppError) {
                console.warn('Could not get default Firebase admin app.');
                return null;
            }
        }
    } else {
        if (typeof window === 'undefined') { // Only log on the server
            console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin SDK will not be initialized.');
        }
        return null;
    }
}

// Lazy initialization getters
export function getAdminAuth(): Auth {
    if (!adminAuth) {
        const app = getAdminApp();
        adminAuth = getAuth(app);
    }
    return adminAuth;
}

export function getAdminDb(): Firestore {
    if (!adminDb) {
        const app = getAdminApp();
        adminDb = getFirestore(app);
    }
    return adminDb;
}

export function getAdminApp(): App {
    if (!adminApp) {
        initializeAdminApp();
    }
    if (!adminApp) {
        throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
    }
    return adminApp;
}
