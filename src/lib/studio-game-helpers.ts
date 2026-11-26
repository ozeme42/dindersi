import { normalizeConcept } from '@/lib/concept-utils';
import { cleanClueForTerm, isDefinitionValidAndClean } from '@/lib/quiz-validation';

export type StudioDefinitionPair = {
  term: string;
  definition: string;
};

const TR_ALPHA_WITH_SPACE_REGEX = /^[A-ZÇĞİÖŞÜ]+( [A-ZÇĞİÖŞÜ]+)*$/;
const TR_ALPHA_NOSPACE_REGEX = /^[A-ZÇĞİÖŞÜ]+$/;

/**
 * Normalizes a concept name into clean Turkish uppercase letters suitable for letter/word games.
 */
export function cleanStudioTermForWordGame(
  raw: string,
  options: { removeSpaces?: boolean; uppercase?: boolean } = {}
): string {
  const { removeSpaces = false, uppercase = true } = options;
  let cleaned = String(raw || '')
    .replace(/^Hz[\.\s]*/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/[âÂ]/g, 'A')
    .replace(/[îÎ]/g, 'İ')
    .replace(/[ûÛ]/g, 'U')
    .replace(/[êÊ]/g, 'E')
    .replace(/['’"”`\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (removeSpaces) {
    cleaned = cleaned.replace(/\s+/g, '');
  }

  return uppercase ? cleaned.toLocaleUpperCase('tr-TR') : cleaned;
}

/**
 * Cleans a display concept term by removing bracketed annotations while preserving natural casing.
 */
export function cleanDisplayTerm(raw: string): string {
  return String(raw || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/^[0-9]+[\.\-\)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filters and deduplicates registered Studio concepts for word/anagram/word-search games.
 */
export function filterStudioWordList(
  concepts: string[],
  options: {
    removeSpaces?: boolean;
    minLength?: number;
    maxLength?: number;
    maxWords?: number;
  } = {}
): string[] {
  const {
    removeSpaces = false,
    minLength = 3,
    maxLength = 38,
    maxWords,
  } = options;

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const rawTerm of concepts) {
    const formatted = cleanStudioTermForWordGame(rawTerm, { removeSpaces, uppercase: true });
    if (!formatted) continue;

    const lettersOnly = formatted.replace(/\s+/g, '');
    const words = formatted.split(' ');

    if (lettersOnly.length < minLength || formatted.length > maxLength) continue;
    if (maxWords !== undefined && words.length > maxWords) continue;

    const pattern = removeSpaces ? TR_ALPHA_NOSPACE_REGEX : TR_ALPHA_WITH_SPACE_REGEX;
    if (!pattern.test(formatted)) continue;

    const key = removeSpaces ? formatted : lettersOnly;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(formatted);
  }

  return valid;
}

/**
 * Validates, cleans, and deduplicates registered Studio concept-definition pairs.
 */
export function prepareStudioDefinitionPairs(
  conceptDefinitions: StudioDefinitionPair[],
  options: {
    minTermLength?: number;
    maxTermLength?: number;
    maxWords?: number;
    cleanTermForTyping?: boolean;
    cleanClue?: boolean;
  } = {}
): StudioDefinitionPair[] {
  const {
    minTermLength = 2,
    maxTermLength = 40,
    maxWords,
    cleanTermForTyping = false,
    cleanClue = true,
  } = options;

  const seen = new Set<string>();
  const result: StudioDefinitionPair[] = [];

  for (const item of conceptDefinitions) {
    const rawTerm = String(item.term || '').trim();
    const rawDef = String(item.definition || '').trim();
    if (!rawTerm || !rawDef) continue;

    const term = cleanTermForTyping
      ? cleanStudioTermForWordGame(rawTerm, { uppercase: false })
      : cleanDisplayTerm(rawTerm);

    const definition = cleanClue ? cleanClueForTerm(term, rawDef) : rawDef;

    if (term.length < minTermLength || term.length > maxTermLength) continue;
    if (maxWords !== undefined && term.split(/\s+/).length > maxWords) continue;
    if (!isDefinitionValidAndClean(term, definition)) continue;

    const key = normalizeConcept(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    result.push({ term, definition });
  }

  return result;
}

/**
 * Picks up to `count` distractor terms strictly from the provided registered Studio concepts.
 */
export function pickStudioDistractors(
  correctTerm: string,
  studioConcepts: string[],
  count = 3
): string[] {
  const normCorrect = normalizeConcept(correctTerm);
  const seen = new Set<string>();
  if (normCorrect) seen.add(normCorrect);

  const candidates: string[] = [];
  for (const raw of studioConcepts) {
    const term = cleanDisplayTerm(raw);
    const norm = normalizeConcept(term);
    if (!term || !norm || seen.has(norm)) continue;
    seen.add(norm);
    candidates.push(term);
  }

  return shuffleArray(candidates).slice(0, count);
}

/**
 * Returns a new array shuffled using Fisher-Yates.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
