
document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');
    const errorContainer = document.getElementById('error');

    const showError = (message) => {
        if (loading) loading.style.display = 'none';
        if (errorContainer) {
            errorContainer.querySelector('p').textContent = message;
            errorContainer.style.display = 'flex';
        }
        if (content) content.style.display = 'none';
    };

    const loadData = async () => {
        try {
            // Using a relative path, which is the most robust method here.
            const response = await fetch('manifest.json');
            if (!response.ok) {
                throw new Error(`Manifest dosyası yüklenemedi: ${response.statusText}`);
            }
            const data = await response.json();
            renderContent(data.courseGroups);
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        } catch (error) {
            console.error('Veri yüklenirken hata oluştu:', error);
            showError('Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.');
        }
    };

    const renderContent = (courseGroups) => {
        if (!content || !courseGroups) return;
        
        const groupColors = [
            'from-purple-500 to-indigo-600', 
            'from-pink-500 to-rose-600', 
            'from-emerald-400 to-teal-600',
            'from-amber-400 to-orange-600', 
            'from-cyan-400 to-blue-600'
        ];

        const classColorMap = {
            '5': 'text-cyan-400', '6': 'text-emerald-400',
            '7': 'text-amber-400', '8': 'text-rose-400',
            'Lise': 'text-indigo-400', 'Genel': 'text-slate-400',
        };

        const formatGroupName = (name) => !isNaN(parseInt(name)) ? `${name}. Sınıf` : name;

        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                ${courseGroups.map((group, groupIndex) => `
                    <div class="group">
                        <div class="glass-card transition-transform duration-300 hover:-translate-y-1">
                            <div class="accordion w-full border-none">
                                <div class="accordion-item border-none">
                                    <div class="accordion-trigger px-6 py-5 text-xl sm:text-2xl font-black text-white bg-gradient-to-r ${groupColors[groupIndex % groupColors.length]}">
                                        <div class="flex items-center gap-3">
                                            <i data-lucide="star" class="h-6 w-6 text-yellow-300 fill-yellow-300"></i>
                                            ${formatGroupName(group.title)}
                                        </div>
                                    </div>
                                    <div class="accordion-content p-0 bg-slate-900/50">
                                        <div class="p-4 space-y-3">
                                            <!-- Course content will be loaded here -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners for accordions
        content.querySelectorAll('.accordion-trigger').forEach(trigger => {
            trigger.addEventListener('click', async (e) => {
                const item = e.currentTarget.closest('.accordion-item');
                const contentDiv = item.querySelector('.accordion-content');
                const courseContainer = contentDiv.querySelector('.p-4');
                const isOpen = item.classList.toggle('open');
                
                if (isOpen && courseContainer.children.length === 0) { // Load content only once
                    courseContainer.innerHTML = '<div class="loader">Yükleniyor...</div>';
                    const groupTitle = item.querySelector('.accordion-trigger').textContent.trim();
                    const groupData = courseGroups.find(g => formatGroupName(g.title) === groupTitle);
                    
                    if (groupData) {
                        const courseHtmlPromises = groupData.courses.map(async courseInfo => {
                            try {
                                const courseRes = await fetch(courseInfo.file);
                                if (!courseRes.ok) return '';
                                const course = await courseRes.json();
                                
                                return `
                                    <div class="accordion-item border-none bg-slate-800/40 rounded-xl overflow-hidden border border-white/5 hover:bg-slate-800/60">
                                        <div class="accordion-trigger px-4 py-3 group/course">
                                            <div class="flex items-center gap-3">
                                                <div class="h-10 w-10 rounded-lg flex items-center justify-center font-black text-lg bg-slate-900 border border-white/10 shadow-lg text-slate-500">
                                                    ${course.className.charAt(0)}
                                                </div>
                                                <span class="text-lg font-bold text-slate-200 group-hover/course:text-white">${course.title}</span>
                                            </div>
                                        </div>
                                        <div class="accordion-content px-4 pb-4 pt-0">
                                            <div class="mt-2 space-y-2 pl-3 border-l-2 border-white/10 ml-5">
                                                ${course.units.map(unit => `
                                                    <div class="accordion-item border-none">
                                                        <div class="flex justify-between items-center pr-2">
                                                            <div class="accordion-trigger font-bold uppercase text-xs tracking-wider text-slate-400 hover:text-white py-2 flex-1">
                                                                <span>${unit.title}</span>
                                                            </div>
                                                        </div>
                                                        <div class="accordion-content space-y-2 pt-2">
                                                            ${unit.topics.map(topic => `
                                                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 hover:bg-slate-800/60 p-3 rounded-lg border border-white/5 group/topic">
                                                                    <div class="flex items-center gap-3">
                                                                        <div class="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                                            <i data-lucide="sparkles" class="h-3 w-3 text-indigo-400"></i>
                                                                        </div>
                                                                        <span class="font-medium text-slate-300 text-sm group-hover/topic:text-white">${topic.title}</span>
                                                                    </div>
                                                                    <div class="flex gap-2 self-end sm:self-center">
                                                                        <a href="yazilacaklar.html?topicId=${topic.id}&courseId=${course.id}&unitId=${unit.id}" class="flex items-center gap-1 bg-sky-900/50 hover:bg-sky-600 border border-sky-700 text-sky-200 text-[10px] font-bold py-1 px-2 rounded">
                                                                            <i data-lucide="columns" class="h-3 w-3"></i> Yazılacaklar
                                                                        </a>
                                                                        ${topic.htmlContent ? `
                                                                        <a href="ozetler.html?topicId=${topic.id}&courseId=${course.id}&unitId=${unit.id}" class="flex items-center gap-1 bg-amber-900/50 hover:bg-amber-600 border border-amber-700 text-amber-200 text-[10px] font-bold py-1 px-2 rounded">
                                                                            <i data-lucide="book-open" class="h-3 w-3"></i> Özet
                                                                        </a>` : ''}
                                                                         <a href="oyun.html?game=kelime-avi&topicId=${topic.id}" class="flex items-center gap-1 bg-rose-900/50 hover:bg-rose-600 border border-rose-700 text-rose-200 text-[10px] font-bold py-1 px-2 rounded">
                                                                            <i data-lucide="gamepad-2" class="h-3 w-3"></i> Oyun
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            } catch (error) {
                                console.error(`Could not load course ${courseInfo.id}:`, error);
                                return '<div>Ders yüklenemedi.</div>';
                            }
                        });
                        courseContainer.innerHTML = (await Promise.all(courseHtmlPromises)).join('');
                        lucide.createIcons(); // Render icons after adding new HTML
                    }
                }
            });
        });
        
        lucide.createIcons();
    };

    loadData();
});

    