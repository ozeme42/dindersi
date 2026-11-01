const fs = require('fs');
const path = require('path');

// We will read NOTEBOOK_SHEET_CSS and NOTEBOOK_SHEET_JS from src/lib/notebook-sheet-template.ts
const templateFile = fs.readFileSync(path.join(__dirname, '../src/lib/notebook-sheet-template.ts'), 'utf8');

// Extract NOTEBOOK_SHEET_CSS
const cssMatch = templateFile.match(/export const NOTEBOOK_SHEET_CSS = `([\s\S]*?)`;/);
if (!cssMatch) {
  console.error('Could not extract NOTEBOOK_SHEET_CSS');
  process.exit(1);
}
const NOTEBOOK_SHEET_CSS = cssMatch[1];

// Extract NOTEBOOK_SHEET_JS
const jsMatch = templateFile.match(/export const NOTEBOOK_SHEET_JS = `([\s\S]*?)`;/);
if (!jsMatch) {
  console.error('Could not extract NOTEBOOK_SHEET_JS');
  process.exit(1);
}
const NOTEBOOK_SHEET_JS = jsMatch[1];

const ozetlerDir = path.join(__dirname, '../public/curriculum/ozetler');
const files = fs.readdirSync(ozetlerDir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} HTML summary files to process.`);

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(ozetlerDir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Remove old styles and replace or inject NOTEBOOK_SHEET_CSS
  if (html.includes('<style id="smartboardLiveStyles">')) {
    html = html.replace(/<style id="smartboardLiveStyles">[\s\S]*?<\/style>/i, `<style id="smartboardLiveStyles">\n${NOTEBOOK_SHEET_CSS}\n</style>`);
  } else if (html.includes('<style>') || html.includes('<style ')) {
    html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/i, `<style id="smartboardLiveStyles">\n${NOTEBOOK_SHEET_CSS}\n</style>`);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `<style id="smartboardLiveStyles">\n${NOTEBOOK_SHEET_CSS}\n</style>\n</head>`);
  }

  // 2. Remove old scripts with initSmartboardFocus and inject NOTEBOOK_SHEET_JS
  if (html.includes('<script id="smartboardFocusScript">')) {
    html = html.replace(/<script id="smartboardFocusScript">[\s\S]*?<\/script>/i, `<script id="smartboardFocusScript">\n${NOTEBOOK_SHEET_JS}\n</script>`);
  } else if (html.includes('initSmartboardFocus')) {
    html = html.replace(/<script\b[^>]*>[\s\S]*?initSmartboardFocus[\s\S]*?<\/script>/i, `<script id="smartboardFocusScript">\n${NOTEBOOK_SHEET_JS}\n</script>`);
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', `<script id="smartboardFocusScript">\n${NOTEBOOK_SHEET_JS}\n</script>\n</body>`);
  }

  // 3. Remove old text trigger buttons
  html = html.replace(/<button[^>]*class=["'][^"']*sb-zoom-trigger-btn[^"']*["'][^>]*>[\s\S]*?<\/button>/gi, '');

  // 4. Ensure DinDersi Atölyesi brand bar exists in the notebook sheet
  if (!html.includes('sheet-brand-bar') && !html.includes('DinDersi Atölyesi')) {
    const brandBar = `
    <!-- 0. Marka Şeridi -->
    <div class="sheet-brand-bar">
      <div class="brand-pill"><span>🕌</span> <strong>DinDersi Atölyesi</strong></div>
      <div class="brand-motto">MEB Müfredatına Tam Uyumlu Özgün Ders Notu</div>
    </div>`;

    if (html.includes('<div class="notebook-sheet" id="summaryCard">')) {
      html = html.replace('<div class="notebook-sheet" id="summaryCard">', `<div class="notebook-sheet" id="summaryCard">\n${brandBar}`);
    } else if (html.includes('<div class="notebook-sheet">')) {
      html = html.replace('<div class="notebook-sheet">', `<div class="notebook-sheet">\n${brandBar}`);
    } else if (html.includes('<div class="fasikul-page">')) {
      html = html.replace('<div class="fasikul-page">', `<div class="fasikul-page">\n${brandBar}`);
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');

  // Also update corresponding JSON file if it exists
  const jsonPath = path.join(ozetlerDir, file.replace(/\.html$/, '.json'));
  if (fs.existsSync(jsonPath)) {
    try {
      const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      jsonContent.htmlContent = html;
      fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
    } catch (e) {}
  }

  updatedCount++;
}

console.log(`Successfully synced ${updatedCount} summaries with modern Sketchnote CSS, JS, and DinDersi Atölyesi branding!`);
