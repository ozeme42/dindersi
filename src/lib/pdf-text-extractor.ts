/**
 * Client-Side PDF Text Extractor
 * Loads PDF via pdfjs-dist and extracts text from selected page ranges.
 * Features:
 * - 2-Column layout awareness (MEB textbook style: left column then right column)
 * - Turkish hyphenation joining ('müs- \n lüman' -> 'müslüman')
 * - Paragraph gap preservation
 * - Running header/footer and page number filtering
 */

export interface ExtractedPageResult {
    pageNum: number;
    text: string;
    wordCount: number;
}

export interface ExtractedRangeResult {
    fullText: string;
    totalWords: number;
    pages: ExtractedPageResult[];
}

let pdfjsLibInstance: any = null;

async function getPdfjsLib() {
    if (pdfjsLibInstance) return pdfjsLibInstance;

    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    pdfjsLibInstance = pdfjs;
    return pdfjs;
}

/**
 * Loads a PDF file and returns the pdfDoc object and page count
 */
export async function loadPdf(file: File | ArrayBuffer): Promise<{ pdfDoc: any; numPages: number; title: string }> {
    const pdfjs = await getPdfjsLib();

    let data: ArrayBuffer;
    let title = 'Ders Kitabı';

    if (file instanceof File) {
        title = file.name;
        data = await file.arrayBuffer();
    } else {
        data = file;
    }

    const loadingTask = pdfjs.getDocument({
        data,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
    });

    const pdfDoc = await loadingTask.promise;
    return {
        pdfDoc,
        numPages: pdfDoc.numPages,
        title,
    };
}

export interface TextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Checks if a character is within the Arabic Unicode block
 */
export function isArabicChar(ch: string): boolean {
    if (!ch) return false;
    const code = ch.charCodeAt(0);
    return (code >= 0x0600 && code <= 0x06FF) || 
           (code >= 0x0750 && code <= 0x077F) || 
           (code >= 0x08A0 && code <= 0x08FF) || 
           (code >= 0xFB50 && code <= 0xFDFF) || 
           (code >= 0xFE70 && code <= 0xFEFF);
}

/**
 * Checks if a character is an Arabic combining mark (harakah / tashkeel / tanwin / waqf)
 */
export function isArabicTashkeel(ch: string): boolean {
    if (!ch) return false;
    const code = ch.charCodeAt(0);
    return (code >= 0x064B && code <= 0x065F) || 
           code === 0x0670 || 
           (code >= 0x06D6 && code <= 0x06ED);
}

/**
 * Detects if a string is a scrambled soup of isolated Arabic diacritical marks
 * (often extracted from miniature background vector drawings of Quran pages)
 */
export function isCorruptedDiacriticSoup(str: string): boolean {
    const trimmed = str.trim();
    if (trimmed.length < 8) return false;

    const nonWs = trimmed.replace(/\s+/g, '');
    if (nonWs.length < 6) return false;

    // Count tashkeel
    const tashkeelMatches = nonWs.match(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g);
    const tashkeelCount = tashkeelMatches ? tashkeelMatches.length : 0;

    // If more than 40% are isolated harakat marks without readable words
    if ((tashkeelCount / nonWs.length) > 0.40) {
        return true;
    }

    // Repeated isolated vowel strings like "ََِْ َُٓ ََُُُْ"
    if (/^[َُِّْٰ۪ٓۖۜ۫۬ۢۚ\s]{6,}$/.test(trimmed)) {
        return true;
    }

    return false;
}

/**
 * Format a list of text items in a single column or block into coherent lines and paragraphs
 */
