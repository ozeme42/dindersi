
document.addEventListener('DOMContentLoaded', () => {
    const curriculumDiv = document.getElementById('curriculum');
    const loadingDiv = document.getElementById('loading');

    if (!curriculumDiv || !loadingDiv) {
        console.error('Gerekli HTML elementleri bulunamadı.');
        return;
    }

    // --- VERİ ÇEKME ---
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            loadingDiv.style.display = 'none';
            if (data && data.courseGroups) {
                renderCourseGroups(data.courseGroups, curriculumDiv);
            } else {
                curriculumDiv.innerHTML = '<p class="error">Müfredat verisi bulunamadı veya formatı hatalı.</p>';
            }
        })
        .catch(error => {
            console.error('Veri yüklenirken hata oluştu:', error);
            loadingDiv.style.display = 'none';
            curriculumDiv.innerHTML = `<p class="error">Veriler yüklenemedi. Lütfen sayfayı yenileyin veya yöneticiyle iletişime geçin. Hata: ${error.message}</p>`;
        });

    // --- ARAYÜZ OLUŞTURMA FONKSİYONLARI ---
    function renderCourseGroups(groups, container) {
        if (groups.length === 0) {
            container.innerHTML = '<p>Gösterilecek ders grubu bulunmuyor.</p>';
            return;
        }

        groups.forEach(group => {
            if (group.courses && group.courses.length > 0) {
                const groupElement = createGroupElement(group);
                container.appendChild(groupElement);
            }
        });
    }

    function createGroupElement(group) {
        const section = document.createElement('section');
        section.className = 'course-group';

        const title = document.createElement('h2');
        title.className = 'group-title';
        title.textContent = group.name;
        section.appendChild(title);

        const coursesContainer = document.createElement('div');
        coursesContainer.className = 'courses-container';
        section.appendChild(coursesContainer);

        group.courses.forEach(course => {
            const courseElement = createCourseElement(course);
            coursesContainer.appendChild(courseElement);
        });

        return section;
    }

    function createCourseElement(course) {
        const courseDiv = document.createElement('div');
        courseDiv.className = 'course';

        const courseTitle = document.createElement('h3');
        courseTitle.textContent = course.title;
        courseDiv.appendChild(courseTitle);

        if (course.units && course.units.length > 0) {
            course.units.forEach(unit => {
                const unitElement = createUnitElement(unit, course);
                courseDiv.appendChild(unitElement);
            });
        }

        return courseDiv;
    }

    function createUnitElement(unit, course) {
        const unitDiv = document.createElement('details');
        unitDiv.className = 'unit';
        unitDiv.open = true; // Varsayılan olarak açık

        const summary = document.createElement('summary');
        summary.textContent = unit.title;
        unitDiv.appendChild(summary);

        const topicsList = document.createElement('ul');
        unitDiv.appendChild(topicsList);
        
        if (unit.hasUnitOzet) {
            const link = createLink('Ünite Özeti', `ozetler.html?courseId=${course.id}&unitId=${unit.id}`);
            const listItem = document.createElement('li');
            listItem.appendChild(link);
            topicsList.appendChild(listItem);
        }

        unit.topics.forEach(topic => {
            const topicElement = createTopicElement(topic, course, unit);
            topicsList.appendChild(topicElement);
        });

        return unitDiv;
    }

    function createTopicElement(topic, course, unit) {
        const topicItem = document.createElement('li');
        topicItem.className = 'topic';

        const topicTitle = document.createElement('span');
        topicTitle.textContent = topic.title;
        topicItem.appendChild(topicTitle);
        
        const linksContainer = document.createElement('div');
        linksContainer.className = 'topic-links';
        topicItem.appendChild(linksContainer);

        const baseUrlParams = `courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(course.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`;
        
        if (topic.hasOzet) {
            linksContainer.appendChild(createLink('Özet', `ozetler.html?${baseUrlParams}`));
        }
        if (topic.hasYazilacaklar) {
            linksContainer.appendChild(createLink('Notlar', `yazilacaklar.html?${baseUrlParams}`));
        }
        linksContainer.appendChild(createLink('Oyun', `oyun.html?${baseUrlParams}`));

        return topicItem;
    }

    function createLink(text, href) {
        const link = document.createElement('a');
        link.textContent = text;
        link.href = href;
        return link;
    }
});
