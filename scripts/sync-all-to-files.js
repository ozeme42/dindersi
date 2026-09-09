const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCcMLHz5eLpV10YMXFkNSCVxYhxR6WxyBs",
  authDomain: "tamuyum.firebaseapp.com",
  projectId: "tamuyum",
  storageBucket: "tamuyum.appspot.com",
  messagingSenderId: "912689470856",
  appId: "1:912689470856:web:42898bb6fdc9c4dfa22e3d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncAll() {
  console.log('🚀 Firestore verilerini yerel dosyalara senkronize etme başlatılıyor...');
  
  const repoDir = process.cwd();
  const curriculumDir = path.join(repoDir, 'public', 'curriculum');
  const activitiesDir = path.join(curriculumDir, 'activities');
  const activityItemsDir = path.join(curriculumDir, 'activityItems');
  const questionsDir = path.join(curriculumDir, 'questions');

  if (!fs.existsSync(curriculumDir)) fs.mkdirSync(curriculumDir, { recursive: true });
  if (!fs.existsSync(activitiesDir)) fs.mkdirSync(activitiesDir, { recursive: true });
  if (!fs.existsSync(activityItemsDir)) fs.mkdirSync(activityItemsDir, { recursive: true });
  if (!fs.existsSync(questionsDir)) fs.mkdirSync(questionsDir, { recursive: true });

  // 1. SANAL ÖĞRENCİLER (role === 'guest')
  console.log('👤 Sanal öğrenciler (role === guest) çekiliyor...');
  const guestQuery = query(collection(db, 'users'), where('role', '==', 'guest'));
  const guestSnap = await getDocs(guestQuery);
  const guestStudents = guestSnap.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      displayName: data.displayName || 'Öğrenci',
      class: data.class || '',
      role: 'guest',
      avatar: data.avatar || null,
      score: data.score || 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null
    };
  });

  const guestStudentsPath = path.join(curriculumDir, 'guest-students.json');
  fs.writeFileSync(guestStudentsPath, JSON.stringify(guestStudents, null, 2), 'utf8');
  console.log(`✅ ${guestStudents.length} adet sanal öğrenci '${guestStudentsPath}' dosyasına kaydedildi.`);

  // 2. SINIFLAR (classes)
  console.log('🏫 Sınıf listesi çekiliyor...');
  try {
    const classSnap = await getDocs(collection(db, 'classes'));
    const classes = classSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (classes.length > 0) {
      const classesPath = path.join(curriculumDir, 'classes.json');
      fs.writeFileSync(classesPath, JSON.stringify(classes, null, 2), 'utf8');
      console.log(`✅ ${classes.length} adet sınıf '${classesPath}' dosyasına kaydedildi.`);
    }
  } catch (err) {
    console.warn('⚠️ Sınıflar çekilirken hata:', err.message);
  }

  // 3. ETKİNLİKLER (activityItems)
  console.log('📦 Etkinlik verileri çekiliyor...');
  const actSnap = await getDocs(collection(db, 'activityItems'));
  console.log(`📦 Toplam ${actSnap.size} adet etkinlik verisi bulundu.`);

  const actByTopic = {};
  actSnap.forEach(doc => {
    const data = doc.data();
    const topicId = data.topicId;
    if (!topicId) return;
    if (!actByTopic[topicId]) actByTopic[topicId] = [];
    actByTopic[topicId].push({ id: doc.id, ...data });
  });

  let actCount = 0;
  for (const [topicId, items] of Object.entries(actByTopic)) {
    const jsonStr = JSON.stringify(items, null, 2);
    fs.writeFileSync(path.join(activitiesDir, `${topicId}.json`), jsonStr, 'utf8');
    fs.writeFileSync(path.join(activityItemsDir, `${topicId}.json`), jsonStr, 'utf8');
    actCount++;
  }
  console.log(`✅ ${actCount} farklı konu için etkinlik dosyaları güncellendi.`);

  // 4. SORULAR (questions)
  console.log('❓ Soru verileri çekiliyor...');
  const qSnap = await getDocs(collection(db, 'questions'));
  console.log(`❓ Toplam ${qSnap.size} adet soru verisi bulundu.`);

  const qByTopic = {};
  qSnap.forEach(doc => {
    const data = doc.data();
    const topicId = data.topicId;
    if (!topicId) return;
    if (!qByTopic[topicId]) qByTopic[topicId] = [];
    qByTopic[topicId].push({ id: doc.id, ...data });
  });

  let qCount = 0;
  for (const [topicId, questions] of Object.entries(qByTopic)) {
    const jsonStr = JSON.stringify(questions, null, 2);
    fs.writeFileSync(path.join(questionsDir, `${topicId}.json`), jsonStr, 'utf8');
    qCount++;
  }
  console.log(`✅ ${qCount} farklı konu için soru dosyaları güncellendi.`);

  // version.json güncelle
  const versionPath = path.join(curriculumDir, 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify({
    version: Date.now(),
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8');
  console.log(`✅ version.json güncellendi.`);

  console.log('\n🎉 Tüm Akıllı Tahta verileri başarıyla yerel dosyalara aktarıldı!');
  process.exit(0);
}

syncAll().catch(err => {
  console.error('❌ Senkronizasyon hatası:', err);
  process.exit(1);
});
