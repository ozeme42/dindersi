document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');

    if (!content || !loading) return;

    // A. Veri Manifestosunu Yükle
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // B. Yükleme Ekranını Gizle, İçeriği Göster
            loading.style.display = 'none';
            content.style.display = 'block';

            // C. İçeriği Render Et
            renderCourseGroups(data.courseGroups, content);
        })
        .catch(error => {
            console.error('Error loading or parsing data:', error);
            loading.innerHTML = `
                <div class="text-center text-red-400">
                    <h2 class="text-xl font-bold">İçerik Yüklenemedi</h2>
                    <p>Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.</p>
                </div>
            `;
        });
});

function renderCourseGroups(groups, container) {
    if (!groups || groups.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400">Gösterilecek ders grubu bulunamadı.</p>';
        return;
    }

    const groupColors = [
        'from-purple-500 to-indigo-600', 
        'from-pink-500 to-rose-600', 
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600', 
        'from-cyan-400 to-blue-600'
    ];

    groups.forEach((group, index) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'mb-8';

        const groupColor = groupColors[index % groupColors.length];

        let coursesHtml = '';
        if (group.dersler && group.dersler.length > 0) {
            coursesHtml = group.dersler.map(course => {
                const courseId = course.file.replace('.json', '');
                return `
                    <div class="course-item bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
                        <h4 class="font-bold text-lg text-white">${course.title}</h4>
                        <p class="text-sm text-gray-400">${course.className}</p>
                        <div class="mt-4 border-t border-gray-700 pt-4">
                            <button onclick="toggleTopics(this, '${courseId}')" class="text-sm text-cyan-400 hover:text-cyan-300 font-semibold">Konuları Görüntüle</button>
                            <div class="topics-container hidden mt-2 space-y-2"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            coursesHtml = '<p class="text-gray-500">Bu grupta ders bulunmuyor.</p>';
        }

        groupEl.innerHTML = `
            <div class="group-header bg-gradient-to-r ${groupColor} p-4 rounded-t-xl">
                <h3 class="text-2xl font-black text-white">${group.title}</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-800/50 p-4 rounded-b-xl">
                ${coursesHtml}
            </div>
        `;
        container.appendChild(groupEl);
    });
}

function toggleTopics(button, courseId) {
    const topicsContainer = button.nextElementSibling;
    const isHidden = topicsContainer.classList.contains('hidden');

    if (isHidden) {
        button.textContent = 'Yükleniyor...';
        fetch(`${courseId}.json`)
            .then(response => response.json())
            .then(courseData => {
                let topicsHtml = '<p class="text-gray-500">Bu derste konu bulunmuyor.</p>';
                if (courseData.units && courseData.units.length > 0) {
                    const allTopics = courseData.units.flatMap(unit => 
                        unit.topics.map(topic => ({ ...topic, unitTitle: unit.title }))
                    );
                    if (allTopics.length > 0) {
                        topicsHtml = allTopics.map(topic => `
                            <div class="topic-item bg-gray-900 p-3 rounded-md">
                                <p class="text-white">${topic.title}</p>
                                <div class="flex gap-2 mt-2">
                                    <a href="yazilacaklar.html?topicId=${topic.id}&courseId=${courseId}&unitId=${courseData.units.find(u => u.topics.some(t => t.id === topic.id)).id}" class="text-xs bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-2 rounded">Notlar</a>
                                    <a href="oyun.html?game=adam-asmaca&topicId=${topic.id}" class="text-xs bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-2 rounded">Adam Asmaca</a>
                                    <a href="oyun.html?game=kelime-avi&topicId=${topic.id}" class="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-2 rounded">Kelime Avı</a>
                                </div>
                            </div>
                        `).join('');
                    }
                }
                topicsContainer.innerHTML = topicsHtml;
                button.textContent = 'Konuları Gizle';
                topicsContainer.classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error fetching course topics:', error);
                topicsContainer.innerHTML = '<p class="text-red-400">Konular yüklenemedi.</p>';
                button.textContent = 'Hata Oluştu';
            });
    } else {
        topicsContainer.innerHTML = '';
        topicsContainer.classList.add('hidden');
        button.textContent = 'Konuları Görüntüle';
    }
}
