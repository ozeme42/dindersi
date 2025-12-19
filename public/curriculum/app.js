document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingMessage = document.getElementById('loading-message');

    if (!mainContent || !loadingMessage) {
        console.error('Gerekli HTML elemanları bulunamadı.');
        return;
    }

    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            loadingMessage.style.display = 'none';
            renderContent(data, mainContent);
        })
        .catch(error => {
            loadingMessage.innerHTML = `
                <div class="error-container">
                    <h2>Bir Hata Oluştu</h2>
                    <p>Veriler yüklenemedi. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.</p>
                    <pre>${error.message}</pre>
                </div>
            `;
            console.error('Error fetching or processing data:', error);
        });
});

function renderContent(data, container) {
    if (!data || !data.courses || !container) {
        container.innerHTML = '<p>İçerik bulunamadı.</p>';
        return;
    }

    // Dersleri sınıf adına göre gruplandır
    const coursesByClass = {};
    data.courses.forEach(course => {
        // Her kursun içinde sınıf adı zaten mevcut (actions.ts'de eklenmişti)
        const className = course.className || 'Genel';
        if (!coursesByClass[className]) {
            coursesByClass[className] = [];
        }
        coursesByClass[className].push(course);
    });

    const sortedClassNames = Object.keys(coursesByClass).sort((a, b) => {
        // "Genel" kategorisini sona atmak için özel sıralama
        if (a === 'Genel') return 1;
        if (b === 'Genel') return -1;
        // Diğerlerini sayısal/alfabetik olarak sırala
        return a.localeCompare(b, 'tr', { numeric: true });
    });

    let contentHtml = '';

    sortedClassNames.forEach(className => {
        const courses = coursesByClass[className];
        
        contentHtml += `
            <div class="class-group">
                <h2 class="class-title">${className}. Sınıf Dersleri</h2>
                <div class="courses-grid">
        `;

        courses.forEach(course => {
            contentHtml += `
                <div class="course-card">
                    <h3>${course.title}</h3>
                    <div class="units-list">
            `;
            if (course.units && course.units.length > 0) {
                 course.units.forEach(unit => {
                     contentHtml += `
                        <div class="unit-item">
                            <h4>${unit.title}</h4>
                            <div class="topics-list">
                     `;
                     if (unit.topics && unit.topics.length > 0) {
                         unit.topics.forEach(topic => {
                             contentHtml += createLink(course, unit, topic);
                         });
                     } else {
                         contentHtml += `<p class="no-content">Bu ünitede konu bulunmuyor.</p>`;
                     }
                     contentHtml += `</div></div>`;
                 });
            } else {
                contentHtml += `<p class="no-content">Bu derste ünite bulunmuyor.</p>`;
            }
           
            contentHtml += `</div></div>`;
        });

        contentHtml += `</div></div>`;
    });

    container.innerHTML = contentHtml;
}

function createLink(course, unit, topic) {
    if (!topic) return '';

    const hasYazilacaklar = (topic.writingContent?.notes?.length > 0) || (topic.writingContent?.conceptDefinitions?.length > 0);
    const hasOzet = !!topic.htmlContent;
    const hasActivities = topic.steps?.some(step => step.type === 'activityLink');
    const hasAnyContent = hasYazilacaklar || hasOzet || hasActivities;

    if (!hasAnyContent) {
        return `
            <div class="topic-item disabled">
                <span>${topic.title}</span>
                <span class="no-content-badge">İçerik Yok</span>
            </div>
        `;
    }

    const params = new URLSearchParams({
        courseId: course.id,
        courseName: course.title,
        unitId: unit.id,
        unitName: unit.title,
        topicId: topic.id,
        topicName: topic.title,
    });

    return `
        <div class="topic-item">
            <span>${topic.title}</span>
            <div class="topic-links">
                ${hasActivities ? `<a href="oyun.html?${params.toString()}" class="topic-button games">Oyunlar</a>` : ''}
                ${hasYazilacaklar ? `<a href="yazilacaklar.html?${params.toString()}" class="topic-button notes">Yazılacaklar</a>` : ''}
                ${hasOzet ? `<a href="ozet.html?${params.toString()}" class="topic-button summary">Özet</a>` : ''}
            </div>
        </div>
    `;
}