export function formatColumnText(items: TextItem[]): string {
    if (items.length === 0) return '';

    // Filter out obvious corrupted diacritic items
    const cleanItems = items.filter(it => !isCorruptedDiacriticSoup(it.str));
    if (cleanItems.length === 0) return '';

    // Sort: Y descending (top to bottom on page).
    // Items on roughly the same line (yDiff <= 3.5) are sorted by X ascending.
    const sorted = [...cleanItems].sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff <= 3.5) {
            return a.x - b.x;
        }
        return b.y - a.y; // higher Y is higher on page in PDF coordinates
    });

    const lines: string[] = [];
    let currentLine = '';
    let lastItem: TextItem | null = null;
    let lastY = sorted[0].y;
    let lastHeight = sorted[0].height || 10;

    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const yDiff = lastY - item.y; // positive when going downwards

        if (Math.abs(yDiff) > 4.5) {
            // New line detected
            if (currentLine.trim()) {
                if (yDiff > lastHeight * 1.6) {
                    lines.push(currentLine.trim());
                    lines.push(''); // blank line indicates a paragraph break
                } else {
                    lines.push(currentLine.trim());
                }
            }
            currentLine = item.str;
            lastY = item.y;
            lastHeight = item.height || 10;
            lastItem = item;
        } else {
            // Same line: determine whether to insert a space
            let shouldAddSpace = true;

            if (!currentLine || currentLine.endsWith(' ') || item.str.startsWith(' ')) {
                shouldAddSpace = false;
            } else if (lastItem) {
                const gap = item.x - (lastItem.x + lastItem.width);
                const lastChar = currentLine.slice(-1);
                const firstChar = item.str.charAt(0);

                // If next item is an Arabic tashkeel/harakah, NEVER add space
                if (isArabicTashkeel(firstChar)) {
                    shouldAddSpace = false;
                }
                // If both previous and current items are Arabic
                else if (isArabicChar(lastChar) && isArabicChar(firstChar)) {
                    // In Arabic script, small gaps (< 3.5px) represent connected characters of the same word
                    shouldAddSpace = gap >= 3.5;
                }
                // If previous ends with a hyphen or apostrophe, or current starts with apostrophe
                else if (lastChar === '-' || lastChar === "'" || firstChar === "'") {
                    shouldAddSpace = false;
                }
                // In Turkish/Latin, small gap (< 1.8px) means kerned letters or decomposed characters (e.g. 'oldu' + 'ğ' + 'unu')
                else if (gap < 1.8) {
                    shouldAddSpace = false;
                }
            }

            if (shouldAddSpace) {
                currentLine += ' ' + item.str;
            } else {
                currentLine += item.str;
            }

            lastItem = item;
        }
    }

    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }

    // Join visual lines into coherent paragraphs
    let result = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
            result += '\n\n';
            continue;
        }

        if (result.endsWith('-') && !result.endsWith(' -') && !result.endsWith('--')) {
            // Line break hyphenation repair: 'yapılmakta-' + 'dır' -> 'yapılmaktadır'
            result = result.slice(0, -1) + line;
        } else if (result && !result.endsWith('\n') && !result.endsWith('\n\n')) {
            result += ' ' + line;
        } else {
            result += line;
        }
    }

    return result;
}

/**
 * Post-processes extracted text to clean up Turkish hyphenations, apostrophes, and unwanted visual fragments
 */
