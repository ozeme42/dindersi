const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
  console.log('🔄 Firestore veritabanından etkinlik verileri çekiliyor...');
  
  const activitiesDir = path.join(process.cwd(), 'public', 'curriculum', 'activities');
  const activityItemsDir = path.join(process.cwd(), 'public', 'curriculum', 'activityItems');
  const questionsDir = path.join(process.cwd(), 'public', 'curriculum', 'questions');

  if (!fs.existsSync(activitiesDir)) fs.mkdirSync(activitiesDir, { recursive: true });
  if (!fs.existsSync(activityItemsDir)) fs.mkdirSync(activityItemsDir, { recursive: true });
  if (!fs.existsSync(questionsDir)) fs.mkdirSync(questionsDir, { recursive: true });

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

  const qSnap = await getDocs(collection(db, 'questions'));
  console.log(`📦 Toplam ${qSnap.size} adet soru verisi bulundu.`);

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

  console.log('\n🎉 Senkronizasyon başarıyla tamamlandı!');
  process.exit(0);
}

syncAll().catch(err => {
  console.error('❌ Senkronizasyon hatası:', err);
  process.exit(1);
});
