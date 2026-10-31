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
      grid-template-columns: minmax(140px, 200px) 1fr minmax(140px, 200px) !important;
      align-items: center !important;
      justify-content: center !important;
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
      font-size: 17px;
      font-weight: bold;
      padding: 6px 14px;
      border: 2.5px solid #1e293b;
      border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
      transform: rotate(-2.5deg);
      display: inline-block;
      box-shadow: 3px 3px 0 #1e293b;
      text-align: center;
      width: 100%;
      max-width: 200px;
      box-sizing: border-box;
      line-height: 1.25;
      word-break: normal;
      white-space: normal;
    }

    /* Orta Başlık Alanı - SAYFANIN TAM MERKEZİNE MATEMATİKSEL OLARAK HİZALANIR */
    .title-area {
      grid-column: 2 !important;
      justify-self: center !important;
      text-align: center !important;
      padding: 0 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 580px;
    }

    /* Ana Başlık Kapsülü */
    .title-banner, .unit-banner {
      font-family: 'Caveat', cursive;
      font-size: 32px;
      font-weight: 700;
      color: #0f172a;
      border: 2.5px solid #0284c7;
      background: #e0f2fe;
      display: inline-block;
      padding: 5px 24px;
      border-radius: 14px;
      box-shadow: 3px 3px 0 #0284c7;
      line-height: 1.25;
      text-align: center;
      max-width: 100%;
      word-break: keep-all;
    }

    /* Alt Başlık Kapsülü */
    .subtitle-banner {
      margin-top: 8px;
      background: #f472b6;
      color: #fff;
      font-size: 17px;
      font-weight: bold;
      padding: 3px 18px;
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
      font-size: 14.5px;
      color: #475569;
      line-height: 1.35;
      width: 100%;
      max-width: 200px;
      box-sizing: border-box;
      background: #f8fafc;
      padding: 8px 12px;
      border: 1.5px dashed #94a3b8;
      border-radius: 10px;
    }
    .quote-box strong {
      color: #0369a1;
      display: block;
      font-size: 15px;
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
        max-width: 100% !important;
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

    /* ══ AKILLI TAHTA ODAK VE BÖLÜM BÜYÜTME SİSTEMİ ══ */
    .sb-focusable {
      cursor: pointer !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important;
      position: relative !important;
    }
    .sb-focusable:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1), 3px 3px 0 currentColor !important;
    }

    .sb-zoom-trigger-btn {
      position: absolute !important;
      top: 10px !important;
      right: 12px !important;
      z-index: 10 !important;
      background: #ffffff !important;
      color: #0369a1 !important;
      border: 2px solid #0284c7 !important;
      padding: 4px 12px !important;
      border-radius: 12px !important;
      font-family: 'Patrick Hand', cursive, sans-serif !important;
      font-size: 14px !important;
      font-weight: bold !important;
      cursor: pointer !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12) !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 5px !important;
      transition: all 0.2s ease !important;
      pointer-events: auto !important;
    }
    .sb-zoom-trigger-btn:hover {
      background: #0284c7 !important;
      color: #ffffff !important;
      transform: scale(1.06) !important;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35) !important;
    }
    .sb-zoom-trigger-btn:active {
      transform: scale(0.97) !important;
    }

    #smartboardFocusOverlay {
      display: none;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483647 !important;
      background: rgba(15, 23, 42, 0.96) !important;
      backdrop-filter: blur(14px) !important;
      -webkit-backdrop-filter: blur(14px) !important;
      flex-direction: column !important;
      align-items: center !important;
      padding: 16px !important;
      overflow-y: auto !important;
      box-sizing: border-box !important;
      font-family: 'Patrick Hand', 'Neucha', cursive, sans-serif !important;
      zoom: 1 !important;
      transform: none !important;
    }
    #smartboardFocusOverlay.active {
      display: flex !important;
      pointer-events: auto !important;
    }

    .smartboard-toolbar {
      width: 100%;
      max-width: 1000px;
      background: #0f172a;
      border: 2px solid #334155;
      border-radius: 20px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.5);
      color: #fff;
      flex-wrap: wrap;
      margin-bottom: 16px;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .sb-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sb-tag {
      background: #fde047;
      color: #1e293b;
      font-weight: bold;
      font-size: 14px;
      padding: 3px 10px;
      border-radius: 10px;
      border: 1.5px solid #1e293b;
    }
    .sb-title {
      font-size: 18px;
      color: #38bdf8;
      max-width: 320px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: 'Caveat', cursive;
    }

    .sb-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .sb-btn-group {
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(255,255,255,0.06);
      padding: 4px 8px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .sb-label {
      font-size: 14px;
      color: #94a3b8;
      margin-right: 4px;
    }
    .sb-zoom-badge {
      font-size: 14px;
      font-weight: bold;
      color: #fde047;
      min-width: 44px;
      text-align: center;
      font-family: monospace;
    }
    .sb-btn {
      background: #1e293b;
      color: #f8fafc;
      border: 1.5px solid #475569;
      padding: 5px 12px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: bold;
      font-family: 'Patrick Hand', cursive !important;
      cursor: pointer;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
    }
    .sb-btn:hover {
      background: #0284c7;
      color: #fff;
      border-color: #38bdf8;
      transform: translateY(-1px);
    }
    .sb-btn-ghost {
      background: transparent;
      border-color: transparent;
      color: #cbd5e1;
    }
    .sb-btn-ghost:hover {
      background: rgba(255,255,255,0.1);
    }
    .sb-btn-fullscreen {
      background: #4338ca;
      border-color: #6366f1;
      color: #fff;
    }
    .sb-btn-fullscreen:hover {
      background: #4f46e5;
    }
    .sb-btn-close {
      background: #991b1b;
      border-color: #ef4444;
      color: #fff;
    }
    .sb-btn-close:hover {
      background: #b91c1c;
    }

    .smartboard-stage {
      width: 100%;
      max-width: 1000px;
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-bottom: 30px;
    }
    .smartboard-card-wrap {
      width: 100%;
      background: #ffffff;
      border: 3px solid #1e293b;
      border-radius: 22px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.4);
      padding: 34px 38px;
      color: #1e293b;
      position: relative;
      font-size: calc(19px * var(--sb-scale, 1.25));
      line-height: 1.5;
      transition: font-size 0.15s ease;
    }
    .smartboard-card-wrap .box-title {
      font-size: calc(30px * var(--sb-scale, 1.25));
      margin-bottom: 16px;
    }
    .smartboard-card-wrap .concept-card {
      padding: calc(14px * var(--sb-scale, 1.25));
    }
    .smartboard-card-wrap .concept-badge {
      font-size: calc(18px * var(--sb-scale, 1.25));
      padding: calc(3px * var(--sb-scale, 1.25)) calc(12px * var(--sb-scale, 1.25));
    }
    .smartboard-card-wrap .list-item {
      font-size: calc(19px * var(--sb-scale, 1.25));
      margin-bottom: calc(14px * var(--sb-scale, 1.25));
    }
    .smartboard-card-wrap .bullet-num {
      width: calc(30px * var(--sb-scale, 1.25));
      height: calc(30px * var(--sb-scale, 1.25));
      min-width: calc(30px * var(--sb-scale, 1.25));
      font-size: calc(16px * var(--sb-scale, 1.25));
    }
    .smartboard-card-wrap .trap-card {
      padding: calc(16px * var(--sb-scale, 1.25));
      font-size: calc(19px * var(--sb-scale, 1.25));
    }
    .smartboard-card-wrap .trap-card strong {
      font-size: calc(22px * var(--sb-scale, 1.25));
    }

    /* Print settings: @media print içinde toolbar gizlenir */
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .toolbar { display: none !important; }
      .sb-focusable::after { display: none !important; }
      .sb-zoom-trigger-btn { display: none !important; }
      #smartboardFocusOverlay { display: none !important; }
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

