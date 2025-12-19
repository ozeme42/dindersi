document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('main-content');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-container');

    // --- Helper Functions ---
    const createLink = (base, params) => {
        const url = new URL(base, window.location.href);
        for (const key in params) {
            url.searchParams.append(key, params[key]);
        }
        return url.href;
    };

    const createTopicLinks = (topic, course, unit) => {
        let linksHtml = '';
        const baseParams = {
            courseId: course.id,
            courseName: course.title,
            unitId: unit.id,
            unitName: unit.title,
            topicId: topic.id,
            topicName: topic.title,
        };

        if (topic.hasYazilacaklar) {
            linksHtml += `<a href="${createLink('yazilacaklar.html', baseParams)}" class="topic-link yazilacaklar-link">Yazılacaklar</a>`;
        }
        if (topic.hasOzet) {
            linksHtml += `<a href="${createLink('ozetler.html', baseParams)}" class="topic-link ozet-link">Özet</a>`;
        }
        // Oyun linkini daha genel hale getirelim
        linksHtml += `<a href="${createLink('oyun.html', baseParams)}" class="topic-link game-link">Oyunlar</a>`;

        return linksHtml;
    };
    
    // --- Main Logic ---
    try {
        if (!mainContent || !loadingDiv || !errorDiv) {
            throw new Error("Gerekli HTML elemanları bulunamadı.");
        }

        const response = await fetch('manifest.json');
        if (!response.ok) {
            throw new Error(`Manifest dosyası yüklenemedi: ${response.statusText}`);
        }
        const data = await response.json();
        const courseGroups = data.courseGroups || [];

        if (courseGroups.length === 0) {
            mainContent.innerHTML = '<p class="no-content-message">Gösterilecek ders materyali bulunmuyor.</p>';
            loadingDiv.style.display = 'none';
            return;
        }

        let contentHtml = '';

        courseGroups.forEach(group => {
            if (group.courses && group.courses.length > 0) {
                contentHtml += `
                    <div class="course-group">
                        <h2 class="class-title">${group.name}</h2>
                        <div class="course-list">
                `;
                
                group.courses.forEach(course => {
                    contentHtml += `
                        <details class="course-item">
                            <summary class="course-title">${course.title}</summary>
                            <div class="unit-list">
                    `;
                    course.units.forEach(unit => {
                        contentHtml += `
                            <details class="unit-item">
                                <summary class="unit-title">${unit.title}</summary>
                                <div class="topic-list">
                        `;
                        unit.topics.forEach(topic => {
                             contentHtml += `
                                <div class="topic-item">
                                    <span class="topic-title">${topic.title}</span>
                                    <div class="topic-links">
                                        ${createTopicLinks(topic, course, unit)}
                                    </div>
                                </div>
                            `;
                        });
                        contentHtml += `</div></details>`;
                    });
                    contentHtml += `</div></details>`;
                });
                
                contentHtml += `</div></div>`;
            }
        });

        mainContent.innerHTML = contentHtml;
        loadingDiv.style.display = 'none';

    } catch (error) {
        console.error('Ana sayfa yüklenirken hata oluştu:', error);
        if(errorDiv) {
             errorDiv.innerHTML = `
                <div class="error-box">
                    <h2>Bir Hata Oluştu</h2>
                    <p>Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin veya yönetici ile iletişime geçin.</p>
                    <pre>${error.message}</pre>
                </div>
            `;
            errorDiv.style.display = 'flex';
        }
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
});
