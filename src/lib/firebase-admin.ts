

import 'dotenv/config';
import { initializeApp, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore'; // Import getFirestore

let adminApp: App;

try {
  adminApp = getApp('admin');
} catch (e) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Cannot initialize Firebase Admin SDK.');
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount)
  }, 'admin');
}

// Ensure Firestore is initialized
getFirestore(adminApp);


export { adminApp };

export function getAdminApp(): App {
    try {
        return getApp('admin');
    } catch (e) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : undefined;

        if (!serviceAccount) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Cannot initialize Firebase Admin SDK.');
        }

        const app = initializeApp({
            credential: cert(serviceAccount)
        }, `admin_${Date.now()}`); // Use a unique name to avoid conflicts in dev
        
        getFirestore(app);
        return app;
    }
}
