
import 'dotenv/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function initializeAdminApp(): App | null {
    if (adminApp) {
        return adminApp;
    }

    const apps = getApps();
    const adminApps = apps.filter(app => app.name.startsWith('admin'));

    if (adminApps.length > 0) {
        adminApp = adminApps[0];
        return adminApp;
    }
    
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    // During build, this variable might be missing. We shouldn't throw an error here,
    // as it would crash the build process. We'll only fail at runtime if an SDK
    // function is actually called without proper initialization.
    if (!serviceAccountString) {
        console.warn('FIREBASE_SERVICE_ACCOUNT env var not set. Admin SDK calls will fail at runtime.');
        return null;
    }
  
    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        adminApp = initializeApp({
            credential: cert(serviceAccount)
        }, `admin-${Date.now()}`); // Give each instance a unique name
    } catch (e: any) {
        console.error("Firebase Admin SDK initialization failed:", e);
        return null;
    }
    
    return adminApp;
}

function getAdminApp(): App {
    const app = initializeAdminApp();
    // This will now only be thrown at runtime if the SDK truly fails to initialize,
    // for example, due to invalid credentials.
    if (!app) {
        throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
    }
    return app;
}


// These are now functions that ensure the app is initialized before getting the service.
// This defers the call to initializeAdminApp() until the function is actually executed.
export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}
