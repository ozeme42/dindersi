
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

if (typeof window !== 'undefined') {
  if (!getApps().length) {
      try {
          app = initializeApp(firebaseConfig);
          setLogLevel('error');
          if (process.env.NODE_ENV === 'development') {
              try {
                  const appCheck = initializeAppCheck(app, {
                      provider: new ReCaptchaV3Provider('6Ld-pB8pAAAAAN5zC2n4vtsu2b-D0b2a3a1b4c5d'), // Replace with your reCAPTCHA v3 site key
                      isTokenAutoRefreshEnabled: true
                  });
                  console.log("App Check initialized for development.");
              } catch (e) {
                  console.warn("App Check initialization failed in dev, this can happen with HMR.", e);
              }
          }
      } catch (error) {
          console.error("Firebase initialization error", error);
          app = getApp();
      }
  } else {
      app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed, most likely due to multiple tabs open.");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence is not supported in this browser.");
      }
    });
} else {
    // For server-side rendering, we don't initialize client-side SDKs
    // that require browser APIs. You might initialize server-side SDKs here
    // or just leave it empty if server-side Firebase logic is handled elsewhere.
}

// @ts-ignore
export { app, auth, db, storage };
