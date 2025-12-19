document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    const backButton = document.getElementById('backButton');
    let currentView = 'groups'; // 'groups', 'courses', 'units'
    let selectedGroup = null;
    let selectedCourse = null;
    let manifestData = null;

    const showLoading = (isLoading) => {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = isLoading ? 'flex' : 'none';
        }
        mainContent.style.display = isLoading ? 'none' : 'block';
    };

    const showError = (message) => {
        mainContent.innerHTML = `<div class="error-message">${message}</div>`;
        showLoading(false);
    };

    const renderCourseGroups = (groups) => {
        currentView = 'groups';
        backButton.style.display = 'none';
        mainContent.innerHTML = '';
        if (!groups || groups.length === 0) {
            mainContent.innerHTML = '<p class="text-center text-gray-500">Gösterilecek ders grubu bulunmuyor.</p>';
            return;
        }

        groups.forEach(group => {
            if (group.courses && group.courses.length > 0) {
                const groupEl = document.createElement('div');
                groupEl.className = 'course-group';
                groupEl.innerHTML = `<h2>${group.name}</h2>`;
                const courseList = document.createElement('div');
                courseList.className = 'grid';
                
                // Use 'courses' key here
                group.courses.forEach(course => {
                    const courseEl = document.createElement('div');
                    courseEl.className = 'card course-card';
                    courseEl.innerHTML = `<h3>${course.title}</h3>`;
                    courseEl.addEventListener('click', () => {
                        selectedGroup = group;
                        selectedCourse = course;
                        renderUnits(course);
                    });
                    courseList.appendChild(courseEl);
                });
                groupEl.appendChild(courseList);
                mainContent.appendChild(groupEl);
            }
        });
    };

    const renderUnits = (course) => {
        currentView = 'units';
        backButton.style.display = 'block';
        mainContent.innerHTML = `<h2>${course.title}</h2>`;
        const unitList = document.createElement('div');
        unitList.className = 'grid';

        course.units.forEach(unit => {
            const unitEl = document.createElement('div');
            unitEl.className = 'card unit-card';
            unitEl.innerHTML = `<h3>${unit.title}</h3>`;
            unitEl.addEventListener('click', () => {
                selectedCourse = course; // Ensure course is set
                renderTopics(unit);
            });
            unitList.appendChild(unitEl);
        });
        mainContent.appendChild(unitList);
    };

    const renderTopics = (unit) => {
        currentView = 'topics';
        backButton.style.display = 'block';
        mainContent.innerHTML = `<h2>${unit.title}</h2>`;
        const topicList = document.createElement('div');
        topicList.className = 'topic-list';

        if (unit.hasUnitOzet) {
             const ozetEl = document.createElement('a');
             ozetEl.className = 'topic-item summary-link';
             ozetEl.href = `ozetler.html?courseId=${selectedCourse.id}&unitId=${unit.id}`;
             ozetEl.innerHTML = `<span>✨ ${unit.title} (Ünite Özeti)</span>`;
             topicList.appendChild(ozetEl);
        }

        unit.topics.forEach(topic => {
            const topicEl = document.createElement('div');
            topicEl.className = 'topic-item';
            topicEl.innerHTML = `<span>${topic.title}</span>`;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';
            
            if (topic.hasYazilacaklar) {
                const yazilacaklarBtn = document.createElement('a');
                yazilacaklarBtn.href = `yazilacaklar.html?courseId=${selectedCourse.id}&unitId=${unit.id}&topicId=${topic.id}`;
                yazilacaklarBtn.innerText = 'Notlar';
                yazilacaklarBtn.className = 'btn-note';
                buttonContainer.appendChild(yazilacaklarBtn);
            }

            if (topic.hasOzet) {
                const ozetBtn = document.createElement('a');
                ozetBtn.href = `ozetler.html?courseId=${selectedCourse.id}&unitId=${unit.id}&topicId=${topic.id}`;
                ozetBtn.innerText = 'Özet';
                ozetBtn.className = 'btn-summary';
                buttonContainer.appendChild(ozetBtn);
            }

            const oyunBtn = document.createElement('a');
            oyunBtn.href = `oyun.html?courseId=${selectedCourse.id}&unitId=${unit.id}&topicId=${topic.id}`;
            oyunBtn.innerText = 'Oyunlar';
            oyunBtn.className = 'btn-game';
            buttonContainer.appendChild(oyunBtn);
            
            topicEl.appendChild(buttonContainer);
            topicList.appendChild(topicEl);
        });

        mainContent.appendChild(topicList);
    };
    
    backButton.addEventListener('click', () => {
        if (currentView === 'topics') {
            renderUnits(selectedCourse);
        } else if (currentView === 'units') {
            renderCourseGroups(manifestData.courseGroups);
        }
    });

    // --- INITIAL FETCH ---
    showLoading(true);
    fetch('/curriculum/manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            manifestData = data;
            renderCourseGroups(data.courseGroups);
            showLoading(false);
        })
        .catch(error => {
            console.error('Fetch error:', error);
            showError('Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.');
        });
});
