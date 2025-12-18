
document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('main-content');
    const loadingText = document.querySelector('.loading-text');

    try {
        const response = await fetch('/curriculum/manifest.json');
        if (!response.ok) {
            throw new Error(`Manifest dosyası yüklenemedi: ${response.statusText}`);
        }
        const manifest = await response.json();

        if (loadingText) loadingText.style.display = 'none';
        
        manifest.courseGroups.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'course-group';
            
            const groupTitle = document.createElement('h2');
            groupTitle.textContent = group.title;
            groupEl.appendChild(groupTitle);

            const coursesContainer = document.createElement('div');
            coursesContainer.className = 'courses-container';
            groupEl.appendChild(coursesContainer);

            group.courses.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.className = 'course-card';
                courseCard.innerHTML = `<h3>${course.title}</h3><p>${course.className || 'Genel'}</p>`;
                courseCard.addEventListener('click', () => renderCourseDetails(course.file, mainContent));
                coursesContainer.appendChild(courseCard);
            });
            mainContent.appendChild(groupEl);
        });

    } catch (error) {
        console.error('Hata:', error);
        if (loadingText) loadingText.textContent = 'İçerikler Yüklenemedi. Lütfen tekrar deneyin.';
    }
});

async function renderCourseDetails(courseFile, container) {
    container.innerHTML = '<p class="loading-text">Ders içeriği yükleniyor...</p>';
    try {
        const response = await fetch(`/curriculum/${courseFile}`);
        const course = await response.json();

        let detailsHtml = `
            <button id="back-to-courses" class="back-button">&larr; Geri</button>
            <div class="course-detail-header">
                <h1>${course.title}</h1>
                <p>${course.className || 'Genel'}</p>
            </div>
            <div class="units-container">
        `;

        course.units.forEach(unit => {
            detailsHtml += `
                <div class="unit-card">
                    <h2>${unit.title}</h2>
                    <div class="topics-list">
            `;
            unit.topics.forEach(topic => {
                 const params = `courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`;
                
                const yazilacaklarLink = `<a href="yazilacaklar.html?${params}" class="topic-link yazilacaklar">Notlar</a>`;
                const oyunlarLink = `<a href="oyun.html?${params}&gamePath=kelime-avi" class="topic-link oyunlar">Oyunlar</a>`;
                
                detailsHtml += `
                    <div class="topic-item">
                        <span>${topic.title}</span>
                        <div class="topic-links">
                            ${yazilacaklarLink}
                            ${oyunlarLink}
                        </div>
                    </div>
                `;
            });
            detailsHtml += '</div></div>';
        });

        detailsHtml += '</div>';
        container.innerHTML = detailsHtml;
        
        document.getElementById('back-to-courses').addEventListener('click', () => {
             container.innerHTML = '<p class="loading-text">Yükleniyor...</p>';
             // Re-initialize the main view
             document.dispatchEvent(new Event('DOMContentLoaded'));
        });

    } catch (error) {
        container.innerHTML = '<p class="loading-text">Ders detayı yüklenemedi.</p>';
    }
}
