
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Verileri çek ve sayfayı oluştur
    fetchData();

    async function fetchData() {
        if (!mainContent || !loadingIndicator) return;

        try {
            // DÜZELTME: Manifest dosyasını her zaman kök dizinden aramak için mutlak yol kullanıldı.
            const manifestResponse = await fetch('/curriculum/manifest.json');
            if (!manifestResponse.ok) {
                throw new Error(`Manifest dosyası yüklenemedi: ${manifestResponse.statusText}`);
            }
            const manifest = await manifestResponse.json();
            
            // Yükleme göstergesini gizle ve içeriği göster
            loadingIndicator.style.display = 'none';
            mainContent.style.display = 'block';

            renderCourseGroups(manifest.courseGroups);

        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-container">
                        <h2>İçerikler Yüklenemedi</h2>
                        <p>Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.</p>
                        <p class="error-details">${error.message}</p>
                    </div>
                `;
                 loadingIndicator.style.display = 'none';
                 mainContent.style.display = 'block';
            }
        }
    }

    function renderCourseGroups(courseGroups) {
        if (!mainContent) return;
        mainContent.innerHTML = ''; // Önceki içeriği temizle

        courseGroups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'course-group';
            
            const groupTitle = document.createElement('h2');
            groupTitle.textContent = group.title;
            groupElement.appendChild(groupTitle);
            
            const coursesContainer = document.createElement('div');
            coursesContainer.className = 'courses-container';
            groupElement.appendChild(coursesContainer);

            group.courses.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.className = 'course-card';
                courseCard.innerHTML = `
                    <div class="course-card-header">
                        <h3>${course.title}</h3>
                        ${course.className ? `<span>${course.className}</span>` : ''}
                    </div>
                `;
                courseCard.onclick = () => loadAndDisplayUnits(course, courseCard);
                coursesContainer.appendChild(courseCard);
            });

            mainContent.appendChild(groupElement);
        });
    }

    async function loadAndDisplayUnits(course, courseCardElement) {
        // Zaten açılmışsa tekrar yükleme
        if (courseCardElement.querySelector('.units-container')) {
            const container = courseCardElement.querySelector('.units-container');
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
            return;
        }

        const loadingUnits = document.createElement('div');
        loadingUnits.textContent = 'Üniteler yükleniyor...';
        courseCardElement.appendChild(loadingUnits);

        try {
            const courseResponse = await fetch(`/curriculum/${course.file}`);
            if (!courseResponse.ok) throw new Error('Ders detayı yüklenemedi.');
            const courseDetails = await courseResponse.json();
            
            loadingUnits.remove();

            const unitsContainer = document.createElement('div');
            unitsContainer.className = 'units-container';
            
            if (courseDetails.units && courseDetails.units.length > 0) {
                 courseDetails.units.forEach(unit => {
                    const unitElement = document.createElement('div');
                    unitElement.className = 'unit-item';
                    unitElement.innerHTML = `<h4>${unit.title}</h4>`;

                    if (unit.topics && unit.topics.length > 0) {
                        const topicsList = document.createElement('ul');
                        unit.topics.forEach(topic => {
                             const topicItem = document.createElement('li');
                             
                             const hasYazilacaklar = topic.hasYazilacaklarContent;
                             const hasOzet = topic.hasOzetContent;

                             let linksHTML = `
                                <span class="topic-title">${topic.title}</span>
                                <div class="topic-links">
                                    <a href="oyun.html?game=adam-asmaca&topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="game-link adam-asmaca" onclick="event.stopPropagation()">Adam Asmaca</a>
                                    <a href="oyun.html?game=kelime-avi&topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}" class="game-link kelime-avi" onclick="event.stopPropagation()">Kelime Avı</a>
                                    ${hasYazilacaklar ? `<a href="yazilacaklar.html?topicId=${topic.id}" class="game-link yazilacaklar" onclick="event.stopPropagation()">Notlar</a>` : ''}
                                    ${hasOzet ? `<a href="ozetler.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}" class="game-link ozetler" onclick="event.stopPropagation()">Özet</a>` : ''}
                                </div>
                             `;
                             topicItem.innerHTML = linksHTML;
                             topicsList.appendChild(topicItem);
                        });
                        unitElement.appendChild(topicsList);
                    } else {
                        unitElement.innerHTML += '<p>Bu ünite için konu bulunmuyor.</p>';
                    }
                    unitsContainer.appendChild(unitElement);
                });
            } else {
                 unitsContainer.innerHTML = '<p>Bu ders için ünite bulunmuyor.</p>';
            }
             courseCardElement.appendChild(unitsContainer);

        } catch (error) {
            console.error('Ünite ve konu verileri çekilirken hata:', error);
            loadingUnits.textContent = 'Üniteler yüklenemedi.';
        }
    }
});
