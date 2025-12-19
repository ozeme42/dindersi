
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const breadcrumbsContainer = document.getElementById('breadcrumbs');

    let allCourseGroups = [];

    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.classList.remove('hidden');
            mainContent.classList.add('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
            mainContent.classList.remove('hidden');
        }
    }

    function showError(title, message) {
        mainContent.innerHTML = `
            <div class="text-center text-red-400">
                <h2 class="text-2xl font-bold">${title}</h2>
                <p>${message}</p>
            </div>
        `;
    }

    function renderCourseGroups(groups) {
        mainContent.innerHTML = ''; // Clear previous content
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

        groups.forEach(group => {
            const groupCard = document.createElement('div');
            groupCard.className = 'bg-slate-800 rounded-2xl p-6 border border-slate-700';
            
            const groupTitle = document.createElement('h2');
            groupTitle.className = 'text-2xl font-bold text-cyan-400 mb-4';
            groupTitle.textContent = group.title;
            groupCard.appendChild(groupTitle);

            const courseList = document.createElement('div');
            courseList.className = 'space-y-3';
            
            // DÜZELTME: group.courses yerine group.dersler kullanıldı
            if (group.dersler && group.dersler.length > 0) {
                 group.dersler.forEach(course => {
                    const courseLink = document.createElement('a');
                    courseLink.href = '#';
                    courseLink.className = 'block p-3 bg-slate-700/50 rounded-lg hover:bg-slate-600 transition-colors';
                    courseLink.textContent = `${course.className || ''} - ${course.title}`;
                    courseLink.onclick = (e) => {
                        e.preventDefault();
                        fetchCourseDetails(course.file, group.title, course.title);
                    };
                    courseList.appendChild(courseLink);
                });
            }

            groupCard.appendChild(courseList);
            grid.appendChild(groupCard);
        });
        mainContent.appendChild(grid);
        updateBreadcrumbs(null);
    }
    
    async function fetchCourseDetails(courseFile, groupTitle, courseTitle) {
        showLoading(true);
        try {
            const response = await fetch(`/curriculum/${courseFile}`);
            if (!response.ok) throw new Error('Ders detayı yüklenemedi.');
            const course = await response.json();
            renderUnitList(course, groupTitle, courseTitle);
        } catch (error) {
            showError('Hata', error.message);
        } finally {
            showLoading(false);
        }
    }

    function renderUnitList(course, groupTitle, courseTitle) {
        mainContent.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

        course.units.forEach(unit => {
            const unitCard = document.createElement('div');
            unitCard.className = 'bg-slate-800 rounded-2xl p-6 border border-slate-700';
            const unitTitle = document.createElement('h3');
            unitTitle.className = 'text-xl font-bold text-emerald-400 mb-3';
            unitTitle.textContent = unit.title;
            unitCard.appendChild(unitTitle);

            const topicList = document.createElement('ul');
            topicList.className = 'space-y-2';
            unit.topics.forEach(topic => {
                const topicItem = document.createElement('li');
                topicItem.className = 'flex justify-between items-center bg-slate-700/50 p-2 rounded-md';
                const topicLink = document.createElement('span');
                topicLink.textContent = topic.title;
                topicItem.appendChild(topicLink);

                const actions = document.createElement('div');
                actions.className = 'flex gap-2';

                if (topic.htmlContent) {
                     const ozetLink = document.createElement('a');
                     ozetLink.href = `ozetler.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}`;
                     ozetLink.textContent = 'Özet';
                     ozetLink.className = 'text-xs bg-amber-600 px-2 py-1 rounded';
                     actions.appendChild(ozetLink);
                }

                const oyunLink = document.createElement('a');
                oyunLink.href = `oyun.html?game=kelime-avi&topicId=${topic.id}`;
                oyunLink.textContent = 'Oyun';
                oyunLink.className = 'text-xs bg-rose-600 px-2 py-1 rounded';
                actions.appendChild(oyunLink);
                
                topicItem.appendChild(actions);
                topicList.appendChild(topicItem);
            });
            unitCard.appendChild(topicList);
            grid.appendChild(unitCard);
        });

        mainContent.appendChild(grid);
        updateBreadcrumbs({ group: groupTitle, course: courseTitle });
    }

    function updateBreadcrumbs(selection) {
        breadcrumbsContainer.innerHTML = '';
        const homeLink = document.createElement('a');
        homeLink.href = '#';
        homeLink.textContent = 'Ana Sayfa';
        homeLink.className = 'hover:underline';
        homeLink.onclick = (e) => { e.preventDefault(); renderCourseGroups(allCourseGroups); };
        breadcrumbsContainer.appendChild(homeLink);

        if (selection?.group) {
            const separator1 = document.createElement('span');
            separator1.textContent = ' / ';
            separator1.className = 'mx-2';
            breadcrumbsContainer.appendChild(separator1);
            const groupSpan = document.createElement('span');
            groupSpan.textContent = selection.group;
            breadcrumbsContainer.appendChild(groupSpan);
        }
        if (selection?.course) {
            const separator2 = document.createElement('span');
            separator2.textContent = ' / ';
            separator2.className = 'mx-2';
            breadcrumbsContainer.appendChild(separator2);
            const courseSpan = document.createElement('span');
            courseSpan.textContent = selection.course;
            breadcrumbsContainer.appendChild(courseSpan);
        }
    }

    async function init() {
        showLoading(true);
        try {
            const response = await fetch('/curriculum/manifest.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            allCourseGroups = data.courseGroups;
            renderCourseGroups(allCourseGroups);
        } catch (error) {
            showError('İçerikler Yükleniyor...', 'Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.');
            console.error('Error loading initial data:', error);
        } finally {
            showLoading(false);
        }
    }

    init();
});