export const NOTEBOOK_SHEET_JS = `
(function() {
  if (typeof window === 'undefined') return;

  function balanceHeader() {
    try {
      var header = document.querySelector('.header, .fasikul-header');
      if (!header) return;
      var badge = header.querySelector('.badge-grade');
      if (badge && badge.textContent) {
        badge.textContent = badge.textContent.replace(/Din\\s+Kültürü\\s+ve\\s+Ahlak\\s+Bilgisi/gi, 'Din Kültürü').trim();
      }
      var titleBanner = header.querySelector('.title-banner, .unit-banner');
      if (titleBanner && titleBanner.innerHTML.includes('<br')) {
        titleBanner.innerHTML = titleBanner.innerHTML.replace(/<br\\s*[\\/]?>/gi, ' ').trim();
      }
    } catch(e) {}
  }

  function initSmartboardFocus() {
    balanceHeader();

    // Query candidate boxes using all known standard classes
    var rawBoxes = Array.from(document.querySelectorAll(
      '.box, section.box, div.box, section[class*="box-"], div[class*="box-"], .card-box, .box-yellow, .box-cyan, .box-pink, .box-green, .box-orange, .box-purple'
    ));

    // Filter to top-level section boxes only (don't select nested inner items or overlay elements)
    var boxes = rawBoxes.filter(function(el) {
      if (el.id === 'sbCardWrap' || el.id === 'sbStage' || (el.closest && el.closest('#smartboardFocusOverlay'))) return false;
      var parentBox = el.parentElement ? el.parentElement.closest('.box, section[class*="box-"], div[class*="box-"], .card-box') : null;
      return !parentBox;
    });

    if (!boxes.length) return;

    var overlay = document.getElementById('smartboardFocusOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'smartboardFocusOverlay';
      overlay.innerHTML = \`
        <div class="smartboard-toolbar" onclick="event.stopPropagation()">
          <div class="sb-info">
            <span class="sb-tag">📌 <span id="sbSectionStep">1/4</span></span>
            <strong id="sbSectionName" class="sb-title">Bölüm Detayı</strong>
          </div>
          <div class="sb-controls">
            <div class="sb-btn-group">
              <span class="sb-label">🔍 Yazı Boyutu:</span>
              <button type="button" class="sb-btn" id="sbFontDec" title="Yazıyı Küçült (-)">A-</button>
              <span class="sb-zoom-badge" id="sbZoomLabel">125%</span>
              <button type="button" class="sb-btn" id="sbFontInc" title="Yazıyı Büyüt (+)">A+</button>
              <button type="button" class="sb-btn sb-btn-ghost" id="sbFontReset" title="Sıfırla">100%</button>
            </div>
            <div class="sb-btn-group">
              <button type="button" class="sb-btn" id="sbPrevBtn" title="Önceki Bölüm (Sol Ok)">◀ Önceki</button>
              <button type="button" class="sb-btn" id="sbNextBtn" title="Sonraki Bölüm (Sağ Ok)">Sonraki ▶</button>
            </div>
            <div class="sb-btn-group">
              <button type="button" class="sb-btn sb-btn-fullscreen" id="sbFullscreenBtn" title="Tam Ekran">⛶ Tam Ekran</button>
              <button type="button" class="sb-btn sb-btn-close" id="sbCloseBtn" title="Kapat (ESC)">✕ Kapat</button>
            </div>
          </div>
        </div>
        <div class="smartboard-stage" id="sbStage">
          <div class="smartboard-card-wrap" id="sbCardWrap">
            <div id="sbCardContent"></div>
          </div>
        </div>
      \`;

      // Append to documentElement so body zoom/transform cannot scale or clip it
      (document.documentElement || document.body).appendChild(overlay);

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.id === 'sbStage') {
          closeOverlay();
        }
      });
    }

    var currentIdx = 0;
    var currentScale = 1.25;

    function updateZoomUI() {
      var cardWrap = document.getElementById('sbCardWrap');
      var zoomLabel = document.getElementById('sbZoomLabel');
      if (cardWrap) {
        cardWrap.style.setProperty('--sb-scale', currentScale);
      }
      if (zoomLabel) {
        zoomLabel.textContent = Math.round(currentScale * 100) + '%';
      }
    }

    function openSection(index) {
      if (index < 0) index = 0;
      if (index >= boxes.length) index = boxes.length - 1;
      currentIdx = index;

      var targetBox = boxes[currentIdx];
      if (!targetBox) return;

      var stepEl = document.getElementById('sbSectionStep');
      var nameEl = document.getElementById('sbSectionName');
      var contentEl = document.getElementById('sbCardContent');
      var cardWrap = document.getElementById('sbCardWrap');

      var titleEl = targetBox.querySelector('.box-title, .card-title, h2, h3, strong');
      var titleText = titleEl ? titleEl.textContent.trim().replace('🔍 Tam Ekran Odak', '').replace('🔍 Tıkla & Büyüt', '') : ('Bölüm ' + (currentIdx + 1));

      if (stepEl) stepEl.textContent = (currentIdx + 1) + ' / ' + boxes.length;
      if (nameEl) nameEl.textContent = titleText;

      var boxClasses = Array.from(targetBox.classList);
      var colorClass = boxClasses.find(function(c) { return c.startsWith('box-') || c.startsWith('card-'); }) || 'box-cyan';

      if (cardWrap) {
        cardWrap.className = 'smartboard-card-wrap ' + colorClass;
      }

      if (contentEl) {
        // Clone targetBox content and strip out the trigger button
        var clone = targetBox.cloneNode(true);
        var oldBtn = clone.querySelector('.sb-zoom-trigger-btn');
        if (oldBtn) oldBtn.remove();
        contentEl.innerHTML = clone.innerHTML;
      }

      updateZoomUI();
      overlay.classList.add('active');
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
    }

    function closeOverlay() {
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
      document.body.style.overflow = '';
    }

    boxes.forEach(function(box, idx) {
      box.classList.add('sb-focusable');
      box.style.cursor = 'pointer';
      box.setAttribute('title', 'Akıllı Tahtada Bölümü Büyütmek İçin Tıklayın');

      // Add prominent interactive button to box header
      if (!box.querySelector('.sb-zoom-trigger-btn')) {
        var triggerBtn = document.createElement('button');
        triggerBtn.type = 'button';
        triggerBtn.className = 'sb-zoom-trigger-btn';
        triggerBtn.innerHTML = '🔍 Tam Ekran Odak';
        triggerBtn.title = 'Akıllı Tahtada Bölümü Büyütmek İçin Tıklayın';
        triggerBtn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          openSection(idx);
        };
        box.appendChild(triggerBtn);
      }

      // Clicking anywhere on the box (background, text, heading) also opens it
      box.onclick = function(e) {
        if (e.target.closest('button, a, input, select, textarea') && !e.target.classList.contains('sb-zoom-trigger-btn')) {
          return;
        }
        openSection(idx);
      };
    });

    var closeBtn = document.getElementById('sbCloseBtn');
    if (closeBtn) closeBtn.onclick = closeOverlay;

    var prevBtn = document.getElementById('sbPrevBtn');
    if (prevBtn) prevBtn.onclick = function() {
      if (currentIdx > 0) openSection(currentIdx - 1);
    };

    var nextBtn = document.getElementById('sbNextBtn');
    if (nextBtn) nextBtn.onclick = function() {
      if (currentIdx < boxes.length - 1) openSection(currentIdx + 1);
    };

    var fontIncBtn = document.getElementById('sbFontInc');
    if (fontIncBtn) fontIncBtn.onclick = function() {
      if (currentScale < 2.5) {
        currentScale = +(currentScale + 0.15).toFixed(2);
        updateZoomUI();
      }
    };

    var fontDecBtn = document.getElementById('sbFontDec');
    if (fontDecBtn) fontDecBtn.onclick = function() {
      if (currentScale > 0.85) {
        currentScale = +(currentScale - 0.15).toFixed(2);
        updateZoomUI();
      }
    };

    var fontResetBtn = document.getElementById('sbFontReset');
    if (fontResetBtn) fontResetBtn.onclick = function() {
      currentScale = 1.0;
      updateZoomUI();
    };

    var fsBtn = document.getElementById('sbFullscreenBtn');
    if (fsBtn) fsBtn.onclick = function() {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    };

    document.addEventListener('keydown', function(e) {
      if (!overlay || !overlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeOverlay();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (currentIdx < boxes.length - 1) openSection(currentIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIdx > 0) openSection(currentIdx - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        if (currentScale < 2.5) {
          currentScale = +(currentScale + 0.15).toFixed(2);
          updateZoomUI();
        }
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        if (currentScale > 0.85) {
          currentScale = +(currentScale - 0.15).toFixed(2);
          updateZoomUI();
        }
      } else if (e.key === '0') {
        currentScale = 1.0;
        updateZoomUI();
      }
    });
  }

  // Run on multiple events to guarantee attachment inside iframes and dynamic content
  initSmartboardFocus();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmartboardFocus);
  }
  window.addEventListener('load', initSmartboardFocus);
  setTimeout(initSmartboardFocus, 200);
  setTimeout(initSmartboardFocus, 800);
})();
`;

