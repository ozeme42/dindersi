
document.addEventListener('DOMContentLoaded', () => {
    const courseListContainer = document.getElementById('course-list');
    const loadingContainer = document.getElementById('loading-container');
    const mainTitle = document.getElementById('main-title');

    if (!courseListContainer || !loadingContainer) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        return;
    }

    // --- ÖNCEKİ SEÇİMİ HATIRLAMA ---
    const savedSelections = JSON.parse(localStorage.getItem('staticSelection') || '{}');
    if (savedSelections.courseId && mainTitle) {
        mainTitle.textContent = `${savedSelections.className} - ${savedSelections.courseName}`;
    }

    // --- VERİ YÜKLEME ---
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.courseGroups) {
                throw new Error("Manifest.json formatı bozuk veya courseGroups eksik.");
            }
            renderCourseGroups(data.courseGroups);
            loadingContainer.style.display = 'none';
            courseListContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Veri yüklenirken hata oluştu:', error);
            loadingContainer.innerHTML = `
                <div class="error-container">
                    <p>İçerik Yüklenemedi</p>
                    <small>${error.message}</small>
                </div>
            `;
        });

    // --- ARAYÜZÜ OLUŞTURMA ---
    function renderCourseGroups(groups) {
        courseListContainer.innerHTML = ''; // Konteyneri temizle

        if (groups.length === 0) {
            courseListContainer.innerHTML = '<p class="error-container">Gösterilecek ders bulunmuyor.</p>';
            return;
        }

        groups.forEach((group, groupIndex) => {
            if (group.courses && group.courses.length > 0) {
                // Sınıf Grubu Başlığı
                const groupTitle = document.createElement('h2');
                groupTitle.className = 'group-title';
                groupTitle.textContent = group.name;
                courseListContainer.appendChild(groupTitle);

                const courseGrid = document.createElement('div');
                courseGrid.className = 'course-grid';
                
                group.courses.forEach((course, courseIndex) => {
                    const courseCard = createCourseCard(course, group, groupIndex, courseIndex);
                    courseGrid.appendChild(courseCard);
                });
                
                courseListContainer.appendChild(courseGrid);
            }
        });
    }

    function createCourseCard(course, group, groupIndex, courseIndex) {
        const card = document.createElement('div');
        card.className = 'course-card';
        card.style.setProperty('--group-index', groupIndex);
        card.style.setProperty('--course-index', courseIndex);

        card.innerHTML = `
            <h3 class="course-title">${course.title}</h3>
            <div class="unit-accordion"></div>
        `;

        const accordionContainer = card.querySelector('.unit-accordion');
        if (!accordionContainer) return card;

        course.units.forEach(unit => {
            const unitElement = createUnitElement(unit, course, group);
            accordionContainer.appendChild(unitElement);
        });

        return card;
    }

    function createUnitElement(unit, course, group) {
        const unitWrapper = document.createElement('div');
        unitWrapper.className = 'unit-item';
        
        const unitHeader = document.createElement('button');
        unitHeader.className = 'unit-header';
        unitHeader.innerHTML = `
            <span>${unit.title}</span>
            <svg class="unit-chevron" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        `;

        const topicList = document.createElement('div');
        topicList.className = 'topic-list';

        // Add "Ünite Özeti" if available
        if(unit.hasUnitOzet) {
            const unitOzetLink = createTopicLink(
                `/curriculum/ozetler/index.html?courseId=${course.id}&unitId=${unit.id}`,
                `${unit.title} (Ünite Özeti)`,
                'ozet'
            );
            topicList.appendChild(unitOzetLink);
        }

        unit.topics.forEach(topic => {
            const topicLinks = document.createElement('div');
            topicLinks.className = 'topic-links-container';
            
            // Link for games
            const gameLink = createTopicLink(
                `/curriculum/oyun.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&className=${encodeURIComponent(group.name)}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`,
                topic.title,
                'oyun'
            );
            topicLinks.appendChild(gameLink);

            // Link for "Yazılacaklar"
            if (topic.hasYazilacaklar) {
                const yazilacaklarLink = createTopicLink(
                    `/curriculum/yazilacaklar.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}`,
                    'Yazılacaklar',
                    'yazilacaklar'
                );
                topicLinks.appendChild(yazilacaklarLink);
            }
             // Link for "Özet"
            if (topic.hasOzet) {
                const ozetLink = createTopicLink(
                    `/curriculum/ozetler/index.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}`,
                    'Özet',
                    'ozet'
                );
                topicLinks.appendChild(ozetLink);
            }
            
            topicList.appendChild(topicLinks);
        });

        unitWrapper.appendChild(unitHeader);
        unitWrapper.appendChild(topicList);

        unitHeader.addEventListener('click', () => {
            unitWrapper.classList.toggle('open');
        });

        return unitWrapper;
    }
    
    function createTopicLink(href, text, type) {
        const link = document.createElement('a');
        link.href = href;
        link.className = `topic-link topic-link-${type}`;
        link.textContent = text;
        return link;
    }
});
