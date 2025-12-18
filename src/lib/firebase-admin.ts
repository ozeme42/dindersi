
import 'dotenv/config';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function initializeAdminApp() {
    if (adminApp) {
        return adminApp;
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;

    if (!serviceAccount) {
        // Log a warning during build but don't throw, as it might not be an issue
        // if admin functions are only called at runtime.
        console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin SDK will not be initialized.');
        return null;
    }

    try {
        // Try to get an existing app first, otherwise initialize.
        adminApp = getApp('admin');
    } catch (e) {
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        }, 'admin');
    }
    return adminApp;
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

// Export functions that return the initialized services
// This prevents top-level execution during build.
export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminDb = () => getFirestore(getAdminApp());
