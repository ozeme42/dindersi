
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');

    function showError(message) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = `Hata: ${message}`;
            errorDiv.style.display = 'block';
        }
        console.error(message);
    }

    function createLink(href, text, isSpecial = false) {
        const a = document.createElement('a');
        a.href = href;
        a.className = `block p-4 rounded-lg transition-all ${isSpecial ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-600 hover:bg-yellow-500/20' : 'bg-slate-700/50 text-slate-200 border border-slate-600 hover:bg-slate-700'}`;
        a.innerHTML = `<span class="font-bold">${text}</span>`;
        return a;
    }

    function renderCourseGroups(data) {
        if (!data.courseGroups || !Array.isArray(data.courseGroups)) {
            showError('Manifest dosyasında "courseGroups" dizisi bulunamadı.');
            return;
        }

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (mainContent) mainContent.innerHTML = '';

        data.courseGroups.forEach(group => {
            if (!group.courses || group.courses.length === 0) return;

            const groupContainer = document.createElement('div');
            groupContainer.className = 'mb-8';

            const groupTitle = document.createElement('h2');
            groupTitle.className = 'text-2xl font-bold mb-4 text-cyan-400 border-b-2 border-cyan-400/30 pb-2';
            groupTitle.textContent = group.name;
            groupContainer.appendChild(groupTitle);

            const courseList = document.createElement('div');
            courseList.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

            group.courses.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.className = 'bg-slate-800 rounded-xl p-4 flex flex-col';

                const courseTitle = document.createElement('h3');
                courseTitle.className = 'text-lg font-bold text-white mb-3';
                courseTitle.textContent = course.title;
                courseCard.appendChild(courseTitle);

                const unitList = document.createElement('div');
                unitList.className = 'space-y-2 flex-grow';

                course.units.forEach(unit => {
                    const unitContainer = document.createElement('div');
                    
                    const unitTitle = document.createElement('p');
                    unitTitle.className = 'font-semibold text-slate-300 text-sm mb-2';
                    unitTitle.textContent = unit.title;
                    unitContainer.appendChild(unitTitle);

                    const topicLinks = document.createElement('div');
                    topicLinks.className = 'pl-4 border-l-2 border-slate-700 space-y-2';

                    if (unit.hasUnitOzet) {
                        const link = createLink(`ozetler.html?courseId=${course.id}&unitId=${unit.id}`, 'Ünite Özeti', true);
                        topicLinks.appendChild(link);
                    }

                    unit.topics.forEach(topic => {
                        const topicContainer = document.createElement('div');
                        
                        const topicP = document.createElement('p');
                        topicP.className = 'font-medium text-slate-400';
                        topicP.textContent = topic.title;
                        topicContainer.appendChild(topicP);

                        const linksContainer = document.createElement('div');
                        linksContainer.className = 'flex gap-2 mt-1';
                        if (topic.hasYazilacaklar) {
                            linksContainer.appendChild(createLink(`yazilacaklar.html?topicId=${topic.id}`, 'Notlar'));
                        }
                        if (topic.hasOzet) {
                             linksContainer.appendChild(createLink(`ozetler.html?courseId=${course.id}&unitId=${unit.id}&topicId=${topic.id}`, 'Özet'));
                        }
                        // Oyun linki, en az bir içerik varsa eklenir
                        if (topic.hasYazilacaklar || topic.hasOzet) {
                             linksContainer.appendChild(createLink(`oyun.html?topicId=${topic.id}`, 'Oyunlar'));
                        }
                        topicContainer.appendChild(linksContainer);

                        topicLinks.appendChild(topicContainer);
                    });
                    unitContainer.appendChild(topicLinks);
                    unitList.appendChild(unitContainer);
                });

                courseCard.appendChild(unitList);
                courseList.appendChild(courseCard);
            });

            groupContainer.appendChild(courseList);
            mainContent.appendChild(groupContainer);
        });
    }

    // Use a relative path, which is the most robust method.
    fetch('manifest.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderCourseGroups(data);
        })
        .catch(error => {
            showError(`Manifest dosyası yüklenemedi: ${error.message}`);
        });
});
