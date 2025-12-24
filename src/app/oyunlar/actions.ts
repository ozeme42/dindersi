
'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  limit 
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

// Bu dosya artık kullanılmıyor, ilgili fonksiyonlar kendi klasörlerine taşındı.
// Bu dosyayı silmek en temiz çözüm olacaktır.

