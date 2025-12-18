document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');
    let manifestData = null;

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
                    <h2 class="text-xl font-bold text-red-400 mb-2">İçerik Yüklenemedi</h2>
                    <p class="text-slate-300 mb-4">${message}</p>
                    <button onclick="window.location.reload()" class="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition">Yeniden Dene</button>
                </div>
            `;
        }
    };

    const renderCourseGroups = (courseGroups) => {
        if (!content) return;
        content.innerHTML = `
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-white mb-2">📚 Dersler ve Konular</h2>
                <p class="text-slate-400">İncelemek istediğiniz dersi seçin.</p>
            </div>
            ${courseGroups.map(group => `
                <div class="mb-10">
                    <h3 class="text-xl font-semibold text-cyan-400 mb-4 border-l-4 border-cyan-500 pl-3">${group.title}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${group.courses.map(course => `
                            <div class="course-card cursor-pointer bg-slate-800 hover:bg-slate-700 p-6 rounded-xl border border-white/5 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/10" 
                                 data-course-file="${course.file}" 
                                 data-course-id="${course.id}">
                                <h4 class="text-lg font-bold text-white mb-1">${course.title}</h4>
                                <p class="text-sm text-slate-400">${course.className || 'Genel'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        document.querySelectorAll('.course-card').forEach(card => {
            card.addEventListener('click', () => {
                const courseFile = card.dataset.courseFile;
                const courseId = card.dataset.courseId;
                if (courseFile && courseId) {
                    renderCourseDetail(courseFile, courseId);
                }
            });
        });
    };
    
    const renderCourseDetail = (courseFile, courseId) => {
        showLoading();
        // NOT: Eğer dosyalar "curriculum" klasöründeyse başa "/curriculum/" ekleyin.
        fetch(`${courseFile}`) 
            .then(response => {
                if (!response.ok) throw new Error(`Ders dosyası yüklenemedi: ${courseFile}`);
                return response.json();
            })
            .then(courseData => {
                hideLoading();
                if (!content) return;
                content.innerHTML = `
                    <div class="mb-6">
                        <button id="back-to-main" class="text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-2">
                            <span>←</span> Tüm Dersler
                        </button>
                        <h1 class="text-3xl font-bold text-white">${courseData.title}</h1>
                    </div>
                    <div class="space-y-6">
                        ${courseData.units.map(unit => `
                            <div class="bg-slate-800/50 rounded-xl p-6 border border-white/5">
                                <h3 class="text-xl font-bold text-purple-400 mb-4">Ünite: ${unit.title}</h3>
                                <div class="space-y-3">
                                    ${unit.topics.map(topic => `
                                        <div class="flex items-center justify-between bg-slate-900 p-4 rounded-lg border border-white/5 hover:border-white/20 transition">
                                            <span class="font-medium text-slate-200">${topic.title}</span>
                                            <div class="flex gap-2">
                                                <button class="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded hover:bg-blue-600/40 transition">Notlar</button>
                                                <button class="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded hover:bg-green-600/40 transition">Oyunlar</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                document.getElementById('back-to-main').addEventListener('click', () => {
                    renderCourseGroups(manifestData.courseGroups);
                });
            })
            .catch(error => {
                console.error('Ders detayı yüklenirken hata:', error);
                showError('Ders detayı bulunamadı. JSON dosyası eksik olabilir.');
            });
    };

    // Başlangıç
    showLoading();
    // NOT: Dosya adı manifest.json olarak arıyor.
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('manifest.json dosyası bulunamadı.');
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            manifestData = data;
            renderCourseGroups(data.courseGroups);
        })
        .catch(error => {
            console.error('Hata:', error);
            showError(error.message);
        });
});