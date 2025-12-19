document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (!mainContent || !loadingIndicator) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        return;
    }

    function renderCourseGroups(groups) {
        if (!groups || groups.length === 0) {
            mainContent.innerHTML = '<p class="error-message">Gösterilecek ders grubu bulunmuyor.</p>';
            return;
        }

        const accordionHtml = groups.map(group => {
            // "dersler" anahtarını kontrol et, yoksa boş dizi kullan
            const courses = group.courses || [];
            if (courses.length === 0) {
                return ''; // Ders yoksa bu grubu atla
            }

            const courseListHtml = courses.map(course => {
                const unitListHtml = (course.units || []).map(unit => {
                    const topicListHtml = (unit.topics || []).map(topic => {
                        const gameLinks = `
                            <a href="oyun.html?game=kelime-avi&topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="topic-link game">Kelime Avı</a>
                            <a href="oyun.html?game=adam-asmaca&topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="topic-link game">Adam Asmaca</a>
                        `;
                        const yazilacaklarLink = topic.hasYazilacaklar ? `<a href="yazilacaklar.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="topic-link notes">Yazılacaklar</a>` : '';
                        const ozetLink = topic.hasOzet ? `<a href="ozet.html?topicId=${topic.id}" class="topic-link summary">Özet</a>` : '';

                        return `
                            <div class="topic">
                                <span>${topic.title}</span>
                                <div class="topic-links">
                                    ${gameLinks}
                                    ${yazilacaklarLink}
                                    ${ozetLink}
                                </div>
                            </div>
                        `;
                    }).join('');

                    return `
                        <div class="unit">
                            <h4 class="unit-title">${unit.title}</h4>
                            <div class="topics-container">
                                ${topicListHtml}
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="course">
                        <h3 class="course-title">${course.title}</h3>
                        <div class="units-container">
                            ${unitListHtml}
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="class-group">
                    <h2 class="class-title">${group.name}</h2>
                    <div class="courses-container">
                        ${courseListHtml}
                    </div>
                </div>
            `;
        }).join('');

        mainContent.innerHTML = accordionHtml;
    }

    // Veriyi çek ve render et
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            renderCourseGroups(data.courseGroups);
            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Fetch error:', error);
            loadingIndicator.innerHTML = '<p class="error-message">İçerikler yüklenemedi. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.</p>';
        });
});
