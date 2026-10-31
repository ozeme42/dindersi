/**
 * Notebook Sheet Lesson Note standard CSS & HTML formatter.
 * Provides the hand-drawn, pedagogical notebook paper styling with Google Fonts:
 * Caveat, Patrick Hand, and Neucha.
 */

export const NOTEBOOK_SHEET_CSS = `
    :root {
      --paper-bg: #ffffff;
      --page-bg: #f1f5f9;
      --text-dark: #1e293b;
      --text-muted: #64748b;
      
      --c-yellow-bg: #fefce8;
      --c-yellow-border: #eab308;
      --c-yellow-badge: #fde047;
      
      --c-pink-bg: #fdf2f8;
      --c-pink-border: #ec4899;
      --c-pink-badge: #f472b6;
      
      --c-cyan-bg: #f0f9ff;
      --c-cyan-border: #0284c7;
      --c-cyan-badge: #38bdf8;
      
      --c-green-bg: #f0fdf4;
      --c-green-border: #16a34a;
      --c-green-badge: #4ade80;
      
      --c-orange-bg: #fff7ed;
      --c-orange-border: #ea580c;
      --c-orange-badge: #fb923c;
      
      --c-purple-bg: #faf5ff;
      --c-purple-border: #9333ea;
      --c-purple-badge: #c084fc;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--page-bg);
      background-image: 
        radial-gradient(#cbd5e1 1.2px, transparent 1.2px),
        radial-gradient(#cbd5e1 1.2px, #f1f5f9 1.2px);
      background-size: 24px 24px;
      color: var(--text-dark);
      font-family: 'Patrick Hand', cursive, sans-serif !important;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    /* Print / Export Bar */
    .toolbar {
      width: 100%;
      max-width: 920px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }

    .btn {
      background: #ffffff;
      color: #1e293b;
      border: 2px solid #cbd5e1;
      padding: 8px 18px;
      border-radius: 10px;
      font-family: 'Patrick Hand', cursive !important;
      font-size: 17px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      background: #0284c7;
      color: #fff;
      border-color: #0284c7;
    }

    /* Notebook Sheet Canvas */
    .notebook-sheet {
      width: 100%;
      max-width: 920px;
      background: var(--paper-bg);
      border: 3px solid #334155;
      box-shadow: 
        0 15px 35px rgba(0,0,0,0.08),
        0 4px 12px rgba(0,0,0,0.05);
      border-radius: 18px;
      padding: 34px 30px;
      position: relative;
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px dashed #94a3b8;
      padding-bottom: 20px;
      margin-bottom: 22px;
      position: relative;
    }

    .badge-grade {
      background: #fde047;
      color: #1e293b;
      font-size: 26px;
      font-weight: bold;
      padding: 6px 18px;
      border: 2px solid #334155;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      transform: rotate(-3deg);
      display: inline-block;
      box-shadow: 3px 4px 0 #334155;
    }

    .title-area {
      text-align: center;
      flex-grow: 1;
      padding: 0 16px;
    }

    .title-banner {
      font-family: 'Caveat', cursive;
      font-size: 34px;
      font-weight: 700;
      color: #0f172a;
      border: 2.5px solid #0284c7;
      background: #e0f2fe;
      display: inline-block;
      padding: 4px 24px;
      border-radius: 12px;
      box-shadow: 3px 3px 0 #0284c7;
      line-height: 1.25;
    }

    .subtitle-banner {
      margin-top: 8px;
      background: #f472b6;
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      padding: 3px 20px;
      border-radius: 20px;
      display: inline-block;
      box-shadow: 2px 2px 0 #be185d;
      transform: rotate(0.8deg);
    }

    .quote-box {
      text-align: right;
      font-size: 16px;
      color: #475569;
      line-height: 1.35;
      max-width: 190px;
      background: #f8fafc;
      padding: 8px 12px;
      border: 1.5px dashed #94a3b8;
      border-radius: 10px;
    }
    .quote-box strong {
      color: #0369a1;
      display: block;
      font-size: 16px;
    }

    /* Hand-Drawn Styled Boxes */
    .box {
      border: 2.5px solid;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      padding: 16px 22px;
      margin-bottom: 20px;
      position: relative;
    }

    .box-yellow { 
      background: var(--c-yellow-bg); 
      border-color: var(--c-yellow-border); 
      box-shadow: 3px 3px 0 var(--c-yellow-border); 
    }
    .box-pink { 
      background: var(--c-pink-bg); 
      border-color: var(--c-pink-border); 
      box-shadow: 3px 3px 0 var(--c-pink-border); 
    }
    .box-cyan { 
      background: var(--c-cyan-bg); 
      border-color: var(--c-cyan-border); 
      box-shadow: 3px 3px 0 var(--c-cyan-border); 
    }
    .box-orange { 
      background: var(--c-orange-bg); 
      border-color: var(--c-orange-border); 
      box-shadow: 3px 3px 0 var(--c-orange-border); 
    }

    .box-title {
      font-family: 'Caveat', cursive;
      font-size: 26px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .box-yellow .box-title { color: #a16207; }
    .box-pink .box-title { color: #be185d; }
    .box-cyan .box-title { color: #0369a1; }
    .box-orange .box-title { color: #c2410c; }

    .tag-exam {
      background: #ef4444;
      color: #fff;
      font-size: 15px;
      padding: 2px 10px;
      border-radius: 12px;
      font-family: 'Patrick Hand', cursive;
      margin-left: 8px;
      box-shadow: 1px 1px 0 #991b1b;
    }

    /* Grid Layout for Concepts */
    .concepts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px 16px;
    }

    .concept-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 17px;
      line-height: 1.35;
      color: #1e293b;
    }

    .concept-badge {
      font-weight: bold;
      padding: 2px 9px;
      border-radius: 6px;
      font-size: 15px;
      white-space: nowrap;
      border: 1.5px solid;
    }

    .badge-c-yellow { background: #fef08a; color: #854d0e; border-color: #ca8a04; }
    .badge-c-green { background: #bbf7d0; color: #166534; border-color: #16a34a; }
    .badge-c-cyan { background: #bae6fd; color: #075985; border-color: #0284c7; }
    .badge-c-pink { background: #fbcfe8; color: #9d174d; border-color: #db2777; }
    .badge-c-purple { background: #e9d5ff; color: #6b21a8; border-color: #9333ea; }
    .badge-c-orange { background: #fed7aa; color: #9a3412; border-color: #ea580c; }

    .highlight {
      background: #fef08a;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: bold;
      color: #854d0e;
    }

    /* Two Columns Section */
    .columns-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .columns-2 { grid-template-columns: 1fr; }
      .header { flex-direction: column; gap: 14px; text-align: center; }
      .quote-box { text-align: center; }
    }

    .list-item {
      font-size: 17px;
      line-height: 1.4;
      margin-bottom: 11px;
      display: flex;
      align-items: flex-start;
      gap: 9px;
      color: #334155;
    }
    .list-item strong { color: #0f172a; }
    .list-item:last-child { margin-bottom: 0; }

    .bullet-num {
      width: 24px;
      height: 24px;
      min-width: 24px;
      border-radius: 50%;
      background: #0284c7;
      color: #fff;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      margin-top: 2px;
      box-shadow: 1px 1px 0 rgba(0,0,0,0.2);
    }
    .bullet-num-pink { background: #ec4899; }

    /* Timeline / Step Flow Section */
    .timeline {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
      padding-top: 18px;
      margin-top: 8px;
      overflow-x: auto;
    }
    .timeline::before {
      content: "";
      position: absolute;
      top: 28px;
      left: 10px;
      right: 10px;
      height: 3px;
      background: repeating-linear-gradient(90deg, #ea580c, #ea580c 8px, transparent 8px, transparent 14px);
      z-index: 1;
    }
    .timeline-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      z-index: 2;
      width: 95px;
      min-width: 80px;
      padding: 0 4px;
    }
    .t-year {
      background: #ea580c;
      color: #fff;
      font-weight: bold;
      font-size: 14px;
      padding: 3px 8px;
      border-radius: 12px;
      margin-bottom: 7px;
      box-shadow: 1px 2px 0 rgba(0,0,0,0.15);
      white-space: nowrap;
    }
    .t-dot {
      width: 14px;
      height: 14px;
      background: #fff;
      border: 3px solid #ea580c;
      border-radius: 50%;
      margin-bottom: 6px;
      box-shadow: 0 0 0 2px #ffedd5;
    }
    .t-desc {
      font-size: 13.5px;
      line-height: 1.25;
      color: #334155;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.5px dashed #cbd5e1;
      padding-top: 14px;
      margin-top: 16px;
      font-size: 16px;
      color: #64748b;
      gap: 12px;
    }
    .footer strong { color: #0284c7; }

    /* Print settings */
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .toolbar { display: none !important; }
      .notebook-sheet { border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; padding: 10px !important; }
    }
`;

