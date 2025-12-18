
import 'dotenv/config';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function initializeAdminApp() {
    // If already initialized, return the app
    if (adminApp) {
        return adminApp;
    }
    
    // During build, the env var might not be available. We should not throw an error here.
    // Instead, we should only initialize if the credentials are provided.
    // The check for a valid app will happen in getAdminApp.
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountString) {
        try {
            const serviceAccount = JSON.parse(serviceAccountString);
            // Use a unique name to avoid conflicts in dev environments with hot-reloading
            adminApp = initializeApp({
                credential: cert(serviceAccount)
            }, 'adminApp-' + Date.now()); 
            return adminApp;
        } catch (e: any) {
             console.error("Firebase Admin SDK initialization error:", e.message);
             // Fallback to get the default app if it exists
             try {
                 adminApp = getApp('admin');
                 return adminApp;
             } catch(getAppError) {
                // This will be caught by the check in getAdminApp
                return null;
             }
        }
    } else {
        // Log a warning during runtime if the variable is missing. This won't run at build time.
        if (typeof window === 'undefined') {
            console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin SDK will not be initialized.');
        }
        return null;
    }
}

export function getAdminApp(): App {
    if (!adminApp) {
        initializeAdminApp();
    }
    
    // This check is now robust. It will only fail at RUNTIME if the credentials are
    // actually missing or invalid when an admin function is called. It will NOT fail during build.
    if (!adminApp) {
        throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
    }
    return adminApp;
}


// These are now functions that will call getAdminApp only when they are executed.
export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminDb = () => getFirestore(getAdminApp());
