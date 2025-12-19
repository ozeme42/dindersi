
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    function showError(message) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = `Bir Hata Oluştu: ${message}`;
            errorDiv.style.display = 'block';
        }
        if (mainContent) mainContent.style.display = 'none';
    }

    function renderCourseGroups(groups) {
        if (!mainContent) return;
        mainContent.innerHTML = ''; // Clear previous content

        if (!groups || groups.length === 0) {
            mainContent.innerHTML = '<p class="text-center text-gray-400">Gösterilecek ders grubu bulunmuyor.</p>';
            return;
        }

        groups.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'course-group';
            const groupTitle = document.createElement('h2');
            groupTitle.textContent = group.name;
            groupEl.appendChild(groupTitle);
            
            const coursesList = document.createElement('div');
            coursesList.className = 'courses-list';

            if (group.courses && group.courses.length > 0) {
                group.courses.forEach(course => {
                    const courseEl = document.createElement('div');
                    courseEl.className = 'course-item';
                    courseEl.textContent = course.title;
                    courseEl.onclick = () => fetchCourseDetails(course.file, group.name);
                    coursesList.appendChild(courseEl);
                });
            } else {
                coursesList.innerHTML = '<p class="text-gray-500">Bu grupta ders bulunmuyor.</p>';
            }
            groupEl.appendChild(coursesList);
            mainContent.appendChild(groupEl);
        });

        if (loadingDiv) loadingDiv.style.display = 'none';
        mainContent.style.display = 'block';
    }

    function renderCourseDetails(courseData, groupName) {
        if (!mainContent) return;
        mainContent.innerHTML = '';
        
        const backButton = document.createElement('button');
        backButton.textContent = '‹ Tüm Derslere Geri Dön';
        backButton.className = 'back-button';
        backButton.onclick = () => fetchManifest();
        mainContent.appendChild(backButton);

        const courseTitle = document.createElement('h2');
        courseTitle.textContent = courseData.title;
        courseTitle.className = 'course-group'; // Reuse style
        mainContent.appendChild(courseTitle);
        
        const unitsContainer = document.createElement('div');
        mainContent.appendChild(unitsContainer);

        courseData.units.forEach(unit => {
            const unitAccordion = document.createElement('details');
            unitAccordion.className = 'unit-accordion';
            const summary = document.createElement('summary');
            summary.textContent = unit.title;
            unitAccordion.appendChild(summary);

            const topicsList = document.createElement('ul');
            topicsList.className = 'topics-list';
            
            // Ünite Özeti Linki
            if (unit.hasUnitOzet) {
                const unizOzetItem = document.createElement('li');
                unizOzetItem.className = 'topic-item ozet-link';
                unizOzetItem.innerHTML = `<a href="ozet.html?courseId=${courseData.id}&unitId=${unit.id}"><span>${unit.title} (Ünite Özeti)</span></a>`;
                topicsList.appendChild(unizOzetItem);
            }

            unit.topics.forEach(topic => {
                const topicItem = document.createElement('li');
                topicItem.className = 'topic-item';
                topicItem.innerHTML = `
                    <div class="topic-title">${topic.title}</div>
                    <div class="topic-links">
                       ${topic.hasOzet ? `<a href="ozet.html?courseId=${courseData.id}&unitId=${unit.id}&topicId=${topic.id}">Özet</a>` : ''}
                       ${topic.hasYazilacaklar ? `<a href="yazilacaklar.html?courseId=${courseData.id}&unitId=${unit.id}&topicId=${topic.id}">Notlar</a>` : ''}
                       <a href="oyun.html?courseId=${courseData.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(courseData.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}">Oyun</a>
                    </div>
                `;
                topicsList.appendChild(topicItem);
            });

            unitAccordion.appendChild(topicsList);
            unitsContainer.appendChild(unitAccordion);
        });
    }

    function fetchCourseDetails(courseFile, groupName) {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (mainContent) mainContent.style.display = 'none';

        fetch(`/curriculum/${courseFile}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                renderCourseDetails(data, groupName);
                if (loadingDiv) loadingDiv.style.display = 'none';
                if (mainContent) mainContent.style.display = 'block';
            })
            .catch(error => {
                console.error("Ders detayı alınamadı:", error);
                showError("Seçilen dersin detayları yüklenemedi.");
            });
    }
    
    function fetchManifest() {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
        
        fetch('/curriculum/manifest.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Manifest dosyası bulunamadı: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.courseGroups) {
                    renderCourseGroups(data.courseGroups);
                } else {
                    throw new Error("Manifest dosyasının yapısı geçersiz.");
                }
            })
            .catch(error => {
                console.error("Veri yükleme hatası:", error);
                showError("Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.");
            });
    }

    fetchManifest();
});
