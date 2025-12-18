
'use server';
/**
 * @fileoverview A Genkit flow for securely deleting a Firebase user.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

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
      const auth = getAdminAuth();
      await auth.deleteUser(uid);

      // 2. Delete user data from Firestore
      const db = getAdminDb();
      const userDocRef = db.collection('users').doc(uid);
      await userDocRef.delete();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      if (error.code === 'auth/user-not-found') {
        return { success: false, error: 'Kullanıcı kimlik doğrulama sisteminde bulunamadı.' };
      }
      return { success: false, error: error.message };
    }
  }
);

    