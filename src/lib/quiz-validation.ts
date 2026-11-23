/**
 * Pure validation and string normalization utilities for quiz/game concepts and definitions.
 * NOTE: Do NOT add 'use server' to this file. It is a shared utility module for synchronous checks.
 */

export function normalizeTr(str: string): string {
    if (!str) return '';
    return str
        .toLocaleLowerCase('tr-TR')
        .replace(/[âäá]/g, 'a')
        .replace(/[îïí]/g, 'i')
        .replace(/[ûüú]/g, 'u')
        .replace(/[ôöó]/g, 'o')
        .replace(/[^a-zçğıöşü0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const BANNED_PATTERNS = [
    /ipucu/i,
    /harflerini.*sıral/i,
    /sıralayarak/i,
    /kelimeyi bul/i,
    /doğru sırala/i,
    /boşluğu doldur/i,
    /bu kavramın/i,
    /bu kelime/i,
    /tahmin ediniz/i,
    /hangisidir/i,
    /aşağıdakilerden/i,
    /bulmaca/i,
    /tanımsız/i,
    /tanım yok/i,
    /^tanım$/i,
    /^kavram$/i
];

const GENERIC_CATEGORY_WORDS = new Set([
    'namaz', 'namazı', 'namazlar', 'namazları',
    'savaş', 'savaşı', 'savaşlar', 'savaşları',
    'mescit', 'mescidi', 'mescid', 'cami', 'camii', 'camisi',
    'sure', 'suresi', 'sureler', 'sureleri',
    'ayet', 'ayeti', 'ayetler', 'ayetleri',
    'dua', 'duası', 'dualar', 'duaları',
    'yıl', 'yılı', 'yıllar', 'yılları',
    'gün', 'günü', 'günler', 'günleri',
    'gece', 'gecesi', 'geceler', 'geceleri',
    'olay', 'olayı', 'olaylar', 'olayları',
    'hac', 'haccı',
    'oruç', 'orucu',
    'antlaşma', 'antlaşması',
    'sefer', 'seferi',
    'dönem', 'dönemi',
    'kavram', 'kavramı'
]);

const STOP_WORDS = new Set([
    've', 'ile', 'bir', 'olan', 'için', 'gibi', 'eden', 'adı', 'adına', 'denir', 
    'olarak', 'kadar', 'veya', 'biri', 'göre', 'sonra', 'önce', 'hz', 'sav', 
    'as', 'ra', 'cc', 'oğlu', 'kızı', 'eşi', 'anlamına', 'ait', 'kendi', 'alan'
]);

export function isDefinitionValidAndClean(term: string, definition: string): boolean {
    if (!term || !definition) return false;
    
    const cleanTerm = term.trim();
    const cleanDef = definition.trim();

    // 1. Definition must be at least 5 characters long
    if (cleanDef.length < 5) return false;

    // 2. Reject metadata / instruction texts like "ipucu kelime şu", "harflerini sırala", etc.
    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(cleanDef)) return false;
    }

    const normTerm = normalizeTr(cleanTerm);
    const normDef = normalizeTr(cleanDef);

    if (!normTerm || !normDef) return false;

    // 3. Reject tautology: only reject if the definition is literally identical to the term
    if (normTerm === normDef) return false;

    return true;
}

/**
 * Clue cleaner for game prompts (e.g. riddles, multiple-choice, hangman hints).
 * If the definition begins with "Kavram: ...", "Kavram - ...", or "Kavram, ..."
 * it strips the redundant term prefix so the answer is not given away in the first word.
 */
export function cleanClueForTerm(term: string, definition: string): string {
    if (!definition) return '';
    let text = definition.trim();
    if (!term) return text;
    const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp(`^${escaped}\\s*[:;–—\\-,]\\s*`, 'i');
    text = text.replace(prefixRegex, '');
    return text.trim() || definition.trim();
}
