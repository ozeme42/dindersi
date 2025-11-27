
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
        if (typeof window !== 'undefined') {
            if (process.env.NODE_ENV === 'development') {
                // Pass your reCAPTCHA v3 site key (public) to the provider.
                (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
            }
             initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider('6Ld-9PgpAAAAAKiJnS3x0G0Ki-v8sS5vV3Pq3aTj'),

                // Optional argument. If true, the SDK automatically refreshes App Check
                // tokens as needed.
                isTokenAutoRefreshEnabled: true
            });
        }
        setLogLevel('error');
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
        // This can happen if multiple tabs are open, as persistence can only be
        // enabled in one tab at a time.
        console.warn("Firestore persistence failed, most likely due to multiple tabs open.");
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firestore persistence is not supported in this browser.");
      }
    });
}

export { app, auth, db, storage };
