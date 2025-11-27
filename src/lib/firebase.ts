
import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCcMLHz5eLpV10YMXFkNSCVxYhxR6WxyBs",
  authDomain: "tamuyum.firebaseapp.com",
  projectId: "tamuyum",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
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
        setLogLevel('error'); // Optional: reduce Firebase logs
        if (typeof window !== 'undefined') {
            // Initialize App Check
            initializeAppCheck(app, {
              provider: new ReCaptchaV3Provider('6Ld_pBsqAAAAAMw_vLgG8sT6n_tqbgq9u3mtp2wI'),
              isTokenAutoRefreshEnabled: true
            });
        }
    } catch (error) {
        console.error("Firebase initialization error", error);
        // In case of race conditions, try to get the already initialized app
        app = getApp();
    }
} else {
    app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

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
