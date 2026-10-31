/**
 * Türkiye Yüzyılı Maarif Modeli - Dindersi Atölyesi
 * "Sketchnote / Renkli Defter Notu" Açık Tema Standart Tasarım Sistemi.
 */

export const NOTEBOOK_SHEET_CSS = `
    :root {
      --paper-bg: #ffffff;
      --page-bg: #f8fafc;
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
        radial-gradient(#cbd5e1 1.2px, #f8fafc 1.2px);
      background-size: 24px 24px;
      color: var(--text-dark);
      font-family: 'Patrick Hand', 'Neucha', cursive, sans-serif !important;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      line-height: 1.45;
    }

    /* Print / Export Bar */
    .toolbar {
      width: 100%;
      max-width: 940px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .toolbar-info {
      font-size: 16px;
      font-weight: bold;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Patrick Hand', cursive;
    }

    .btn {
      background: #ffffff;
      color: #1e293b;
      border: 2px solid #cbd5e1;
      padding: 8px 18px;
      border-radius: 12px;
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

    /* Not Kağıdı (Notebook Sheet Canvas): 3px koyu füme kenarlık (#1e293b), 20px yuvarlatılmış köşe */
    .notebook-sheet, .fasikul-page {
      width: 100%;
      max-width: 940px;
      background: var(--paper-bg);
      border: 3px solid #1e293b;
      box-shadow: 
        0 15px 35px rgba(0,0,0,0.08),
        0 4px 12px rgba(0,0,0,0.05);
      border-radius: 20px;
      padding: 34px 30px;
      position: relative;
      margin-bottom: 24px;
    }

    /* Başlık Bölümü (Header) - Kesinlikle Tam Ortalanmış & Dengeli 3 Kolonlu Grid */
    .header, .fasikul-header {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
      align-items: center !important;
      border-bottom: 2.5px dashed #94a3b8;
      padding-bottom: 20px;
      margin-bottom: 22px;
      position: relative;
      gap: 16px;
      width: 100%;
    }

    /* Sol Sınıf/Ders Rozeti */
    .badge-grade {
      grid-column: 1 !important;
      justify-self: start !important;
      background: #fde047;
      color: #1e293b;
      font-size: 19px;
      font-weight: bold;
      padding: 6px 16px;
      border: 2.5px solid #1e293b;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      transform: rotate(-3deg);
      display: inline-block;
      box-shadow: 3px 4px 0 #1e293b;
      text-align: center;
      max-width: 220px;
      line-height: 1.25;
      word-break: normal;
      white-space: normal;
    }

    /* Orta Başlık Alanı - SAYFANIN TAM MERKEZİNE MATEMATİKSEL OLARAK HİZALANIR */
    .title-area {
      grid-column: 2 !important;
      justify-self: center !important;
      text-align: center !important;
      padding: 0 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 540px;
    }

    /* Ana Başlık Kapsülü */
    .title-banner, .unit-banner {
      font-family: 'Caveat', cursive;
      font-size: 34px;
      font-weight: 700;
      color: #0f172a;
      border: 2.5px solid #0284c7;
      background: #e0f2fe;
      display: inline-block;
      padding: 4px 24px;
      border-radius: 14px;
      box-shadow: 3px 3px 0 #0284c7;
      line-height: 1.25;
      text-align: center;
      max-width: 100%;
    }

    /* Alt Başlık Kapsülü */
    .subtitle-banner {
      margin-top: 8px;
      background: #f472b6;
      color: #fff;
      font-size: 18px;
      font-weight: bold;
      padding: 3px 20px;
      border-radius: 20px;
      display: inline-block;
      box-shadow: 2px 2px 0 #be185d;
      transform: rotate(0.8deg);
      text-align: center;
      max-width: 100%;
    }

    /* Sağ Taraf: Altın Kural / Sınav İpucu Kutucuğu */
    .quote-box {
      grid-column: 3 !important;
      justify-self: end !important;
      text-align: right !important;
      font-size: 15px;
      color: #475569;
      line-height: 1.35;
      max-width: 220px;
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

    @media (max-width: 768px) {
      .header, .fasikul-header {
        grid-template-columns: 1fr !important;
        justify-items: center !important;
        text-align: center !important;
        gap: 14px !important;
      }
      .badge-grade, .title-area, .quote-box {
        grid-column: 1 !important;
        justify-self: center !important;
        text-align: center !important;
      }
    }

    /* ══ KUTUCUKLAR (Sarı, Mavi, Pembe, Yeşil) ══ */
    .box, .card-box {
      border: 2.5px solid;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      padding: 18px 22px;
      margin-bottom: 20px;
      position: relative;
    }

    .box-yellow, .card-yellow { 
      background: var(--c-yellow-bg); 
      border-color: var(--c-yellow-border); 
      box-shadow: 3px 3px 0 var(--c-yellow-border); 
    }
    .box-pink, .card-pink { 
      background: var(--c-pink-bg); 
      border-color: var(--c-pink-border); 
      box-shadow: 3px 3px 0 var(--c-pink-border); 
    }
    .box-cyan, .box-blue, .card-blue { 
      background: var(--c-cyan-bg); 
      border-color: var(--c-cyan-border); 
      box-shadow: 3px 3px 0 var(--c-cyan-border); 
    }
    .box-green, .card-green { 
      background: var(--c-green-bg); 
      border-color: var(--c-green-border); 
      box-shadow: 3px 3px 0 var(--c-green-border); 
    }
    .box-orange, .card-orange { 
      background: var(--c-orange-bg); 
      border-color: var(--c-orange-border); 
      box-shadow: 3px 3px 0 var(--c-orange-border); 
    }
    .box-purple, .card-purple { 
      background: var(--c-purple-bg); 
      border-color: var(--c-purple-border); 
      box-shadow: 3px 3px 0 var(--c-purple-border); 
    }

    .box-title, .card-title {
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
    .box-green .box-title { color: #15803d; }
    .box-orange .box-title { color: #c2410c; }
    .box-purple .box-title { color: #7e22ce; }

    /* Sınav Etiketi */
    .tag-exam, .tag-highlight {
      background: #ef4444;
      color: #fff;
      font-size: 14px;
      padding: 2px 10px;
      border-radius: 12px;
      font-family: 'Patrick Hand', cursive;
      margin-left: 8px;
      box-shadow: 1px 1px 0 #991b1b;
      display: inline-block;
    }

    /* Sarı Fosforlu Vurgulama (<mark> ve .highlight) */
    mark, .highlight, .hl-yellow {
      background: #fef08a;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: bold;
      color: #854d0e;
      display: inline;
    }

    /* ══ KAVRAMLAR KUTUSU: SİMETRİK 3x2 GRİD ══ */
    .concepts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    @media (max-width: 820px) {
      .concepts-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 540px) {
      .concepts-grid {
        grid-template-columns: 1fr;
      }
    }

    .concept-card, .concept-item {
      background: rgba(255, 255, 255, 0.7);
      border: 1.5px solid #fde047;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 17px;
      line-height: 1.35;
      color: #1e293b;
      box-shadow: 1px 2px 4px rgba(0,0,0,0.03);
    }

    .concept-badge, .c-tag {
      font-weight: bold;
      padding: 2px 12px;
      border-radius: 20px;
      font-size: 15px;
      white-space: nowrap;
      border: 1.5px solid;
      display: inline-block;
      align-self: flex-start;
      margin-bottom: 2px;
    }

    .badge-c-yellow { background: #fef08a; color: #854d0e; border-color: #ca8a04; }
    .badge-c-green { background: #bbf7d0; color: #166534; border-color: #16a34a; }
    .badge-c-cyan { background: #bae6fd; color: #075985; border-color: #0284c7; }
    .badge-c-pink { background: #fbcfe8; color: #9d174d; border-color: #db2777; }
    .badge-c-purple { background: #e9d5ff; color: #6b21a8; border-color: #9333ea; }
    .badge-c-orange { background: #fed7aa; color: #9a3412; border-color: #ea580c; }

    /* ══ İKİ SÜTUNLU DETAY ALANI (Sol: Mavi | Sağ: Pembe) ══ */
    .columns-2, .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .columns-2, .grid-2 { grid-template-columns: 1fr; }
      .header, .fasikul-header { flex-direction: column; gap: 14px; text-align: center; }
      .quote-box { text-align: center; }
    }

    .list-item {
      font-size: 17.5px;
      line-height: 1.4;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 9px;
      color: #334155;
    }
    .list-item strong { color: #0f172a; }
    .list-item:last-child { margin-bottom: 0; }

    .bullet-num {
      width: 25px;
      height: 25px;
      min-width: 25px;
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
    .bullet-num-green { background: #16a34a; }
    .bullet-num-orange { background: #ea580c; }
    .bullet-num-purple { background: #9333ea; }

    /* ══ ALT KUTU (Yeşil Blok - Sınav Tuzakları ve Kritik Noktalar) ══ */
    .traps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
    }
    .trap-card {
      background: rgba(255, 255, 255, 0.75);
      border: 1.5px solid #86efac;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 17px;
      line-height: 1.35;
      color: #1e293b;
    }
    .trap-card strong {
      color: #15803d;
      display: block;
      margin-bottom: 4px;
      font-family: 'Caveat', cursive;
      font-size: 20px;
    }

    /* Zaman Çizelgesi (Timeline) */
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
    .footer, .fasikul-footer {
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
    .footer strong, .fasikul-footer strong { color: #0284c7; }

    /* Print settings: @media print içinde toolbar gizlenir */
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .toolbar { display: none !important; }
      .notebook-sheet, .fasikul-page { 
        border: none !important; 
        box-shadow: none !important; 
        width: 100% !important; 
        max-width: 100% !important; 
        padding: 10px !important; 
        page-break-after: always;
        break-after: page;
      }
    }
`;

