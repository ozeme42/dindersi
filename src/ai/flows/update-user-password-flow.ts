'use server';

import { getAdminAuth } from '@/lib/firebase-admin';

export async function updateUserPassword({ uid, password }: { uid: string; password: string }) {
  try {
    const auth = getAdminAuth();
    await auth.updateUser(uid, {
      password: password,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user password:', error);
    return { success: false, error: error.message };
  }
}
