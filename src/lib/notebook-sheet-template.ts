/**
 * Türkiye Yüzyılı Maarif Modeli - Dindersi Atölyesi
 * Ünite ve Konu Özet Fasikülü Standart Tasarım Sistemi ve Şablon Motoru.
 */

export const FASIKUL_SHEET_CSS = `
    :root {
      --bg-dots: #f8fafc;
      --paper: #ffffff;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-subtle: #64748b;
      
      --c-brand: #0284c7;
      --c-brand-bg: #e0f2fe;
      
      --c-yellow-border: #f59e0b;
      --c-yellow-bg: #fffbeb;
      --c-yellow-text: #b45309;
      
      --c-green-border: #16a34a;
      --c-green-bg: #f0fdf4;
      --c-green-text: #15803d;
      
      --c-pink-border: #db2777;
      --c-pink-bg: #fdf2f8;
      --c-pink-text: #be185d;
      
      --c-blue-border: #0284c7;
      --c-blue-bg: #f0f9ff;
      --c-blue-text: #0369a1;
      
      --c-orange-border: #ea580c;
      --c-orange-bg: #fff7ed;
      --c-orange-text: #c2410c;
      
      --c-purple-border: #9333ea;
      --c-purple-bg: #faf5ff;
      --c-purple-text: #7e22ce;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dots);
      background-image: 
        radial-gradient(#cbd5e1 1.2px, transparent 1.2px),
        radial-gradient(#cbd5e1 1.2px, #f8fafc 1.2px);
      background-size: 24px 24px;
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1.45;
    }

    /* Print & Action Bar */
    .toolbar {
      width: 100%;
      max-width: 960px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
    }

    .toolbar-info {
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn {
      background: #ffffff;
      color: #0f172a;
      border: 1.5px solid #cbd5e1;
      padding: 9px 20px;
      border-radius: 10px;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.06);
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn:hover {
      background: #0284c7;
      color: #fff;
      border-color: #0284c7;
      transform: translateY(-1px);
    }

    /* Fasikül Page Container (A4 / Book proportions) */
    .fasikul-page, .notebook-sheet {
      width: 100%;
      max-width: 960px;
      background: var(--paper);
      border: 2px solid #cbd5e1;
      border-radius: 20px;
      padding: 30px 28px;
      margin-bottom: 28px;
      box-shadow: 
        0 10px 30px -5px rgba(0, 0, 0, 0.06),
        0 4px 12px rgba(0, 0, 0, 0.03);
      position: relative;
    }

    /* Top Brand & Title Bar */
    .fasikul-header, .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      border-bottom: 2px dashed #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 20px;
      position: relative;
    }

    .top-meta {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #0284c7;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .brand-pill-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 10px;
    }

    .brand-pill {
      background: #0284c7;
      color: #ffffff;
      font-weight: 900;
      font-size: 15px;
      letter-spacing: 0.5px;
      padding: 4px 20px;
      border-radius: 9999px;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
      border: 1.5px solid #38bdf8;
    }

    .brand-sub {
      font-size: 11px;
      font-weight: 800;
      color: #0369a1;
      margin-top: 3px;
      letter-spacing: 1px;
    }

    .header-main-row {
      width: 100%;
      display: grid;
      grid-template-columns: 140px 1fr 180px;
      align-items: center;
      gap: 12px;
      margin-top: 6px;
    }

    @media (max-width: 768px) {
      .header-main-row {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 12px;
      }
      .badge-grade-col, .quote-box-col {
        display: flex;
        justify-content: center;
      }
    }

    .badge-grade {
      background: #fde047;
      color: #1e293b;
      font-size: 17px;
      font-weight: 900;
      padding: 6px 16px;
      border: 2px solid #334155;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 2px 3px 0 #334155;
    }

    .unit-banner, .title-banner {
      background: #db2777;
      color: #ffffff;
      font-size: 20px;
      font-weight: 900;
      text-align: center;
      padding: 10px 22px;
      border-radius: 9999px;
      border: 2px solid #be185d;
      box-shadow: 0 4px 10px rgba(219, 39, 119, 0.3);
      line-height: 1.25;
      letter-spacing: -0.2px;
    }

    .quote-box {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 8px 12px;
      font-size: 12.5px;
      color: #475569;
      line-height: 1.35;
      text-align: right;
    }
    .quote-box strong {
      color: #0369a1;
      display: block;
      font-size: 12px;
    }

    /* Cards & Boxes */
    .card-box, .box {
      border: 2px solid;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 20px;
      background: #ffffff;
      position: relative;
    }

    .card-yellow, .box-yellow { border-color: var(--c-yellow-border); }
    .card-green, .box-green   { border-color: var(--c-green-border); }
    .card-pink, .box-pink     { border-color: var(--c-pink-border); }
    .card-blue, .box-cyan     { border-color: var(--c-blue-border); }
    .card-orange, .box-orange { border-color: var(--c-orange-border); }
    .card-purple, .box-purple { border-color: var(--c-purple-border); }

    .card-title, .box-title {
      font-size: 16px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      letter-spacing: -0.2px;
    }

    .card-yellow .card-title, .box-yellow .box-title { color: var(--c-yellow-text); }
    .card-green  .card-title, .box-green  .box-title { color: var(--c-green-text); }
    .card-pink   .card-title, .box-pink   .box-title { color: var(--c-pink-text); }
    .card-blue   .card-title, .box-cyan   .box-title { color: var(--c-blue-text); }
    .card-orange .card-title, .box-orange .box-title { color: var(--c-orange-text); }
    .card-purple .card-title, .box-purple .box-title { color: var(--c-purple-text); }

    .tag-highlight, .tag-exam {
      font-size: 12.5px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 9999px;
      margin-left: 6px;
    }
    .tag-yellow { background: #fef08a; color: #854d0e; }
    .tag-red    { background: #fee2e2; color: #991b1b; }
    .tag-pink   { background: #fce7f3; color: #9d174d; }

    /* Modern Structured Tables */
    .fasikul-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      font-size: 14px;
    }

    .fasikul-table th {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      font-size: 13.5px;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1.5px solid #cbd5e1;
      border-right: 1.5px solid #cbd5e1;
    }
    .fasikul-table th:last-child { border-right: none; }

    .fasikul-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1.5px solid #cbd5e1;
      vertical-align: middle;
      color: #1e293b;
      line-height: 1.45;
    }
    .fasikul-table td:last-child { border-right: none; }
    .fasikul-table tr:last-child td { border-bottom: none; }
    .fasikul-table tr:hover td { background-color: #f8fafc; }

    /* Topic Pill Badges */
    .pill-topic {
      display: inline-block;
      font-weight: 800;
      font-size: 13px;
      padding: 3px 12px;
      border-radius: 9999px;
      border: 1.5px solid;
      white-space: nowrap;
    }
    .pill-topic-pink  { background: #fdf2f8; color: #db2777; border-color: #f472b6; }
    .pill-topic-blue  { background: #f0f9ff; color: #0284c7; border-color: #38bdf8; }
    .pill-topic-green { background: #f0fdf4; color: #16a34a; border-color: #4ade80; }

    /* 4 Steps Section */
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px 18px;
    }
    @media (max-width: 640px) {
      .steps-grid { grid-template-columns: 1fr; }
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13.5px;
      color: #1e293b;
      line-height: 1.4;
    }
    .step-num {
      width: 26px;
      height: 26px;
      min-width: 26px;
      border-radius: 50%;
      color: #fff;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }
    .step-num-1 { background: #db2777; }
    .step-num-2 { background: #0284c7; }
    .step-num-3 { background: #16a34a; }
    .step-num-4 { background: #ea580c; }

    /* Concept Tags List */
    .concept-row, .concept-item {
      margin-bottom: 11px;
      font-size: 14px;
      line-height: 1.45;
      color: #1e293b;
    }
    .concept-row:last-child { margin-bottom: 0; }

    .c-tag, .concept-badge {
      display: inline-block;
      font-weight: 800;
      font-size: 13px;
      padding: 2px 10px;
      border-radius: 9999px;
      border: 1.5px solid;
      margin-right: 6px;
      white-space: nowrap;
    }
    .c-tag-pink   { background: #fdf2f8; color: #be185d; border-color: #ec4899; }
    .c-tag-blue   { background: #f0f9ff; color: #0369a1; border-color: #0284c7; }
    .c-tag-green  { background: #f0fdf4; color: #15803d; border-color: #16a34a; }
    .c-tag-orange { background: #fff7ed; color: #c2410c; border-color: #ea580c; }
    .c-tag-purple { background: #faf5ff; color: #7e22ce; border-color: #9333ea; }
    .c-tag-yellow { background: #fefce8; color: #854d0e; border-color: #eab308; }

    .hl-yellow, .highlight {
      background: #fef08a;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 700;
      color: #854d0e;
    }

    /* 2 Columns Grid */
    .grid-2, .columns-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 768px) {
      .grid-2, .columns-2 { grid-template-columns: 1fr; }
    }

    /* 3 Mini Cards */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    @media (max-width: 768px) {
      .grid-3 { grid-template-columns: 1fr; }
    }

    .mini-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 13px;
    }
    .mini-card-title {
      font-weight: 800;
      font-size: 13.5px;
      color: #0369a1;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
      text-align: center;
    }

    /* Visual Family Tree Diagram */
    .family-tree {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
    }
    .tree-row {
      display: flex;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
      width: 100%;
    }
    .tree-node {
      border: 1.5px solid;
      border-radius: 10px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .tree-center {
      background: #db2777;
      color: #fff;
      border-color: #be185d;
      font-size: 15px;
      padding: 8px 24px;
      border-radius: 9999px;
      box-shadow: 0 3px 8px rgba(219, 39, 119, 0.35);
    }

    /* Names Bubbles */
    .bubble-wrap {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .bubble-pill {
      border: 1.5px solid #0284c7;
      background: #f0f9ff;
      color: #0369a1;
      font-weight: 800;
      font-size: 13px;
      padding: 3px 14px;
      border-radius: 9999px;
    }
    .bubble-center {
      background: #fef08a;
      color: #854d0e;
      border-color: #ca8a04;
    }

    /* Timeline Comparative Table */
    .timeline-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      font-size: 13px;
    }
    .timeline-table th {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      padding: 8px 12px;
      border-bottom: 1.5px solid #cbd5e1;
      border-right: 1.5px solid #cbd5e1;
    }
    .timeline-table th:last-child { border-right: none; }
    .timeline-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1.5px solid #cbd5e1;
      vertical-align: middle;
      color: #1e293b;
    }
    .timeline-table td:last-child { border-right: none; }
    .timeline-table tr:last-child td { border-bottom: none; }

    .year-badge, .t-year {
      display: inline-block;
      font-weight: 900;
      font-size: 13px;
      padding: 3px 8px;
      border-radius: 8px;
      border: 1.5px solid;
      white-space: nowrap;
      text-align: center;
      min-width: 48px;
    }
    .year-pink   { background: #fdf2f8; color: #be185d; border-color: #ec4899; }
    .year-blue   { background: #f0f9ff; color: #0369a1; border-color: #0284c7; }
    .year-green  { background: #f0fdf4; color: #15803d; border-color: #16a34a; }
    .year-orange { background: #fff7ed; color: #c2410c; border-color: #ea580c; }
    .year-purple { background: #faf5ff; color: #7e22ce; border-color: #9333ea; }
    .year-yellow { background: #fefce8; color: #854d0e; border-color: #eab308; }

    /* Page Footer */
    .fasikul-footer, .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 18px;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
    }
    .fasikul-footer strong, .footer strong { color: #0284c7; }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .toolbar { display: none !important; }
      .fasikul-page, .notebook-sheet {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        width: 100% !important;
        padding: 12mm 10mm !important;
        margin: 0 !important;
        page-break-after: always;
        break-after: page;
      }
      .fasikul-page:last-child, .notebook-sheet:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
    }
`;

