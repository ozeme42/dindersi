document.addEventListener('DOMContentLoaded', async () => {
    const courseList = document.getElementById('course-list');
    const loadingMessage = document.getElementById('loading-message');

    if (!courseList || !loadingMessage) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        if (loadingMessage) loadingMessage.textContent = 'Sayfa yapısı hatalı.';
        return;
    }

    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP hatası! Durum: ${response.status}`);
        }
        const data = await response.json();
        const classes = data.classes || [];
        const allCourses = data.courses || [];
        
        // Sınıfları ID'ye göre haritala
        const classMap = new Map(classes.map(c => [c.id, c.name]));

        // Dersleri sınıflara göre grupla
        const groupedByClass = {};

        allCourses.forEach(course => {
            const className = classMap.get(course.classId) || 'Genel';
            if (!groupedByClass[className]) {
                groupedByClass[className] = [];
            }
            groupedByClass[className].push(course);
        });

        // HTML oluştur
        let contentHtml = '';
        for (const className in groupedByClass) {
            contentHtml += `<h2 class="class-title">${className}</h2>`;
            contentHtml += '<div class="course-grid">';
            
            groupedByClass[className].forEach(course => {
                contentHtml += `
                    <div class="course-card">
                        <h3>${course.title}</h3>
                        <ul>
                `;
                course.units.forEach(unit => {
                    unit.topics.forEach(topic => {
                         contentHtml += `
                            <li>
                                <span>${topic.title}</span>
                                <div class="topic-links">
                                    <a href="oyun.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}">Oyunlar</a>
                                    <a href="yazilacaklar.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}">Yazılacaklar</a>
                                </div>
                            </li>
                         `;
                    });
                });
                contentHtml += `
                        </ul>
                    </div>
                `;
            });
            contentHtml += '</div>';
        }
        
        courseList.innerHTML = contentHtml;
        loadingMessage.style.display = 'none';

    } catch (error) {
        console.error('Veri yüklenirken bir hata oluştu:', error);
        loadingMessage.textContent = 'Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.';
        loadingMessage.style.color = 'red';
    }
});
