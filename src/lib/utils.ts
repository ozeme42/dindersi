import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeNameToEmailLocalPart(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '.') // handle one or more spaces
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9.-]/g, '');
}

// GÜNCELLENMİŞ FONKSİYON: Türkçe karakterleri korur.
export const cleanForAnagram = (text: string): string => {
  if (!text) return '';
  // Metni tamamen büyük harfe çevir (Türkçe karakterlere duyarlı)
  const upperCaseText = text.toLocaleUpperCase('tr-TR');
  // Sadece izin verilen Türkçe alfabe harfleri, rakamlar, boşluklar ve şapkalı harfler dışındaki her şeyi sil
  const cleanedText = upperCaseText.replace(/[^A-ZĞÜŞİÖÇÂÎÛ0-9\s]/g, '');
  return cleanedText;
};

// Tek bir kelimenin harflerini kendi içinde karıştırır (aynı kalmaması için dener)
export function scrambleSingleWord(word: string): string {
  const letters = word.split('');
  if (letters.length <= 1) return word;
  if (letters.length === 2) return letters.reverse().join('');
  
  let scrambled = word;
  let attempts = 0;
  while (scrambled === word && attempts < 15) {
    scrambled = letters.slice().sort(() => Math.random() - 0.5).join('');
    attempts++;
  }
  return scrambled;
}

// İki veya daha fazla kelimelik ifadelerde her kelimeyi kendi içinde ayrı ayrı karıştırır
export function scrambleAnagramWord(text: string): string {
  if (!text) return '';
  const cleaned = cleanForAnagram(text);
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  return words.map(w => scrambleSingleWord(w)).join(' ');
}

// Türkiye saatine göre tarih stringi (YYYY-MM-DD)
export function getTurkeyDateString(date: Date = new Date()): string {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).toISOString().split('T')[0];
}

/**
 * Deduplicates an array of students by:
 * 1. uid (if present)
 * 2. normalized displayName + class (if displayName is present)
 */
export function deduplicateStudents<T extends { uid?: string; displayName?: string; class?: string }>(students: T[]): T[] {
  if (!Array.isArray(students)) return [];
  const seenUids = new Set<string>();
  const seenNameClass = new Set<string>();
  
  return students.filter(student => {
    if (!student) return false;
    
    // Check UID
    if (student.uid) {
      if (seenUids.has(student.uid)) return false;
      seenUids.add(student.uid);
    }
    
    // Check normalized displayName + class
    const name = (student.displayName || '').trim().toLocaleLowerCase('tr-TR');
    const className = (student.class || '').trim().toLocaleLowerCase('tr-TR');
    
    if (name) {
      const key = `${name}___${className}`;
      if (seenNameClass.has(key)) return false;
      seenNameClass.add(key);
    }
    
    return true;
  });
}

/**
 * Deduplicates an array of students by normalized displayName (for wheel or single-pool views)
 */
export function deduplicateByWheelName<T extends { uid?: string; displayName?: string }>(students: T[]): T[] {
  if (!Array.isArray(students)) return [];
  const seenUids = new Set<string>();
  const seenNames = new Set<string>();
  
  return students.filter(student => {
    if (!student) return false;
    if (student.uid) {
      if (seenUids.has(student.uid)) return false;
      seenUids.add(student.uid);
    }
    const name = (student.displayName || '').trim().toLocaleLowerCase('tr-TR');
    if (name) {
      if (seenNames.has(name)) return false;
      seenNames.add(name);
    }
    return true;
  });
}