export const NOTEBOOK_SHEET_CSS = FASIKUL_SHEET_CSS;

/**
 * Ensures the generated HTML conforms to the complete Fasikül document structure
 * with correct typography and CSS.
 */
export function formatNotebookSheetHtml(rawHtml: string, metadata: { title: string; grade?: string; courseTitle?: string }): string {
    let cleaned = (rawHtml || '').trim();
    if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const hasHead = cleaned.toLowerCase().includes('<head') && cleaned.toLowerCase().includes('</head>');
    const hasStyle = cleaned.includes('.fasikul-page') || cleaned.includes('.notebook-sheet');
    const hasFonts = cleaned.includes('fonts.googleapis.com') && (cleaned.includes('Plus+Jakarta+Sans') || cleaned.includes('Caveat'));

    if (hasHead && hasStyle && hasFonts) {
        return cleaned;
    }

    // Extract body content if wrapped in <body>
    let bodyContent = cleaned;
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        bodyContent = bodyMatch[1].trim();
    }

    const hasToolbar = bodyContent.includes('class="toolbar"') || bodyContent.includes("class='toolbar'");
    const hasContainer = bodyContent.includes('class="fasikul-page"') || bodyContent.includes("class='fasikul-page'") ||
                         bodyContent.includes('class="notebook-sheet"') || bodyContent.includes("class='notebook-sheet'");

    let finalBody = bodyContent;
    if (!hasContainer) {
        finalBody = `
  <div class="fasikul-page" id="page1">
    ${finalBody}
  </div>`;
    }
    if (!hasToolbar) {
        finalBody = `
  <div class="toolbar">
    <div class="toolbar-info">
      📘 <span>Türkiye Yüzyılı Maarif Modeli — Ders Notu & Özet Fasikülü</span>
    </div>
    <button class="btn" onclick="window.print()">
      🖨️ Yazdır / PDF Olarak Kaydet
    </button>
  </div>
  ${finalBody}`;
    }

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title} - Özet Fasikülü</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
${FASIKUL_SHEET_CSS}
  </style>
</head>
<body>
${finalBody}
</body>
</html>`;
}