export const FASIKUL_SHEET_CSS = NOTEBOOK_SHEET_CSS;

/**
 * Ensures the generated HTML conforms to the complete Notebook-Sheet document structure
 * with correct Google Fonts (Caveat:wght@700, Patrick Hand) and CSS.
 */
export function formatNotebookSheetHtml(rawHtml: string, metadata: { title: string; grade?: string; courseTitle?: string }): string {
    let cleaned = (rawHtml || '').trim();
    if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    // Ensure badge text is balanced and not excessively wide
    cleaned = cleaned.replace(
        /<div class="badge-grade">★\s*\d+\.\s*Sınıf\s+Din\s+Kültürü\s+ve\s+Ahlak\s+Bilgisi<\/div>/gi,
        `<div class="badge-grade">★ ${metadata.grade ? `${metadata.grade}. Sınıf` : '5. Sınıf'} Din Kültürü</div>`
    );

    const hasHead = cleaned.toLowerCase().includes('<head') && cleaned.toLowerCase().includes('</head>');
    const hasFonts = cleaned.includes('fonts.googleapis.com') && cleaned.includes('Caveat');

    // Always inject the authoritative balanced CSS into existing style tag
    if (hasHead && hasFonts) {
        if (cleaned.includes('<style>') && cleaned.includes('</style>')) {
            return cleaned.replace(/<style>[\s\S]*?<\/style>/i, `<style>\n${NOTEBOOK_SHEET_CSS}\n  </style>`);
        }
    }

    // Extract body content if wrapped in <body>
    let bodyContent = cleaned;
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
        bodyContent = bodyMatch[1].trim();
    }

    // Ensure notebook-sheet canvas and print toolbar
    const hasSheet = bodyContent.includes('class="notebook-sheet"') || bodyContent.includes("class='notebook-sheet'") ||
                     bodyContent.includes('class="fasikul-page"') || bodyContent.includes("class='fasikul-page'");
    const hasToolbar = bodyContent.includes('class="toolbar"') || bodyContent.includes("class='toolbar'");

    if (!hasSheet) {
        bodyContent = `
  <div class="notebook-sheet" id="summaryCard">
    ${bodyContent}
  </div>`;
    }

    if (!hasToolbar) {
        bodyContent = `
  <div class="toolbar">
    <div class="toolbar-info">
      📘 <span>Sketchnote / Renkli Defter Notu</span>
    </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Patrick Hand&display=swap" rel="stylesheet">
  <style>
${NOTEBOOK_SHEET_CSS}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}
