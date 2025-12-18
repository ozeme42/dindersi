document.addEventListener('DOMContentLoaded', () => {
    loadManifest();
});

// BASE_PATH'i dinamik olarak al
const scriptPath = document.currentScript.src;
const BASE_PATH = new URL('.', scriptPath).pathname.replace(/curriculum\/$/, 'curriculum');


async function loadManifest() {
    try {
        const response = await fetch(`${BASE_PATH}/manifest.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const manifest = await response.json();
        renderCourseGroups(manifest.courseGroups);
    } catch (error) {
        console.error('Veri manifestosu yüklenemedi:', error);
        displayError('İçerikler Yüklenemedi', 'Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.');
    }
}

function displayError(title, message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-container">
                <h2>${title}</h2>
                <p>${message}</p>
            </div>
        `;
    }
}

function renderCourseGroups(courseGroups) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = ''; // Önceki içeriği temizle

    if (!courseGroups || courseGroups.length === 0) {
        mainContent.innerHTML = '<p class="loading-text">Gösterilecek ders bulunmuyor.</p>';
        return;
    }

    courseGroups.forEach(group => {
        const groupSection = document.createElement('section');
        groupSection.className = 'course-group';
        
        const groupTitle = document.createElement('h2');
        groupTitle.textContent = group.title;
        groupSection.appendChild(groupTitle);

        const courseList = document.createElement('div');
        courseList.className = 'course-list';
        groupSection.appendChild(courseList);

        group.courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <div class="course-card-header">
                    <h3>${course.title}</h3>
                    ${course.className ? `<span class="class-badge">${course.className}</span>` : ''}
                </div>
                <div class="unit-list"></div>
            `;
            courseList.appendChild(courseCard);

            courseCard.querySelector('.course-card-header').addEventListener('click', async () => {
                const unitList = courseCard.querySelector('.unit-list');
                if (!unitList || unitList.innerHTML !== '') {
                    unitList.innerHTML = ''; // Zaten açıksa kapat
                    courseCard.classList.remove('open');
                    return;
                }
                courseCard.classList.add('open');
                unitList.innerHTML = '<div class="loading-spinner"></div>';
                try {
                    const response = await fetch(`${BASE_PATH}/${course.file}`);
                    const courseDetails = await response.json();
                    renderUnits(unitList, courseDetails);
                } catch (e) {
                    unitList.innerHTML = '<p>Üniteler yüklenemedi.</p>';
                }
            });
        });

        mainContent.appendChild(groupSection);
    });
}


function renderUnits(container, course) {
    container.innerHTML = '';
    if (!course.units || course.units.length === 0) {
        container.innerHTML = '<p class="empty-text">Bu derse henüz ünite eklenmemiş.</p>';
        return;
    }

    course.units.forEach(unit => {
        const unitElement = document.createElement('div');
        unitElement.className = 'unit-item';
        
        let unitHTML = `
            <div class="unit-header">
                <h4>${unit.title}</h4>
        `;
        if (unit.htmlContent) {
            unitHTML += `<a href="ozetler.html?courseId=${course.id}&unitId=${unit.id}" class="unit-summary-link" onclick="event.stopPropagation()">Ünite Özeti</a>`;
        }
        unitHTML += `</div><div class="topic-list">`;
        
        if (unit.topics && unit.topics.length > 0) {
            unit.topics.forEach(topic => {
                unitHTML += `
                    <div class="topic-item">
                        <span>${topic.title}</span>
                        <div class="topic-links">
                            <a href="yazilacaklar.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}" class="topic-link yazilacaklar">Notlar</a>
                            <a href="oyun.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}" class="topic-link oyun">Oyunlar</a>
                        </div>
                    </div>
                `;
            });
        } else {
            unitHTML += '<p class="empty-text">Bu ünitede konu bulunmuyor.</p>';
        }

        unitHTML += '</div>';
        unitElement.innerHTML = unitHTML;
        container.appendChild(unitElement);
    });
}
