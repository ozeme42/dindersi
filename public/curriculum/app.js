
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('main-container');
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');

    if (!mainContainer || !loadingIndicator || !errorContainer) {
        console.error("Gerekli HTML elementleri bulunamadı!");
        return;
    }

    const showError = (message) => {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
    };

    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            loadingIndicator.style.display = 'none';
            mainContainer.style.display = 'block';
            renderCourseGroups(data.courseGroups, mainContainer);
        })
        .catch(error => {
            console.error('Veri yüklenirken hata oluştu:', error);
            showError('Veri yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
        });

    function renderCourseGroups(groups, container) {
        if (!groups || groups.length === 0) {
            container.innerHTML = '<p class="error-message">Gösterilecek ders grubu bulunmuyor.</p>';
            return;
        }

        groups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'course-group';

            const groupTitle = document.createElement('h2');
            groupTitle.textContent = group.name;
            groupElement.appendChild(groupTitle);
            
            if (group.courses && group.courses.length > 0) {
                group.courses.forEach(course => {
                    const courseElement = createCourseElement(course);
                    groupElement.appendChild(courseElement);
                });
            } else {
                 const noCourseMessage = document.createElement('p');
                 noCourseMessage.textContent = 'Bu grupta ders bulunmuyor.';
                 noCourseMessage.className = 'no-content-message';
                 groupElement.appendChild(noCourseMessage);
            }
            container.appendChild(groupElement);
        });
    }

    function createCourseElement(course) {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-item';
        
        const courseTitle = document.createElement('h3');
        courseTitle.textContent = course.title;
        courseElement.appendChild(courseTitle);
        
        if (course.units && course.units.length > 0) {
            course.units.forEach(unit => {
                const unitElement = createUnitElement(course, unit);
                courseElement.appendChild(unitElement);
            });
        } else {
            const noUnitMessage = document.createElement('p');
            noUnitMessage.textContent = 'Bu derse ait ünite bulunmuyor.';
            noUnitMessage.className = 'no-content-message';
            courseElement.appendChild(noUnitMessage);
        }
        return courseElement;
    }

    function createUnitElement(course, unit) {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-item';
        
        const unitTitle = document.createElement('h4');
        unitTitle.textContent = unit.title;
        unitElement.appendChild(unitTitle);
        
        const linksContainer = document.createElement('div');
        linksContainer.className = 'links-container';

        if (unit.hasUnitOzet) {
             linksContainer.appendChild(createLink('Özet', `/ozetler/${course.id}/${unit.id}`, {}));
        }

        if (unit.topics && unit.topics.length > 0) {
            unit.topics.forEach(topic => {
                if (topic.hasYazilacaklar) {
                    linksContainer.appendChild(createLink(`${topic.title} - Notlar`, 'yazilacaklar.html', topic, course.id, unit.id));
                }
                if (topic.hasOzet) {
                     linksContainer.appendChild(createLink(`${topic.title} - Özet`, `/ozetler/${course.id}/${unit.id}/${topic.id}`, {}));
                }
                linksContainer.appendChild(createLink(`${topic.title} - Oyun`, 'oyun.html', topic, course.id, unit.id));
            });
        }
        
        unitElement.appendChild(linksContainer);
        return unitElement;
    }

    function createLink(text, baseUrl, topic, courseId, unitId) {
        const link = document.createElement('a');
        link.textContent = text;
        const params = new URLSearchParams({
            topicId: topic.id,
            courseId: courseId,
            unitId: unitId,
            topicName: topic.title,
        });
        link.href = `${baseUrl}?${params.toString()}`;
        link.className = 'topic-link';
        return link;
    }
});

    