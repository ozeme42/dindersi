
import 'dotenv/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function initializeAdminApp(): App {
    if (adminApp) {
        return adminApp;
    }

    const apps = getApps();
    if (apps.length > 0) {
        adminApp = apps[0];
        return adminApp;
    }
    
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountString) {
        // This will only be thrown at RUNTIME if the variable is missing, not during build.
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }
  
    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        }, 'admin'); // Give the app a unique name
    } catch (e: any) {
        // This will now only be thrown at runtime if the SDK truly fails to initialize,
        // for example, due to invalid credentials.
        throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
    }
    
    return adminApp;
}

// These are now functions that ensure the app is initialized before getting the service.
// This defers the call to initializeAdminApp() until the function is actually executed.
export function getAdminAuth(): Auth {
    return getAuth(initializeAdminApp());
}

export function getAdminDb(): Firestore {
    return getFirestore(initializeAdminApp());
}
