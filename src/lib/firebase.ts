import { initializeApp, getApps, getApp, FirebaseApp, setLogLevel } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- EKLENDİ

export const firebaseConfig = {
  apiKey: "AIzaSyCcMLHz5eLpV10YMXFkNSCVxYhxR6WxyBs",
  authDomain: "tamuyum.firebaseapp.com",
  projectId: "tamuyum",
  // DÜZELTME: Burası 'appspot.com' değil, hata loglarındaki adres olmalı
  storageBucket: "tamuyum.firebasestorage.app", 
  messagingSenderId: "912689470856",
  appId: "1:912689470856:web:42898bb6fdc9c4dfa22e3d"
};

let app: FirebaseApp;

// Singleton pattern: Uygulamanın sadece bir kez başlatılmasını sağlar
if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        setLogLevel('error');
    } catch (error) {
        console.error("Firebase initialization error", error);
        app = getApp();
    }
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // <-- Storage burada başlatılmalı

// Offline persistence (Sadece tarayıcıda çalışır)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed (multiple tabs open).");
      } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence not supported.");
      }
    });
}

// Storage'ı da dışarı aktarıyoruz
export { app, auth, db, storage };