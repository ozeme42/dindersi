document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const loading = document.getElementById('loading');
    let manifestData = null; // Store manifest data globally within this scope

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
                <div class="error-message">
                    <h2>İçerik Yüklenemedi</h2>
                    <p>${message}</p>
                    <button onclick="window.location.reload()">Yeniden Dene</button>
                </div>
            `;
        }
    };

    const renderCourseGroups = (courseGroups) => {
        if (!content) return;
        content.innerHTML = `
            <div class="header">
                <h1>📚 Dersler ve Konular</h1>
                <p>Oynamak veya incelemek için bir konu seçin.</p>
            </div>
            ${courseGroups.map(group => `
                <div class="course-group">
                    <h2>${group.title}</h2>
                    <div class="course-list">
                        ${group.courses.map(course => `
                            <div class="course-card" data-course-file="${course.file}" data-course-id="${course.id}">
                                <h3>${course.title}</h3>
                                <p>${course.className || 'Genel'}</p>
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
        fetch(`/curriculum/${courseFile}`)
            .then(response => {
                if (!response.ok) throw new Error(`Ders dosyası yüklenemedi: ${courseFile}`);
                return response.json();
            })
            .then(courseData => {
                hideLoading();
                if (!content) return;
                content.innerHTML = `
                    <div class="header">
                        <button id="back-to-main" class="back-button">‹ Tüm Dersler</button>
                        <h1>${courseData.title}</h1>
                    </div>
                    <div class="unit-list">
                        ${courseData.units.map(unit => `
                            <div class="unit-card">
                                <h3>${unit.title}</h3>
                                <div class="topic-list">
                                    ${unit.topics.map(topic => {
                                        const yazilacaklarUrl = `/curriculum/yazilacaklar.html?courseId=${courseId}&unitId=${unit.id}&topicId=${topic.id}`;
                                        const oyunlarUrl = `/curriculum/oyun.html?courseId=${courseId}&unitId=${unit.id}&topicId=${topic.id}`;
                                        
                                        return `
                                            <div class="topic-item">
                                                <span>${topic.title}</span>
                                                <div class="topic-actions">
                                                    <a href="${yazilacaklarUrl}" class="action-btn yazilacaklar">Notlar</a>
                                                    <a href="${oyunlarUrl}" class="action-btn oyunlar">Oyunlar</a>
                                                </div>
                                            </div>
                                        `
                                    }).join('')}
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
                showError('Seçilen dersin detayları yüklenemedi. Lütfen tekrar deneyin.');
            });
    };

    // Main execution
    showLoading();
    fetch('/curriculum/manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Manifest dosyası bulunamadı. Statik site verilerinin doğru oluşturulduğundan emin olun.');
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            manifestData = data; // Store for later use (back button)
            renderCourseGroups(data.courseGroups);
        })
        .catch(error => {
            console.error('Ana veri yüklenirken hata:', error);
            showError(error.message);
        });
});
