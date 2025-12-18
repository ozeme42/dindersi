// Gerekli DOM elementlerini seçme
const mainContent = document.getElementById('main-content');
const loadingScreen = document.getElementById('loading-screen');
const errorScreen = document.getElementById('error-screen');
const errorMessage = document.getElementById('error-message');

// Oyun türlerini tanımlama (oyun.js'deki anahtarlarla eşleşmeli)
const activityTypes = [
    { key: 'kelime-avi', label: 'Kelime Avı' },
    { key: 'adam-asmaca', label: 'Adam Asmaca' },
];

function showLoading(message) {
    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (errorScreen) errorScreen.style.display = 'none';
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) loadingMessage.textContent = message;
}

function showError(message) {
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (errorScreen) errorScreen.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = message;
}

function showContent() {
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (errorScreen) errorScreen.style.display = 'none';
}

// Ana veri yükleme ve render etme fonksiyonu
async function initialize() {
    showLoading('İçerikler Yükleniyor...');
    try {
        const response = await fetch('/curriculum/manifest.json');
        if (!response.ok) {
            throw new Error('Ana veri dosyası (manifest.json) bulunamadı.');
        }
        const manifest = await response.json();

        renderCourseGroups(manifest.courseGroups);
        showContent();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Veri dosyaları yüklenirken bir sorun oluştu. Lütfen sayfanın doğru bir şekilde sunulduğundan emin olun.');
    }
}

// Ders gruplarını render etme
function renderCourseGroups(courseGroups) {
    if (!mainContent || !courseGroups) return;
    mainContent.innerHTML = ''; // Önceki içeriği temizle

    courseGroups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'course-group';
        
        const titleEl = document.createElement('h2');
        titleEl.textContent = group.title;
        groupEl.appendChild(titleEl);

        const coursesListEl = document.createElement('div');
        coursesListEl.className = 'courses-list';
        group.courses.forEach(course => {
            const courseEl = document.createElement('div');
            courseEl.className = 'course-item';
            courseEl.textContent = `${course.className}: ${course.title}`;
            courseEl.addEventListener('click', () => fetchAndRenderCourseDetails(course, groupEl));
            coursesListEl.appendChild(courseEl);
        });

        groupEl.appendChild(coursesListEl);
        mainContent.appendChild(groupEl);
    });
}

// Seçilen dersin detaylarını (üniteler ve konular) yükleme ve render etme
async function fetchAndRenderCourseDetails(courseInfo, groupEl) {
    // Diğer açık detayları kapat
    document.querySelectorAll('.course-details').forEach(el => el.remove());
    
    showLoading(`"${courseInfo.title}" dersi yükleniyor...`);
    try {
        const response = await fetch(`/curriculum/${courseInfo.file}`);
        if (!response.ok) {
            throw new Error(`Ders dosyası (${courseInfo.file}) bulunamadı.`);
        }
        const courseDetails = await response.json();
        
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'course-details';

        if (courseDetails.units && courseDetails.units.length > 0) {
            courseDetails.units.forEach(unit => {
                const unitEl = document.createElement('div');
                unitEl.className = 'unit-item';
                
                const unitTitle = document.createElement('h3');
                unitTitle.textContent = unit.title;
                unitEl.appendChild(unitTitle);

                const topicsList = document.createElement('ul');
                topicsList.className = 'topics-list';
                
                if (unit.topics && unit.topics.length > 0) {
                    unit.topics.forEach(topic => {
                        const topicItem = document.createElement('li');
                        topicItem.className = 'topic-item';
                        
                        const topicTitle = document.createElement('span');
                        topicTitle.textContent = topic.title;
                        topicItem.appendChild(topicTitle);

                        const linksContainer = document.createElement('div');
                        linksContainer.className = 'topic-links';

                        // Yazılacaklar linki
                        const yazilacaklarLink = document.createElement('a');
                        yazilacaklarLink.href = `yazilacaklar.html?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}`;
                        yazilacaklarLink.textContent = 'Notlar';
                        yazilacaklarLink.className = 'topic-link notes';
                        linksContainer.appendChild(yazilacaklarLink);
                        
                        // Oyun linkleri
                        activityTypes.forEach(game => {
                            const gameLink = document.createElement('a');
                            const urlParams = new URLSearchParams({
                                game: game.key,
                                topicId: topic.id,
                                topicName: topic.title,
                                courseName: courseInfo.title,
                                unitName: unit.title
                            });
                            gameLink.href = `oyun.html?${urlParams.toString()}`;
                            gameLink.textContent = game.label;
                            gameLink.className = 'topic-link game';
                            linksContainer.appendChild(gameLink);
                        });

                        topicItem.appendChild(linksContainer);
                        topicsList.appendChild(topicItem);
                    });
                } else {
                     topicsList.innerHTML = '<li>Bu ünite için konu bulunmuyor.</li>';
                }
                
                unitEl.appendChild(topicsList);
                detailsContainer.appendChild(unitEl);
            });
        } else {
            detailsContainer.innerHTML = '<p>Bu ders için ünite bulunmuyor.</p>';
        }

        groupEl.appendChild(detailsContainer);
        showContent();

    } catch (error) {
        console.error('Error fetching course details:', error);
        showError(error.message);
    }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', initialize);