export const FASIKUL_SHEET_CSS = NOTEBOOK_SHEET_CSS;

export const HEADER_BALANCE_INJECTION = `<style id="notebookSheetLiveStyles">
${NOTEBOOK_SHEET_CSS}
</style>
<script id="smartboardFocusScript">
${NOTEBOOK_SHEET_JS}
</script>`;

/**
 * Prepares summary HTML for rendering inside an iframe with full styling and interactivity.
 */
export function prepareNotebookSheetForIframe(htmlContent: string, zoomLevel: number = 1.0): string {
  if (!htmlContent) return '';

  const injection = `
<style id="smartboardLiveStyles">
body {
  zoom: ${zoomLevel};
  transform-origin: top center;
  padding: 24px;
}
${NOTEBOOK_SHEET_CSS}
</style>
<script id="smartboardFocusScript">
${NOTEBOOK_SHEET_JS}
</script>
`;

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${injection}\n</body>`);
  } else if (htmlContent.includes('</html>')) {
    return htmlContent.replace('</html>', `${injection}\n</html>`);
  } else {
    return `${htmlContent}\n${injection}`;
  }
}

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
        /<(div|span|p)([^>]*)class=["']badge-grade["']([^>]*)>([\s\S]*?)<\/\1>/gi,
        (match, tag, before, after, content) => {
            const gradeNum = metadata.grade || (content.match(/\d+/) ? content.match(/\d+/)[0] : '5');
            return `<div${before}class="badge-grade"${after}>★ ${gradeNum}. Sınıf Din Kültürü</div>`;
        }
    );

    // Also remove any accidental <br> tags inside title-banner/unit-banner so it never breaks awkwardly
    cleaned = cleaned.replace(
        /(<(?:div|h1|h2)[^>]*class=["'][^"']*(?:title-banner|unit-banner)[^"']*["'][^>]*>)([\s\S]*?)(<\/(?:div|h1|h2)>)/gi,
        (match, open, inner, close) => {
            return `${open}${inner.replace(/<br\s*[\/]?>/gi, ' ').trim()}${close}`;
        }
    );

    const hasHead = cleaned.toLowerCase().includes('<head') && cleaned.toLowerCase().includes('</head>');
    const hasFonts = cleaned.includes('fonts.googleapis.com') && cleaned.includes('Caveat');

    // Always inject the authoritative balanced CSS into existing style tag and smartboard script
    if (hasHead && hasFonts) {
        if (cleaned.includes('<style>') && cleaned.includes('</style>')) {
            let res = cleaned.replace(/<style>[\s\S]*?<\/style>/i, `<style>\n${NOTEBOOK_SHEET_CSS}\n  </style>`);
            if (!res.includes('id="smartboardFocusScript"')) {
                if (res.includes('</body>')) {
                    res = res.replace('</body>', `<script id="smartboardFocusScript">\n${NOTEBOOK_SHEET_JS}\n</script>\n</body>`);
                } else {
                    res += `\n<script id="smartboardFocusScript">\n${NOTEBOOK_SHEET_JS}\n</script>`;
                }
            }
            return res;
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
<script id="smartboardFocusScript">
${NOTEBOOK_SHEET_JS}
</script>
</body>
</html>`;
}
