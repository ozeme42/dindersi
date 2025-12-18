import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export function getAdminApp() {
  // 1. Zaten başlatılmışsa onu kullan
  if (getApps().length > 0) {
    return getApp();
  }

  // 2. .env.local verilerini al
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error("❌ Firebase Admin başlatılamadı: .env.local dosyasında eksik bilgiler var.");
  }

  // 3. Private key içindeki \n karakterlerini düzelt
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  // 4. Uygulamayı başlat
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

// --- Helper Fonksiyonlar (Action dosyaları bunları kullanır) ---

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}