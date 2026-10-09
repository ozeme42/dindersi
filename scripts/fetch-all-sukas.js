const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Encoding': 'gzip' } }, res => {
      let s = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
      s.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
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

function mapActivity(a) {
  return {
    id: a.ActivityId,
    name: a.Name,
    templateName: a.TemplateName || 'Quiz',
    templateId: a.TemplateId || 0,
    themeId: a.ThemeId || 46,
    guid: a.Guid,
    thumbnail: a.Thumbnail || (`https://screens.cdn.wordwall.net/400/${a.Guid}_${a.ThemeId || 46}`)
  };
}

async function fetchFolderRecursive(folderId, collectedActivities = [], seenFolderIds = new Set()) {
  if (!folderId || folderId === 0 || seenFolderIds.has(folderId)) return collectedActivities;
  seenFolderIds.add(folderId);

  const data = await loadFolder(folderId);
  if (!data) return collectedActivities;

  if (Array.isArray(data.Activities)) {
    for (const a of data.Activities) {
      if (a.Guid) {
        collectedActivities.push(mapActivity(a));
      }
    }
  }

  if (Array.isArray(data.Folders)) {
    for (const f of data.Folders) {
      if (f.FolderId && f.FolderId !== 0) {
        await fetchFolderRecursive(f.FolderId, collectedActivities, seenFolderIds);
      }
    }
  }

  return collectedActivities;
}

async function run() {
  const outDir = path.join(__dirname, '..', 'public', 'curriculum', 'wordwall');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'curriculum', 'manifest.json'), 'utf8'));
  const allManifestTopics = [];
  for (const cg of manifest.classGroups) {
    const gradeNum = cg.name.replace(/[^0-9]/g, '');
    for (const crs of cg.courses) {
      for (let uIdx = 0; uIdx < crs.units.length; uIdx++) {
        const u = crs.units[uIdx];
        for (const t of u.topics) {
          allManifestTopics.push({
            grade: gradeNum,
            unitOrder: uIdx + 1,
            unitTitle: u.title,
            topicId: t.id,
            title: t.title,
            clean: cleanTitle(t.title)
          });
        }
      }
    }
  }

  const gradeFolders = [
    { grade: '5', folderId: 133703 },
    { grade: '6', folderId: 133702 },
    { grade: '7', folderId: 133701 },
    { grade: '8', folderId: 133704 }
  ];

  const allSukasActivities = [];
  const gradeActivityMap = { '5': [], '6': [], '7': [], '8': [] };

  for (const gf of gradeFolders) {
    console.log(`Fetching Grade ${gf.grade}...`);
    const gradeRoot = await loadFolder(gf.folderId);
    if (!gradeRoot) continue;

    const unitFolders = (gradeRoot.Folders || []).filter(f => f.FolderId && f.FolderId !== 0);

    for (const uf of unitFolders) {
      const uName = uf.Name || '';
      console.log(`  Unit: ${uName} (ID: ${uf.FolderId})`);
      const unitActs = await fetchFolderRecursive(uf.FolderId, []);

      // Deduplicate unit activities
      const seenGuid = new Set();
      const uniqueUnitActs = [];
      for (const a of unitActs) {
        if (!seenGuid.has(a.guid)) {
          seenGuid.add(a.guid);
          uniqueUnitActs.push(a);
        }
      }

      gradeActivityMap[gf.grade].push(...uniqueUnitActs);
      allSukasActivities.push(...uniqueUnitActs);

      // Now match to topics within this unit
      // Extract unit number from folder name like '5-1.ÜNİTE' -> 1
      const unitNumMatch = uName.match(/(\d+)\s*\.\s*[üÜ]N[İI]TE/i);
      const unitNum = unitNumMatch ? parseInt(unitNumMatch[1]) : 0;

      const candidateTopics = allManifestTopics.filter(t => t.grade === gf.grade && (unitNum === 0 || t.unitOrder === unitNum));

      for (const a of uniqueUnitActs) {
        const cleanActName = cleanTitle(a.name);
        const bestTopic = candidateTopics.find(t => {
          const tWords = t.clean.split(' ').filter(w => w.length > 2);
          const aWords = cleanActName.split(' ').filter(w => w.length > 2);
          let matchCount = 0;
          for (const w of aWords) {
            if (tWords.includes(w)) matchCount++;
          }
          return matchCount >= 2 || (tWords.length === 1 && aWords.includes(tWords[0]));
        });

        if (bestTopic) {
          const topicFile = path.join(outDir, `${bestTopic.topicId}.json`);
          let currentList = [];
          if (fs.existsSync(topicFile)) {
            try { currentList = JSON.parse(fs.readFileSync(topicFile, 'utf8')); } catch(e) {}
          }
          if (!currentList.some(x => x.guid === a.guid)) {
            currentList.push(a);
            fs.writeFileSync(topicFile, JSON.stringify(currentList, null, 2), 'utf8');
          }
        }
      }
    }
  }

  // Save grade fallbacks
  for (const [grade, acts] of Object.entries(gradeActivityMap)) {
    const seen = new Set();
    const unique = acts.filter(a => {
      if (seen.has(a.guid)) return false;
      seen.add(a.guid);
      return true;
    });

    fs.writeFileSync(path.join(outDir, `class-${grade}.json`), JSON.stringify(unique, null, 2), 'utf8');
    fs.writeFileSync(path.join(outDir, `grade-${grade}.json`), JSON.stringify(unique, null, 2), 'utf8');
    console.log(`Saved class-${grade}.json with ${unique.length} activities.`);
  }

  // Save Sukas master fallback
  const masterSeen = new Set();
  const masterList = allSukasActivities.filter(a => {
    if (masterSeen.has(a.guid)) return false;
    masterSeen.add(a.guid);
    return true;
  });

  fs.writeFileSync(path.join(outDir, 'sukas-default.json'), JSON.stringify(masterList, null, 2), 'utf8');
  console.log(`Saved sukas-default.json with ${masterList.length} total activities!`);
}

run().catch(console.error);
