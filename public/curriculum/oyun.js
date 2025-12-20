// oyun.js - YEREL VERİ TABANI VERSİYONU
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId'); 
    const urlTitle = params.get('topicName'); 

    const titleEl = document.getElementById('topic-title');
    const gameListEl = document.getElementById('game-list');
    const loading = document.getElementById('loading');

    // Başlığı ayarla
    if(titleEl && urlTitle) titleEl.textContent = decodeURIComponent(urlTitle);

    const hideLoading = () => { if(loading) loading.style.display = 'none'; };

    // Veri Kontrolü
    if (!topicId || typeof window.TUM_VERILER === 'undefined') {
        gameListEl.innerHTML = '<p class="text-red-400 col-span-3 text-center">Konu bulunamadı veya veri yüklenemedi.</p>';
        hideLoading();
        return;
    }

    loadGamesForTopic(topicId);

    function loadGamesForTopic(id) {
        try {
            // Veri Tabanından İlgili Verileri Çekelim
            const db = window.TUM_VERILER;
            
            let topicQuestions = [];
            let topicActivities = [];

            // 1. Soruları Bul (questions dizisi varsa)
            if (db.questions) {
                topicQuestions = db.questions.filter(q => q.topicId === id);
            }

            // 2. Aktiviteleri Bul (Ders ağacının içinde 'steps' veya 'activities' altında olabilir)
            if (db.courses) {
                db.courses.forEach(course => {
                    if (course.units) {
                        course.units.forEach(unit => {
                            if (unit.topics) {
                                const foundTopic = unit.topics.find(t => t.id === id);
                                if (foundTopic && foundTopic.steps) {
                                    // Sadece oyun tipi olan adımları al
                                    const games = foundTopic.steps.filter(step => 
                                        ['anagramGame', 'matching', 'quiz', 'ordering', 'wordHunt'].includes(step.type) ||
                                        (step.activityType && step.activityType !== 'text')
                                    );
                                    topicActivities = [...topicActivities, ...games];
                                }
                            }
                        });
                    }
                });
            }

            // 3. HTML Oluştur
            let gamesHtml = '';

            // a) Test/Quiz varsa kart oluştur
            if (topicQuestions.length > 0) {
                gamesHtml += createGameCard({
                    name: 'Konu Testi',
                    desc: `${topicQuestions.length} Soruluk Test`,
                    icon: '📝',
                    color: 'from-blue-500 to-cyan-500',
                    onclick: `alert('Test Başlatılıyor...\\n(Bu özellik için test motoru kodları eklenmelidir)')`
                });
            }

            // b) Diğer oyunları ekle
            topicActivities.forEach((act, index) => {
                let name = act.title || 'Etkinlik';
                let icon = '🎮';
                let color = 'from-purple-500 to-pink-500';
                let desc = 'İnteraktif Alıştırma';

                // Türe göre ikon ve renk değiştir
                if(act.type === 'anagramGame') { name = 'Kelime Bulmaca'; icon = 'abc'; desc = 'Harfleri düzenle'; }
                if(act.type === 'matching') { name = 'Eşleştirme'; icon = '⇄'; color = 'from-green-500 to-emerald-500'; desc = 'Kavramları eşleştir'; }
                if(act.type === 'ordering') { name = 'Sıralama'; icon = 'kB'; color = 'from-orange-500 to-red-500'; desc = 'Doğru sıraya diz'; }

                gamesHtml += createGameCard({
                    name: name,
                    desc: desc,
                    icon: icon,
                    color: color,
                    onclick: `alert('${name} yükleniyor...\\n(Oyun motoru entegrasyonu gereklidir)')`
                });
            });

            // c) Eğer hiç oyun yoksa
            if (gamesHtml === '') {
                gameListEl.innerHTML = `
                    <div class="col-span-1 sm:col-span-3 text-center py-12 bg-slate-800/30 rounded-xl border border-white/5">
                        <div class="text-4xl mb-4">Empty</div>
                        <p class="text-slate-400">Bu konu için henüz oyun eklenmemiş.</p>
                        <button onclick="history.back()" class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm transition">Geri Dön</button>
                    </div>`;
            } else {
                gameListEl.innerHTML = gamesHtml;
            }

            hideLoading();

        } catch (error) {
            console.error(error);
            gameListEl.innerHTML = `<p class="text-red-500 col-span-3 text-center">Hata: ${error.message}</p>`;
            hideLoading();
        }
    }

    function createGameCard(game) {
        return `
            <div onclick="${game.onclick}" 
                 class="group cursor-pointer relative overflow-hidden bg-slate-800 rounded-2xl p-6 border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10">
                <div class="absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition duration-500"></div>
                <div class="relative z-10 flex flex-col items-center text-center gap-4">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl shadow-lg text-white">
                        ${game.icon}
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white mb-1 group-hover:text-cyan-400 transition">${game.name}</h3>
                        <p class="text-sm text-slate-400">${game.desc}</p>
                    </div>
                </div>
            </div>
        `;
    }
});