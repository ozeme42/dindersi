
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const titleEl = document.getElementById('topic-title');
    const container = document.getElementById('content-container');

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (titleEl) titleEl.textContent = topicName || 'Yazılacaklar';

    if (!topicId) {
        showError("Konu bilgisi bulunamadı.");
        return;
    }

    fetch(`/curriculum/yazilacaklar/${topicId}.json`)
        .then(res => {
            if (res.ok) {
                return res.json();
            }
            // 404 gibi durumlarda boş bir obje döndürerek hatayı yakala
            if (res.status === 404) {
                return {};
            }
            return Promise.reject('Veri dosyası yüklenemedi.');
        })
        .then(data => {
            if ((!data.conceptDefinitions || data.conceptDefinitions.length === 0) && (!data.notes || data.notes.length === 0)) {
                showError("Bu konu için 'Yazılacaklar' içeriği bulunamadı.");
                return;
            }

            let html = '';

            // Kavramlar Bölümü
            if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
                html += '<div class="yazilacaklar-section">';
                html += '<h2>Kavramlar ve Tanımları</h2>';
                html += '<div class="definitions-grid">';
                data.conceptDefinitions.forEach(item => {
                    html += `
                        <div class="card definition-card">
                            <h3>${item.concept}</h3>
                            <p>${item.definition}</p>
                        </div>
                    `;
                });
                html += '</div></div>';
            }

            // Notlar Bölümü
            if (data.notes && data.notes.length > 0) {
                html += '<div class="yazilacaklar-section">';
                html += '<h2>Önemli Notlar</h2>';
                html += '<ul class="notes-list">';
                data.notes.forEach(note => {
                    html += `<li class="card note-card">${note}</li>`;
                });
                html += '</ul></div>';
            }

            if (container) container.innerHTML = html;
            if (loadingScreen) loadingScreen.classList.remove('loading-active');
        })
        .catch(error => showError(error.toString()));

    function showError(message) {
        if (container) container.innerHTML = `<div class="error-message">${message}</div>`;
        if (loadingScreen) loadingScreen.classList.remove('loading-active');
    }
});
