
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, arrayUnion, updateDoc } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ShopItem } from '@/lib/types';


export async function purchaseItem(userId: string, itemId: string, price: number): Promise<{ success: boolean; error?: string }> {
  noStore();
  if (!userId) {
    return { success: false, error: "Kullanıcı girişi yapılmamış." };
  }

  const userRef = doc(db, 'users', userId);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("Kullanıcı bulunamadı.");
      }

      const userData = userDoc.data();
      const currentScore = userData.score || 0;
      const ownedItems = userData.ownedItems || [];

      if (ownedItems.includes(itemId)) {
        throw new Error("Bu ürüne zaten sahipsiniz.");
      }

      if (currentScore < price) {
        throw new Error("Yetersiz puan.");
      }

      transaction.update(userRef, {
        score: currentScore - price,
        ownedItems: arrayUnion(itemId),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error purchasing item:", error);
    return { success: false, error: error.message };
  }
}


export async function equipItem(userId: string, itemType: ShopItem['type'], assetValue: string | null): Promise<{ success: boolean; error?: string }> {
  if (!userId || !itemType) {
    return { success: false, error: "Kullanıcı veya eşya tipi bilgisi eksik." };
  }

  const userRef = doc(db, 'users', userId);

  try {
    let fieldToUpdate: 'equippedFrameUrl' | 'equippedBadgeId';
    
    if (itemType === 'avatarFrame') {
        fieldToUpdate = 'equippedFrameUrl';
    } else if (itemType === 'avatarBadge') {
        fieldToUpdate = 'equippedBadgeId';
    } else {
        return { success: false, error: "Geçersiz eşya tipi." };
    }
    
    await updateDoc(userRef, {
      [fieldToUpdate]: assetValue,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error equipping item:", error);
    return { success: false, error: "Eşya kuşanılırken bir hata oluştu." };
  }
}
