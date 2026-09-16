/**
 * Vercel Eski Dağıtımları (Deployments) Otomatik Toplu Temizleme Scripti - SINIRSIZ
 * 
 * Kullanım:
 *   node scripts/clean-vercel-deployments.mjs <VERCEL_TOKEN> [PROJE_ADI]
 */

const token = process.argv[2];
const filterProject = process.argv[3] ? process.argv[3].toLowerCase() : null;

if (!token) {
  console.log('❌ Lütfen Vercel Token bilginizi girin!');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function run() {
  console.log('🔍 Vercel hesabı taranıyor...');

  let teamId = null;
  try {
    const teamsRes = await fetch('https://api.vercel.com/v2/teams', { headers });
    if (teamsRes.ok) {
      const teamsData = await teamsRes.json();
      const teams = teamsData.teams || [];
      if (teams.length > 0) {
        const team = teams.find(t => t.slug.includes('ozgurdere')) || teams[0];
        teamId = team.id;
        console.log(`🏢 Takım tespit edildi: ${team.name || team.slug} (${teamId})`);
      }
    }
  } catch (err) {}

  let allDeployments = [];
  let nextTimestamp = null;
  let hasMore = true;

  console.log('📦 Tüm geçmiş dağıtımlar taranıyor (Sınırsız)...');

  while (hasMore) {
    const url = new URL('https://api.vercel.com/v6/deployments');
    url.searchParams.set('limit', '100');
    if (teamId) url.searchParams.set('teamId', teamId);
    if (nextTimestamp) url.searchParams.set('until', nextTimestamp);

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Vercel API Hatası (${res.status}):`, err);
      process.exit(1);
    }

    const data = await res.json();
    const deps = data.deployments || [];
    if (deps.length === 0) {
      hasMore = false;
      break;
    }

    allDeployments.push(...deps);
    process.stdout.write(`\rTaranan dağıtım: ${allDeployments.length}...`);

    if (data.pagination && data.pagination.next) {
      nextTimestamp = data.pagination.next;
    } else {
      hasMore = false;
    }
  }

  console.log(`\n📋 Toplam bulunan dağıtım sayısı: ${allDeployments.length}`);

  if (filterProject) {
    console.log(`🎯 Hedef proje filtresi: "${filterProject}"`);
    allDeployments = allDeployments.filter(d => (d.name || '').toLowerCase() === filterProject);
    console.log(`📋 "${filterProject}" projesine ait dağıtım sayısı: ${allDeployments.length}`);
  }

  if (allDeployments.length <= 1) {
    console.log('✅ Silinecek eski dağıtım kalmadı.');
    return;
  }

  // Canlıdaki en güncel production dağıtımını koru
  const byProject = {};
  for (const dep of allDeployments) {
    const pName = dep.name || 'default';
    if (!byProject[pName]) byProject[pName] = [];
    byProject[pName].push(dep);
  }

  const protectedIds = new Set();
  for (const [pName, pDeps] of Object.entries(byProject)) {
    const activeDep = pDeps.find(d => d.target === 'production' && d.state === 'READY') || pDeps[0];
    if (activeDep) {
      protectedIds.add(activeDep.uid);
      console.log(`\n🛡️ KORUNAN CANLI DAĞITIM [${pName}]:`);
      console.log(`   ID: ${activeDep.uid}`);
      console.log(`   URL: ${activeDep.url}`);
      console.log(`   Tarih: ${new Date(activeDep.created).toLocaleString('tr-TR')}`);
    }
  }
  console.log(`--------------------------------------------------\n`);

  const toDelete = allDeployments.filter(d => !protectedIds.has(d.uid));
  console.log(`🗑️ Toplam ${toDelete.length} adet eski dağıtım silinecek...\n`);

  let deletedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toDelete.length; i++) {
    const dep = toDelete[i];
    const dateStr = new Date(dep.created).toLocaleDateString('tr-TR');
    process.stdout.write(`[${i + 1}/${toDelete.length}] Siliniyor: ${dep.uid} (${dep.name} - ${dateStr})... `);

    try {
      const deleteUrl = new URL(`https://api.vercel.com/v13/deployments/${dep.uid}`);
      if (teamId) deleteUrl.searchParams.set('teamId', teamId);

      const delRes = await fetch(deleteUrl.toString(), {
        method: 'DELETE',
        headers,
      });

      if (delRes.ok) {
        console.log('✅ Silindi');
        deletedCount++;
      } else if (delRes.status === 429) {
        console.log('⏳ Hız limiti (429), 2 saniye bekleniyor...');
        await new Promise(r => setTimeout(r, 2200));
        i--;
        continue;
      } else {
        const errText = await delRes.text();
        console.log(`⚠️ Atlandı (${delRes.status}): ${errText}`);
        failedCount++;
      }
    } catch (e) {
      console.log(`❌ Hata: ${e.message}`);
      failedCount++;
    }

    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n🎉 TEMİZLİK TAMAMLANDI!`);
  console.log(`✅ Başarıyla Silinen: ${deletedCount} adet eski dağıtım`);
  console.log(`🛡️ Aktif Canlı Siteniz güvende.`);
}

run();