export function postProcessExtractedText(text: string): string {
    if (!text) return '';

    let cleaned = text
        // Fix line break hyphenations: e.g. "söz -\n lükte" -> "sözlükte"
        .replace(/([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\s*-\s*\n\s*([a-zA-ZçğıöşüÇĞİÖŞÜ]+)/g, '$1$2')
        // Fix intra-line spaced hyphenations: "söz - lükte" -> "sözlükte", "Sev - gili" -> "Sevgili", "be - lirtmi" -> "belirtmi"
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\s+-\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\b/g, '$1$2')
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})-\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\b/g, '$1$2')
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\s+-([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\b/g, '$1$2')
        // Fix spaced apostrophes: "Kur ' an" -> "Kur'an", "Kerim ' in" -> "Kerim'in", "Allah ' ın" -> "Allah'ın"
        .replace(/Kur\s*'\s*an/gi, "Kur'an")
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\s+'\s*([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\b/g, "$1'$2")
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]+)'\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]+)\b/g, "$1'$2")
        // Fix broken single Turkish characters: "oldu ğ unu" -> "olduğunu", "lirtmi ş tir" -> "lirtmiştir", "boş - luklara" -> "boşluklara"
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\s+([ğışüöçĞİŞÜÖÇ])\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\b/g, '$1$2$3')
        .replace(/\b([a-zA-ZçğıöşüÇĞİÖŞÜ]{2,})\s+([ğışüöçĞİŞÜÖÇ])\b/g, '$1$2');

    // Remove isolated lines containing corrupted diacritic soup from illustrations
    const lines = cleaned.split('\n');
    const filteredLines = lines.filter(line => !isCorruptedDiacriticSoup(line));

    return filteredLines
        .join('\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Extract clean, layout-aware text from a single PDF page with spatial section & column clustering
 */
export async function extractTextFromSinglePage(page: any, pageNum: number): Promise<string> {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    const rawItems: TextItem[] = [];

    for (const item of textContent.items) {
        if (!('str' in item) || !item.str) continue;
        const str = item.str;
        if (!str.trim()) continue;

        // transform: [scaleX, skewY, skewX, scaleY, x, y]
        const tx = item.transform;
        const x = tx[4];
        const y = tx[5];
        const width = item.width || 0;
        const height = item.height || 10;

        // Filter out extreme page numbers at top/bottom margins (margins < 4% or > 97%)
        if (y < pageHeight * 0.04 && /^\d+$/.test(str.trim())) {
            continue;
        }
        if (y > pageHeight * 0.97 && (/^\d+$/.test(str.trim()) || str.includes('ÜNİTE') || str.includes('TEMA'))) {
            continue;
        }

        // Filter out isolated microscopic vector text (height < 4px) often found in decorative drawings
        if (height < 4 && width < 10) {
            continue;
        }

        rawItems.push({ str, x, y, width, height });
    }

    if (rawItems.length === 0) return '';

    const midX = pageWidth / 2;

    // Detect full-width dividing bands (e.g. major headings like "1. Tema", "Görsel 1.1: ...", "Bilgi Grafiği 1.1")
    // A wide item spans across the center or takes more than 52% of page width
    const wideThresholdWidth = pageWidth * 0.52;
    const isWideItem = (it: TextItem) => it.width > wideThresholdWidth || (it.x < midX - 35 && it.x + it.width > midX + 35);

    const wideItems = rawItems.filter(isWideItem);

    // If there are wide dividing items, split the page into vertical horizontal bands
    if (wideItems.length > 0) {
        // Sort wide items by Y descending
        const sortedWideY = Array.from(new Set(wideItems.map(it => Math.round(it.y)))).sort((a, b) => b - a);

        // Create vertical bands: [top, y1], [y1, y2], ..., [yn, bottom]
        const bandBounds: { top: number; bottom: number }[] = [];
        let currentTop = pageHeight + 10;

        for (const wy of sortedWideY) {
            bandBounds.push({ top: currentTop, bottom: wy - 2 });
            currentTop = wy - 2;
        }
        bandBounds.push({ top: currentTop, bottom: -10 });

        const sectionTexts: string[] = [];

        for (const band of bandBounds) {
            const bandItems = rawItems.filter(it => it.y <= band.top && it.y > band.bottom);
            if (bandItems.length === 0) continue;

            // Check if this band has a 2-column or sidebar layout
            const leftInBand = bandItems.filter(it => it.x + it.width / 2 < midX - 10);
            const rightInBand = bandItems.filter(it => it.x > midX - 10);
            const centerInBand = bandItems.filter(it => !leftInBand.includes(it) && !rightInBand.includes(it));

            if (leftInBand.length >= 4 && rightInBand.length >= 4) {
                // Two distinct columns in this band: Process Left column completely, then Right column
                const leftText = formatColumnText(leftInBand);
                const rightText = formatColumnText(rightInBand);
                const centerText = formatColumnText(centerInBand);

                const bandResult = [centerText, leftText, rightText].filter(Boolean).join('\n\n');
                if (bandResult.trim()) sectionTexts.push(bandResult.trim());
            } else {
                // Single column band
                const bandText = formatColumnText(bandItems);
                if (bandText.trim()) sectionTexts.push(bandText.trim());
            }
        }

        const rawResult = sectionTexts.join('\n\n');
        return postProcessExtractedText(rawResult);
    }

    // If no wide headers exist, check whole page for 2 columns
    const leftItems = rawItems.filter(i => i.x + i.width / 2 < midX - 10);
    const rightItems = rawItems.filter(i => i.x > midX - 10);

    if (leftItems.length > 5 && rightItems.length > 5) {
        const leftText = formatColumnText(leftItems);
        const rightText = formatColumnText(rightItems);
        const rawResult = [leftText, rightText].filter(Boolean).join('\n\n');
        return postProcessExtractedText(rawResult);
    }

    // Single column default
    const rawResult = formatColumnText(rawItems);
    return postProcessExtractedText(rawResult);
}


/**
 * Extract text from a page range (e.g. pages 14 to 19)
 */
export async function extractTextFromPageRange(
    pdfDoc: any,
    startPage: number,
    endPage: number,
    onProgress?: (current: number, total: number) => void
): Promise<ExtractedRangeResult> {
    const validStart = Math.max(1, Math.min(startPage, pdfDoc.numPages));
    const validEnd = Math.max(validStart, Math.min(endPage, pdfDoc.numPages));
    const totalPages = validEnd - validStart + 1;

    const pagesResult: ExtractedPageResult[] = [];
    const fullTextParts: string[] = [];

    for (let pageNum = validStart; pageNum <= validEnd; pageNum++) {
        if (onProgress) {
            onProgress(pageNum - validStart + 1, totalPages);
        }

        const page = await pdfDoc.getPage(pageNum);
        const pageText = await extractTextFromSinglePage(page, pageNum);

        if (pageText.trim()) {
            const words = pageText.split(/\s+/).filter(Boolean).length;
            pagesResult.push({
                pageNum,
                text: pageText,
                wordCount: words,
            });
            fullTextParts.push(pageText);
        }
    }

    const fullText = fullTextParts.join('\n\n');
    const totalWords = fullText.split(/\s+/).filter(Boolean).length;

    return {
        fullText,
        totalWords,
        pages: pagesResult,
    };
}
