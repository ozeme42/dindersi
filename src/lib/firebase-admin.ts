
import 'dotenv/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // If the app is already initialized by another call, use it
  if (getApps().some(app => app.name === 'firebase-admin-app')) {
      adminApp = getApps().find(app => app.name === 'firebase-admin-app')!;
      return adminApp;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    // During client-side bundling or if env is not set, this might be called.
    // We should not throw an error here, but let it fail gracefully later
    // when an actual admin function is called.
    console.warn("FIREBASE_SERVICE_ACCOUNT env var not set. Admin SDK might not be initialized.");
    // Return a dummy object or handle this case appropriately if you need to.
    // For now, we will let it proceed and the error will be caught when getAuth/getFirestore is called.
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountString || '{}');
    adminApp = initializeApp({
      credential: cert(serviceAccount)
    }, 'firebase-admin-app'); // Give a unique name
  } catch (e: any) {
     console.error("Failed to initialize Firebase Admin SDK:", e.message);
     // If initialization fails, subsequent calls to getAuth/getFirestore will throw
  }

  if (!adminApp) {
    // This will now only be thrown at runtime if the SDK truly fails to initialize.
    throw new Error("Firebase Admin SDK could not be initialized. Check server logs for details.");
  }

  return adminApp;
}

// Lazy-loaded getters for Auth and Firestore
export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}
