
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

export const updateUserPassword = ai.defineFlow(
  {
    name: 'updateUserPassword',
    inputSchema: z.object({
      uid: z.string(),
      password: z.string().min(6),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      error: z.string().optional(),
    }),
  },
  async ({ uid, password }) => {
    try {
      const auth = getAuth(adminApp);
      await auth.updateUser(uid, {
        password: password,
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user password:', error);
      return { success: false, error: error.message };
    }
  }
);
