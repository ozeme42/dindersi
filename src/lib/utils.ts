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

// Türkiye saatine göre tarih stringi (YYYY-MM-DD)
export function getTurkeyDateString(date: Date = new Date()): string {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).toISOString().split('T')[0];
}
