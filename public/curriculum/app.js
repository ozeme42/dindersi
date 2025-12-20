// app.js - Güncellenmiş Versiyon
document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');

    // Veriyi yükleme fonksiyonu (Artık fetch yok, direkt değişkenden alıyor)
    const initApp = () => {
        if (typeof TUM_VERILER === 'undefined') {
            showError('Veri dosyası (database.js) yüklenemedi!');
            return;
        }

        try {
            // Veriyi uygulamanın beklediği formata çeviriyoruz
            const formattedData = transformData(TUM_VERILER);
            hideLoading();
            renderCourseGroups(formattedData);
        } catch (error) {
            console.error(error);
            showError('Veri işlenirken hata oluştu: ' + error.message);
        }
    };

    // data.json yapısını uygulamanın beklediği yapıya çeviren fonksiyon
    const transformData = (db) => {
        // Sınıfları (classes) gez ve onlara ait dersleri (courses) bul
        return db.classes.map(cls => {
            const classCourses = db.courses.filter(c => c.classId === cls.id);
            
            return {
                name: cls.name + ". Sınıf", // Örn: "5. Sınıf"
                courses: classCourses.map(course => ({
                    id: course.id,
                    name: course.title, // Örn: "DKAB"
                    units: course.units.map(unit => ({
                        name: unit.title,
                        topics: unit.topics.map(topic => ({
                            id: topic.id,
                            name: topic.title,
                            // Yazılacaklar ve Oyunlar butonları için linkler
                            links: {
                                notes: `yazilacaklar.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}`,
                                games: `oyun.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}`
                            }
                        }))
                    }))
                }))
            };
        });
    };

    const showLoading = () => {
        if (loading) loading.style.display = 'flex';
        if (content) content.innerHTML = '';
    };

    const hideLoading = () => {
        if (loading) loading.style.display = 'none';
    };

    const showError = (message) => {
        hideLoading();
        if (content) {
            content.innerHTML = `
                <div class="text-center p-10 bg-red-900/20 rounded-xl border border-red-500/50">
                    <h2 class="text-xl font-bold text-red-400 mb-2">Hata</h2>
                    <p class="text-slate-300 mb-4">${message}</p>
                </div>
            `;
        }
    };

    const renderCourseGroups = (courseGroups) => {
        if (!content) return;
        
        // Eğer hiç ders yoksa
        if(courseGroups.length === 0) {
            content.innerHTML = '<p class="text-center text-slate-400">Görüntülenecek içerik bulunamadı.</p>';
            return;
        }

        content.innerHTML = `
            <div class="mb-8 text-center">
                <h2 class="text-3xl font-bold text-white mb-2">📚 Dersler ve Konular</h2>
                <p class="text-slate-400">İncelemek istediğiniz dersi seçin.</p>
            </div>
            ${courseGroups.map(group => `
                <div class="mb-12">
                    <h3 class="text-2xl font-bold text-cyan-400 mb-6 border-b border-white/10 pb-2">${group.name}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${group.courses.map(course => `
                            <div class="bg-slate-800/50 rounded-xl p-6 border border-white/5 hover:border-cyan-500/30 transition hover:bg-slate-800 group">
                                <h4 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span class="text-2xl">📖</span> ${course.name}
                                </h4>
                                <div class="space-y-4">
                                    ${course.units.map(unit => `
                                        <div class="pl-4 border-l-2 border-white/10">
                                            <h5 class="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">${unit.name}</h5>
                                            <ul class="space-y-2">
                                                ${unit.topics.map(topic => `
                                                    <li class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/50 p-2 rounded hover:bg-slate-900 transition">
                                                        <span class="text-slate-200 text-sm font-medium truncate" title="${topic.name}">${topic.name}</span>
                                                        <div class="flex gap-2 shrink-0">
                                                            <a href="${topic.links.notes}" class="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded hover:bg-blue-600/40 transition">Notlar</a>
                                                            <a href="${topic.links.games}" class="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded hover:bg-green-600/40 transition">Oyunlar</a>
                                                        </div>
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;
    };

    // Başlat
    initApp();
});