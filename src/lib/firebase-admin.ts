
import 'dotenv/config';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

// The adminApp is now initialized lazily, only when getAdminApp is called for the first time.
function initializeAdminApp() {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : undefined;

    if (!serviceAccount) {
        // In a build environment, this might not be available, and that's okay
        // if admin-dependent functions are not called during build.
        // We throw an error only if it's explicitly used without config.
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }

    adminApp = initializeApp({
        credential: cert(serviceAccount)
    }, 'admin');
}


export function getAdminApp(): App {
    try {
        // Try to get the already initialized app
        return getApp('admin');
    } catch (e) {
        // If it fails, it means the app isn't initialized yet, so initialize it.
        initializeAdminApp();
        return getApp('admin');
    }
}

// You can also export specific services for convenience
export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
