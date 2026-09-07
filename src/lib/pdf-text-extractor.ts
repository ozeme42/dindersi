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

interface TextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Extract clean, layout-aware text from a single PDF page
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

        // Filter out extreme header/footer page numbers and static margins (top 3% and bottom 4%)
        if (y < pageHeight * 0.04 && /^\d+$/.test(str.trim())) {
            continue; // Bottom page number
        }
        if (y > pageHeight * 0.97 && (/^\d+$/.test(str.trim()) || str.includes('ÜNİTE'))) {
            continue; // Running top header
        }

        rawItems.push({ str, x, y, width, height });
    }

    if (rawItems.length === 0) return '';

    // Check if page has a 2-column layout
    const midX = pageWidth / 2;
    const leftItems = rawItems.filter(i => i.x + i.width / 2 < midX - 10);
    const rightItems = rawItems.filter(i => i.x > midX - 10);
    const centerFullWidthItems = rawItems.filter(i => i.x < midX - 10 && i.x + i.width > midX + 10);

    const isTwoColumn = leftItems.length > 5 && rightItems.length > 5 && centerFullWidthItems.length < (leftItems.length + rightItems.length) * 0.3;

    if (isTwoColumn) {
        // Sort full width items by Y descending
        const topThreshold = Math.max(
            ...leftItems.map(i => i.y),
            ...rightItems.map(i => i.y)
        );
        const bottomThreshold = Math.min(
            ...leftItems.map(i => i.y),
            ...rightItems.map(i => i.y)
        );

        const topWide = centerFullWidthItems.filter(i => i.y > topThreshold);
        const bottomWide = centerFullWidthItems.filter(i => i.y < bottomThreshold);

        const textTop = formatColumnText(topWide);
        const textLeft = formatColumnText(leftItems);
        const textRight = formatColumnText(rightItems);
        const textBottom = formatColumnText(bottomWide);

        return [textTop, textLeft, textRight, textBottom].filter(Boolean).join('\n\n');
    }

    // Single column layout
    return formatColumnText(rawItems);
}

/**
 * Format a list of text items into paragraphs
 */
function formatColumnText(items: TextItem[]): string {
    if (items.length === 0) return '';

    // Sort: Y descending (top to bottom), then X ascending (left to right)
    const sorted = [...items].sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff <= 3) {
            return a.x - b.x;
        }
        return b.y - a.y; // higher Y is higher on page
    });

    // Group into visual lines
    const lines: string[] = [];
    let currentLine = '';
    let lastY = sorted[0].y;
    let lastHeight = sorted[0].height || 10;

    for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const yDiff = lastY - item.y; // positive when going down

        if (Math.abs(yDiff) > 4) {
            // New line!
            if (currentLine.trim()) {
                if (yDiff > lastHeight * 1.6) {
                    lines.push(currentLine.trim());
                    lines.push(''); // blank line for paragraph
                } else {
                    lines.push(currentLine.trim());
                }
            }
            currentLine = item.str;
            lastY = item.y;
            lastHeight = item.height || 10;
        } else {
            // Same line: join with space if not already ending in space
            if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
                currentLine += ' ' + item.str;
            } else {
                currentLine += item.str;
            }
        }
    }

    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }

    // Join lines, fixing hyphenation: e.g. "yapılmakta-" followed by "dır" -> "yapılmaktadır"
    let result = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
            result += '\n\n';
            continue;
        }

        if (result.endsWith('-') && !result.endsWith(' -') && !result.endsWith('--')) {
            result = result.slice(0, -1) + line;
        } else if (result && !result.endsWith('\n') && !result.endsWith('\n\n')) {
            result += ' ' + line;
        } else {
            result += line;
        }
    }

    return result
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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
