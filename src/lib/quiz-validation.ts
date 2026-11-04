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

    // 1. Definition must be at least 15 characters long
    if (cleanDef.length < 15) return false;

    // 2. Reject metadata / instruction texts like "ipucu kelime şu", "harflerini sırala", etc.
    for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(cleanDef)) return false;
    }

    const normTerm = normalizeTr(cleanTerm);
    const normDef = normalizeTr(cleanDef);

    if (!normTerm || !normDef) return false;

    // 3. Reject tautology: if definition is the term itself or contains the entire term
    if (normTerm === normDef || normDef.includes(normTerm)) return false;

    // 4. Check for distinct root tokens in term (e.g. "Ebu", "Talib" in "Ebu Talib")
    const tokens = normTerm
        .split(' ')
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

    if (tokens.length === 0) return false;

    const isMultiWord = tokens.length > 1;

    for (const token of tokens) {
        // If it's a multi-word concept and this word is a generic category word (e.g. "namaz", "savaşı"),
        // allow the generic word to appear in definition without penalizing (e.g., "Sabah Namazı: Güneş doğmadan kılınan namaz")
        if (isMultiWord && GENERIC_CATEGORY_WORDS.has(token)) {
            continue;
        }

        // For key identifying root word (e.g., "Ebrehe", "Talib", "Zemzem", "Fatiha"):
        // It must NOT appear directly as a whole word or common stem in the definition!
        if (token.length <= 4) {
            const defWords = normDef.split(' ');
            if (defWords.includes(token)) return false;
            // Also reject if word has simple grammatical suffix
            const hasStemWithSuffix = defWords.some(dw => dw.startsWith(token) && dw.length <= token.length + 4);
            if (hasStemWithSuffix) return false;
        } else {
            // For longer words (5+ chars), check 5-letter stem match to avoid "Ebrehe'nin" giving away "Ebrehe"
            const stem = token.substring(0, Math.min(token.length, 5));
            if (normDef.includes(stem)) return false;
        }
    }

    return true;
}
