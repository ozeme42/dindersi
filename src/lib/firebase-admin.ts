

import 'dotenv/config';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function initializeAdminApp() {
    if (adminApp) {
        return adminApp;
    }

    // This check will only run on the server, not during the build process.
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountString) {
        // Log a warning if the env var is missing at runtime.
        console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin SDK will not be initialized.');
        return null;
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        }, 'admin' + Date.now()); // Use a unique name to avoid conflicts in dev environments
        return adminApp;
    } catch (e: any) {
        console.error("Firebase Admin SDK initialization error:", e);
        // Try to get the default app if a uniquely named one fails, which can happen in some environments
        try {
            adminApp = getApp('admin'); // Try to get default app as a fallback
            return adminApp;
        } catch (getAppError) {
            // Both initialization and getting the default app failed.
            console.error("Could not get default Firebase admin app either.", getAppError);
            return null; // Initialization failed
        }
    }
}

export function getAdminApp(): App {
    if (!adminApp) {
        initializeAdminApp();
    }
    if (!adminApp) {
        // This error will now only be thrown at runtime if the SDK truly fails to initialize,
        // for example, due to invalid credentials.
        throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
    }
    return adminApp;
}

// Export functions that return the initialized services.
// This defers the call to getAdminApp() until the function is actually executed.
export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminDb = () => getFirestore(getAdminApp());
