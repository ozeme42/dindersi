/**
 * Normalizes a concept term for comparison, matching, and deduplication:
 * - Trims and converts to lower case in Turkish locale
 * - Decomposes diacritics (NFD) and removes accents (î -> i, â -> a, û -> u, etc.)
 * - Removes apostrophes, quotes, ayn/hamza signs (' ’ ‘   ” ʿ ʾ ^)
 * - Removes hyphens and punctuation
 * - Normalizes dotless ı to i for fuzzy matching
 * - Strips whitespace
 */
export function normalizeConcept(str: string): string {
 if (!str) return '';
 return str
 .trim()
 .toLocaleLowerCase('tr')
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .replace(/[''‘“”ʿʾʻʼ^]/g, '')
        .replace(/[-_.:,;!?/\\()[\]{}]/g, '')
        .replace(/ı/g, 'i')
        .replace(/\s+/g, '')
        .trim();
}

/**
 * Checks whether two concept strings represent the same concept,
 * ignoring accents (î/i), apostrophes (Semî'/Semi), casing, and punctuation.
 */
export function isSameConcept(a: string, b: string): boolean {
    const normA = normalizeConcept(a);
    const normB = normalizeConcept(b);
    return !!normA && normA === normB;
}
