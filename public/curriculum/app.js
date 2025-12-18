document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('content'); // HTML'deki ID ile eşleşti
    const loading = document.getElementById('loading');

    // Yükleme ekranı kontrolleri
    const showLoading = () => { if(loading) loading.style.display = 'flex'; };
    const hideLoading = () => { if(loading) loading.style.display = 'none'; };

    // --- BAŞLATMA ---
    loadManifest();

    async function loadManifest() {
        try {
            // BASE_PATH karmaşasını kaldırdık. Direkt manifest.json çağırıyoruz.
            const response = await fetch('manifest.json');
            
            if (!response.ok) {
                throw new Error(`Manifest dosyası bulunamadı (${response.status})`);
            }
            
            const manifest = await response.json();
            hideLoading(); // Yükleme ekranını kaldır
            renderCourseGroups(manifest.courseGroups);

        } catch (error) {
            console.error('Veri yüklenemedi:', error);
            displayError('İçerik Yüklenemedi', 'manifest.json dosyası okunamadı. Lütfen dosyanın index.html ile aynı klasörde olduğundan emin olun.');
        }
    }

    // Hata Gösterme Fonksiyonu
    function displayError(title, message) {
        hideLoading();
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="bg-red-500/10 border border-red-500/50 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
                    <h2 class="text-2xl font-bold text-red-400 mb-2">${title}</h2>
                    <p class="text-slate-300">${message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition">Sayfayı Yenile</button>
                </div>
            `;
        }
    }

    // Grupları Ekrana Basma
    function renderCourseGroups(courseGroups) {
        if (!mainContent) return;
        mainContent.innerHTML = ''; 

        if (!courseGroups || courseGroups.length === 0) {
            mainContent.innerHTML = '<p class="text-center text-slate-500">Gösterilecek ders bulunmuyor.</p>';
            return;
        }

        courseGroups.forEach(group => {
            // Grup Başlığı ve Container
            const groupSection = document.createElement('section');
            groupSection.className = 'mb-12';
            
            groupSection.innerHTML = `
                <h2 class="text-2xl font-bold text-white mb-6 border-l-4 border-cyan-500 pl-4">${group.title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 course-list"></div>
            `;
            
            const courseList = groupSection.querySelector('.course-list');
            mainContent.appendChild(groupSection);

            // Ders Kartlarını Oluştur
            group.courses.forEach(course => {
                const courseCard = document.createElement('div');
                // Tailwind sınıfları ile modern kart tasarımı
                courseCard.className = 'bg-slate-800 rounded-xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-cyan-500/30';
                
                courseCard.innerHTML = `
                    <div class="p-6 cursor-pointer flex justify-between items-center bg-slate-800 hover:bg-slate-700 transition course-header">
                        <h3 class="text-lg font-bold text-white">${course.title}</h3>
                        ${course.className ? `<span class="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-1 rounded">${course.className}. Sınıf</span>` : ''}
                    </div>
                    <div class="unit-list bg-slate-900/50 border-t border-white/5 hidden"></div>
                `;
                
                courseList.appendChild(courseCard);

                // Tıklama Olayı (Accordion Mantığı)
                const header = courseCard.querySelector('.course-header');
                const unitList = courseCard.querySelector('.unit-list');

                header.addEventListener('click', async () => {
                    // 1. Zaten açıksa kapat
                    if (!unitList.classList.contains('hidden')) {
                        unitList.classList.add('hidden');
                        return;
                    }

                    // 2. Kapalıysa aç ve veri yoksa yükle
                    unitList.classList.remove('hidden');

                    // Eğer içi boşsa veriyi çek
                    if (unitList.innerHTML === '') {
                        unitList.innerHTML = '<div class="p-4 text-center text-cyan-400"><svg class="animate-spin h-5 w-5 inline mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Üniteler Yükleniyor...</div>';
                        
                        try {
                            // Direkt dosya adını kullanıyoruz (örn: 12345.json)
                            const response = await fetch(course.file);
                            if(!response.ok) throw new Error('Dosya bulunamadı');
                            
                            const courseDetails = await response.json();
                            renderUnits(unitList, courseDetails, course.id);
                        } catch (e) {
                            console.error(e);
                            unitList.innerHTML = `<div class="p-4 text-red-400 text-sm text-center">Veri yüklenemedi.<br><span class="text-xs text-slate-500">Dosya: ${course.file}</span></div>`;
                        }
                    }
                });
            });
        });
    }

    // Üniteleri ve Linkleri Oluşturma
    function renderUnits(container, courseData, courseId) {
        container.innerHTML = '';
        
        if (!courseData.units || courseData.units.length === 0) {
            container.innerHTML = '<p class="p-4 text-slate-500 text-sm text-center">Bu derse henüz ünite eklenmemiş.</p>';
            return;
        }

        courseData.units.forEach((unit, index) => {
            const unitElement = document.createElement('div');
            unitElement.className = 'border-b border-white/5 last:border-0';
            
            let unitHTML = `
                <div class="p-4 bg-slate-800/50">
                    <h4 class="text-purple-400 font-bold text-sm mb-2 flex items-center gap-2">
                        <span class="bg-purple-500/20 w-5 h-5 rounded flex items-center justify-center text-xs">${index + 1}</span>
                        ${unit.title}
                    </h4>
                    <div class="space-y-2 mt-2">
            `;

            if (unit.topics && unit.topics.length > 0) {
                unit.topics.forEach(topic => {
                    // Linkleri oluştur (oyun.html ve yazilacaklar.html)
                    const oyunLink = `oyun.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}`;
                    
                    unitHTML += `
                        <div class="flex items-center justify-between bg-slate-900 p-2 rounded border border-white/5 hover:border-white/20 transition">
                            <span class="text-slate-300 text-sm pl-2">${topic.title}</span>
                            <div class="flex gap-2">
                                <a href="#" class="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition">Not</a>
                                <a href="${oyunLink}" class="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded hover:bg-green-600 hover:text-white transition flex items-center gap-1">
                                    <span>🎮</span> Oyun
                                </a>
                            </div>
                        </div>
                    `;
                });
            } else {
                unitHTML += '<p class="text-xs text-slate-600 italic">Konu bulunmuyor.</p>';
            }

            unitHTML += '</div></div>';
            unitElement.innerHTML = unitHTML;
            container.appendChild(unitElement);
        });
    }
});