document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');
    let manifestData = null;

    // Yükleniyor ekranını göster/gizle
    const showLoading = () => { if (loading) loading.style.display = 'flex'; };
    const hideLoading = () => { if (loading) loading.style.display = 'none'; };

    // Hata gösterme fonksiyonu
    const showError = (message) => {
        hideLoading();
        if (content) {
            content.innerHTML = `
                <div class="text-center p-10 bg-red-900/20 rounded-xl border border-red-500/50">
                    <h2 class="text-xl font-bold text-red-400 mb-2">Bir Hata Oluştu</h2>
                    <p class="text-slate-300 mb-4">${message}</p>
                    <button onclick="window.location.reload()" class="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition">Sayfayı Yenile</button>
                </div>
            `;
        }
    };

    // Ana Sayfa: Dersleri Listeleme
    const renderCourseGroups = (courseGroups) => {
        content.innerHTML = `
            <div class="mb-8 text-center md:text-left">
                <h2 class="text-3xl font-bold text-white mb-2">📚 Dersler ve Konular</h2>
                <p class="text-slate-400">İçeriklerini görmek istediğiniz dersi seçin.</p>
            </div>
            ${courseGroups.map(group => `
                <div class="mb-10">
                    <h3 class="text-xl font-semibold text-cyan-400 mb-4 border-l-4 border-cyan-500 pl-3">${group.title}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${group.courses.map(course => `
                            <div class="course-card cursor-pointer bg-slate-800 hover:bg-slate-700 p-6 rounded-xl border border-white/5 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/10" 
                                 data-course-file="${course.file}">
                                <h4 class="text-lg font-bold text-white mb-1">${course.title}</h4>
                                <p class="text-sm text-slate-400">${course.className}. Sınıf</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        // Kartlara tıklama olayı ekle
        document.querySelectorAll('.course-card').forEach(card => {
            card.addEventListener('click', () => {
                const courseFile = card.dataset.courseFile;
                if (courseFile) renderCourseDetail(courseFile);
            });
        });
    };
    
    // Detay Sayfası: Üniteleri ve Konuları Listeleme
    const renderCourseDetail = (courseFile) => {
        showLoading();
        fetch(courseFile) 
            .then(response => {
                if (!response.ok) throw new Error(`Ders dosyası yüklenemedi: ${courseFile}`);
                return response.json();
            })
            .then(courseData => {
                hideLoading();
                content.innerHTML = `
                    <div class="mb-6">
                        <button id="back-to-main" class="text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-2 transition">
                            <span>←</span> Tüm Dersler
                        </button>
                        <h1 class="text-3xl font-bold text-white">${courseData.title} <span class="text-lg text-slate-500">(${courseData.className}. Sınıf)</span></h1>
                    </div>
                    <div class="space-y-6">
                        ${courseData.units.map(unit => `
                            <div class="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                                <h3 class="text-xl font-bold text-purple-400 mb-4">${unit.title}</h3>
                                <div class="space-y-3">
                                    ${unit.topics.map(topic => `
                                        <div class="flex flex-col sm:flex-row items-center justify-between bg-slate-900 p-4 rounded-lg border border-white/5 hover:border-white/20 transition gap-4 sm:gap-0">
                                            <span class="font-medium text-slate-200">${topic.title}</span>
                                            <div class="flex gap-2">
                                                <button onclick="window.location.href='yazilacaklar.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}'" 
                                                        class="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded hover:bg-blue-600/40 transition flex items-center gap-1">
                                                    📝 Notlar
                                                </button>

                                                <button onclick="window.location.href='oyun.html?topicId=${topic.id}&title=${encodeURIComponent(topic.title)}'" 
                                                        class="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded hover:bg-green-600/40 transition flex items-center gap-1">
                                                    🎮 Oyunlar
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;

                // Geri dön butonunu aktifleştir
                document.getElementById('back-to-main').addEventListener('click', () => {
                    renderCourseGroups(manifestData.courseGroups);
                });
            })
            .catch(error => {
                console.error('Ders detayı hatası:', error);
                showError('Ders içeriği yüklenirken bir sorun oluştu.<br>Hata: ' + error.message);
            });
    };

    // Başlangıç: Manifest dosyasını yükle
    showLoading();
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) throw new Error('manifest.json dosyası bulunamadı.');
            return response.json();
        })
        .then(data => {
            hideLoading();
            manifestData = data; // Veriyi hafızada tut
            renderCourseGroups(data.courseGroups);
        })
        .catch(error => {
            console.error('Başlangıç hatası:', error);
            showError('Site verileri yüklenemedi. Lütfen dosyaların doğru klasörde olduğundan emin olun.<br>Hata: ' + error.message);
        });
});