
import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

export const firebaseConfig = {
  apiKey: "AIzaSyCcMLHz5eLpV10YMXFkNSCVxYhxR6WxyBs",
  authDomain: "tamuyum.firebaseapp.com",
  projectId: "tamuyum",
  storageBucket: "tamuyum.appspot.com",
  messagingSenderId: "912689470856",
  appId: "1:912689470856:web:42898bb6fdc9c4dfa22e3d"
};

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

// Check if Firebase has already been initialized
if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        setLogLevel('error'); // Reduce console noise
    } catch (error) {
        console.error("Firebase initialization error", error);
        // In case of race conditions, try to get the already initialized app
        app = getApp();
    }
} else {
    app = getApp();
}

// Initialize App Check for security - only on client side
if (typeof window !== 'undefined') {
    // Self-host the reCAPTCHA v3 script to avoid conflicts with other scripts
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NODE_ENV === 'development';
    
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6Ld-1QsqAAAAAK7_r85D_Zp7mH_N3-mF18S3E_Kg'),
      isTokenAutoRefreshEnabled: true
    });
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app); // Initialize Storage

// Enable offline persistence only on the client-side
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed, most likely due to multiple tabs open.");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence is not supported in this browser.");
      }
    });
}

export { app, auth, db, storage };