/**
 * Ensures the generated HTML conforms to the complete Notebook-Sheet document structure
 * with correct Google Fonts and CSS.
 */
export function formatNotebookSheetHtml(rawHtml: string, metadata: { title: string; grade?: string; courseTitle?: string }): string {
    let cleaned = (rawHtml || '').trim();
    if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const hasHead = cleaned.toLowerCase().includes('<head') && cleaned.toLowerCase().includes('</head>');
    const hasStyle = cleaned.includes('.notebook-sheet') && cleaned.includes('--paper-bg');
    const hasFonts = cleaned.includes('fonts.googleapis.com') && cleaned.includes('Caveat');

    if (hasHead && hasStyle && hasFonts) {
        if (!cleaned.includes("font-family: 'Patrick Hand', cursive, sans-serif !important;")) {
            cleaned = cleaned.replace(
                /font-family:\s*['"]?Patrick Hand['"]?,\s*cursive,\s*sans-serif;?/g,
                "font-family: 'Patrick Hand', cursive, sans-serif !important;"
            );
        }
        return cleaned;
    }

    // Extract body content if wrapped in <body>
    let bodyContent = cleaned;
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        bodyContent = bodyMatch[1].trim();
    }

    // Ensure notebook-sheet canvas and print toolbar
    if (!bodyContent.includes('class="notebook-sheet"') && !bodyContent.includes("class='notebook-sheet'")) {
        bodyContent = `
  <div class="toolbar">
    <button class="btn" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>
  </div>
  <div class="notebook-sheet" id="summaryCard">
    ${bodyContent}
  </div>`;
    } else if (!bodyContent.includes('class="toolbar"') && !bodyContent.includes("class='toolbar'")) {
        bodyContent = `
  <div class="toolbar">
    <button class="btn" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>
  </div>
  ${bodyContent}`;
    }

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title} - Ders Notu</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&family=Neucha&display=swap" rel="stylesheet">
  <style>
${NOTEBOOK_SHEET_CSS}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}
