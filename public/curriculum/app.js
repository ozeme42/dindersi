document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayCourses();
});

const mainContent = document.getElementById('main-content');

async function loadAndDisplayCourses() {
    if (!mainContent) return;
    mainContent.innerHTML = '<div class="loader"></div>';

    try {
        // YOL DÜZELTMESİ: /curriculum/ eklendi
        const response = await fetch('/curriculum/manifest.json');
        if (!response.ok) throw new Error('Manifest file not found.');
        const manifest = await response.json();

        if (!manifest.courseGroups || manifest.courseGroups.length === 0) {
            throw new Error('No course groups found in manifest.');
        }

        let contentHtml = '';
        for (const group of manifest.courseGroups) {
            contentHtml += `<div class="course-group"><h2>${group.title}</h2><div class="course-grid">`;
            for (const courseInfo of group.courses) {
                // YOL DÜZELTMESİ: /curriculum/ eklendi
                try {
                    const courseRes = await fetch(`/curriculum/${courseInfo.file}`);
                    if (!courseRes.ok) continue; // Skip if a course file is missing
                    const course = await courseRes.json();
                    contentHtml += createCourseCard(course);
                } catch (e) {
                    console.error(`Could not load course ${courseInfo.file}`, e);
                }
            }
            contentHtml += `</div></div>`;
        }
        mainContent.innerHTML = contentHtml;
        addAccordionListeners();
    } catch (error) {
        console.error('Error loading or parsing curriculum:', error);
        mainContent.innerHTML = `
            <div class="error-container">
                <h2>İçerik Yüklenemedi</h2>
                <p>Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.</p>
            </div>`;
    }
}

function createCourseCard(course) {
    let unitsHtml = '<div class="accordion-content"><div class="unit-list">';
    if (course.units && course.units.length > 0) {
        course.units.forEach(unit => {
            unitsHtml += `
                <div class="unit-item">
                    <h4 class="unit-title">${unit.title}</h4>
                    <div class="topic-list">
                        ${unit.topics.map(topic => createTopicLink(topic, course.id, unit.id)).join('')}
                    </div>
                </div>
            `;
        });
    } else {
        unitsHtml += '<p class="no-content">Bu ders için ünite bulunmuyor.</p>';
    }
    unitsHtml += '</div></div>';

    return `
        <div class="course-card accordion-item">
            <button class="accordion-button">
                <span class="course-title">${course.title}</span>
                <span class="course-class">${course.className || 'Genel'}</span>
                <span class="chevron"></span>
            </button>
            ${unitsHtml}
        </div>
    `;
}

function createTopicLink(topic, courseId, unitId) {
    // YOL DÜZELTMESİ: /curriculum/ eklendi
    const yazilacaklarUrl = `/curriculum/yazilacaklar.html?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}`;
    // YOL DÜZELTMESİ: /curriculum/ eklendi
    const oyunlarUrl = `/curriculum/oyun.html?courseId=${courseId}&unitId=${unitId}&topicId=${topic.id}`;
    
    return `
        <div class="topic-item">
            <span>${topic.title}</span>
            <div class="topic-links">
                <a href="${oyunlarUrl}" class="topic-link games">OYUNLAR</a>
                <a href="${yazilacaklarUrl}" class="topic-link notes">NOTLAR</a>
            </div>
        </div>
    `;
}

function addAccordionListeners() {
    const accordionItems = document.querySelectorAll('.accordion-button');
    accordionItems.forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            const item = button.parentElement;

            if (item.classList.contains('active')) {
                item.classList.remove('active');
                content.style.maxHeight = null;
            } else {
                // Close other items
                // accordionItems.forEach(otherButton => {
                //     otherButton.parentElement.classList.remove('active');
                //     otherButton.nextElementSibling.style.maxHeight = null;
                // });
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}
