
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('course-groups-container');
    const classNav = document.getElementById('class-navigation');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (!container || !classNav || !loadingIndicator) return;

    const groupColors = [
        'from-purple-500 to-indigo-600', 
        'from-pink-500 to-rose-600', 
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600', 
        'from-cyan-400 to-blue-600'
    ];

    async function fetchAndRender() {
        try {
            const response = await fetch('manifest.json');
            if (!response.ok) throw new Error(`Manifest dosyası yüklenemedi: ${response.statusText}`);
            const manifest = await response.json();

            // Sınıf navigasyonunu oluştur
            manifest.courseGroups.forEach(group => {
                const navButton = document.createElement('a');
                navButton.href = `#group-${group.title.replace(/\s+/g, '-')}`;
                navButton.className = 'px-3 py-1 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors';
                navButton.textContent = group.title.includes('Din') ? 'DKAB' : group.title;
                classNav.appendChild(navButton);
            });

            // Ders gruplarını oluştur
            manifest.courseGroups.forEach((group, index) => {
                const groupEl = document.createElement('div');
                groupEl.id = `group-${group.title.replace(/\s+/g, '-')}`;
                groupEl.className = 'space-y-6';

                const titleEl = document.createElement('h2');
                titleEl.className = `text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${groupColors[index % groupColors.length]}`;
                titleEl.textContent = group.title;
                groupEl.appendChild(titleEl);

                const coursesContainer = document.createElement('div');
                coursesContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

                group.courses.forEach(course => {
                    coursesContainer.innerHTML += createCourseCard(course);
                });
                
                groupEl.appendChild(coursesContainer);
                container.appendChild(groupEl);
            });

        } catch (error) {
            console.error('Hata:', error);
            container.innerHTML = `<div class="bg-red-900/50 border border-red-500 text-red-200 p-8 rounded-2xl text-center">
                <h2 class="text-2xl font-bold mb-2">İçerik Yüklenemedi</h2>
                <p>Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.</p>
            </div>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    function createCourseCard(course) {
        return `
            <div class="bg-slate-900/50 border border-white/10 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                <div class="p-6 border-b border-white/5">
                    <h3 class="text-xl font-bold text-white">${course.title}</h3>
                    <p class="text-sm text-slate-400">${course.className || ''}</p>
                </div>
                <div class="p-4 space-y-2 flex-grow overflow-y-auto max-h-96 custom-scrollbar">
                    ${course.units.map(unit => `
                        <details class="group">
                            <summary class="p-3 rounded-lg hover:bg-white/5 cursor-pointer list-none flex justify-between items-center font-semibold text-slate-300">
                                ${unit.title}
                                <svg class="w-4 h-4 transition-transform duration-300 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                            </summary>
                            <div class="pl-6 pt-2 space-y-2">
                                ${unit.topics.map(topic => `
                                    <div class="flex justify-between items-center p-2 rounded-md hover:bg-slate-800/50">
                                        <span class="text-slate-300 text-sm">${topic.title}</span>
                                        <div class="flex gap-2">
                                            <a href="yazilacaklar.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="px-2 py-1 text-[10px] font-bold text-cyan-200 bg-cyan-900/50 border border-cyan-700 rounded hover:bg-cyan-600 hover:text-white transition-colors">Notlar</a>
                                            <a href="oyun.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="px-2 py-1 text-[10px] font-bold text-amber-200 bg-amber-900/50 border border-amber-700 rounded hover:bg-amber-600 hover:text-white transition-colors">Oyunlar</a>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    `).join('')}
                </div>
            </div>
        `;
    }

    fetchAndRender();
});
