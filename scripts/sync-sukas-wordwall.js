const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Encoding': 'gzip' } }, res => {
      let s = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
      s.on('error', reject);
    }).on('error', reject);
  });
}

function cleanTitle(s) {
  return (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[0-9\.\-\:\(\)\,\_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadFolder(folderId) {
  const url = `https://wordwall.net/myactivitiesajax/loadfolder?folderId=${folderId}&authorUserId=518166&myActivitiesVariation=1&firstLoad=true`;
  return await fetchUrl(url);
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'curriculum', 'wordwall');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'curriculum', 'manifest.json'), 'utf8'));
  const topics = [];
  for (const cg of manifest.classGroups) {
    for (const crs of cg.courses) {
      for (const u of crs.units) {
        for (const t of u.topics) {
          topics.push({
            grade: cg.name,
            course: crs.title,
            unit: u.title,
            topicId: t.id,
            title: t.title,
            clean: cleanTitle(t.title)
          });
        }
      }
    }
  }

  console.log(`Loaded ${topics.length} manifest topics.`);

  // Sukas Grade Folders
  const gradeFolders = [
    { grade: '5', folderId: 133703 },
    { grade: '6', folderId: 133702 },
    { grade: '7', folderId: 133701 },
    { grade: '8', folderId: 133704 }
  ];

  let totalSaved = 0;

  for (const gf of gradeFolders) {
    console.log(`\nProcessing Grade ${gf.grade} (Folder ${gf.folderId})...`);
    const gradeData = await loadFolder(gf.folderId);
    if (!gradeData || !gradeData.Folders) continue;

    for (const unitFolder of gradeData.Folders) {
      if (!unitFolder.FolderId || unitFolder.FolderId === 0) continue;
      console.log(`  Unit Folder: ${unitFolder.Name} (ID: ${unitFolder.FolderId})`);

      const unitData = await loadFolder(unitFolder.FolderId);
      if (!unitData) continue;

      // Check subfolders under this unit
      const topicFolders = unitData.Folders || [];
      for (const tf of topicFolders) {
        if (!tf.FolderId || tf.FolderId === 0) continue;
        const tfClean = cleanTitle(tf.Name);

        // Find best matching topic in manifest
        const matchedTopic = topics.find(t => {
          if (t.grade !== gf.grade) return false;
          // check overlap
          const tWords = t.clean.split(' ').filter(w => w.length > 2);
          const tfWords = tfClean.split(' ').filter(w => w.length > 2);
          let matchCount = 0;
          for (const w of tfWords) {
            if (tWords.includes(w)) matchCount++;
          }
          return matchCount >= 2 || (tWords.length === 1 && tfWords.includes(tWords[0]));
        });

        if (matchedTopic) {
          const topicContent = await loadFolder(tf.FolderId);
          if (topicContent && topicContent.Activities && topicContent.Activities.length > 0) {
            const acts = topicContent.Activities.map(a => ({
              id: a.ActivityId,
              name: a.Name,
              templateName: a.TemplateName,
              templateId: a.TemplateId,
              themeId: a.ThemeId,
              guid: a.Guid,
              thumbnail: a.Thumbnail || (`https://screens.cdn.wordwall.net/400/${a.Guid}_${a.ThemeId}`)
            }));

            const destPath = path.join(outDir, `${matchedTopic.topicId}.json`);
            let existing = [];
            if (fs.existsSync(destPath)) {
              try { existing = JSON.parse(fs.readFileSync(destPath, 'utf8')); } catch(e) {}
            }

            // merge unique by guid
            const existingGuids = new Set(existing.map(e => e.guid));
            const newActs = acts.filter(a => !existingGuids.has(a.guid));
            const merged = [...existing, ...newActs];

            fs.writeFileSync(destPath, JSON.stringify(merged, null, 2), 'utf8');
            console.log(`    -> Matched "${tf.Name}" => [${matchedTopic.grade}. Sınıf] "${matchedTopic.title}" (${merged.length} activities saved)`);
            totalSaved += newActs.length;
          }
        }
      }
    }
  }

  console.log(`\nSync complete! Total new activities added: ${totalSaved}`);
}

main().catch(console.error);
