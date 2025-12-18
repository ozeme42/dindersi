
'use server';
/**
 * @fileoverview A Genkit flow for securely deleting a Firebase user.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';

const db = getAdminDb();

export const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: z.object({
      uid: z.string().min(1, 'Kullanıcı ID\'si gereklidir.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      error: z.string().optional(),
    }),
  },
  async ({ uid }) => {
    try {
      // 1. Delete user from Firebase Authentication
      const auth = getAuth(getAdminApp());
      await auth.deleteUser(uid);

      // 2. Delete user data from Firestore
      const userDocRef = doc(db, 'users', uid);
      await deleteDoc(userDocRef);

      // Optionally, you could also delete user's subcollections (progress, etc.) here
      // but that requires more complex logic (e.g., a recursive delete helper).
      // For now, deleting the main user record is sufficient.

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      // Provide a more user-friendly error message
      if (error.code === 'auth/user-not-found') {
        return { success: false, error: 'Kullanıcı kimlik doğrulama sisteminde bulunamadı.' };
      }
      return { success: false, error: error.message };
    }
  }
);
