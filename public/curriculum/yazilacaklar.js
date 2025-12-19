document.addEventListener('DOMContentLoaded', () => {
    const loadingIndicator = document.getElementById('loading-indicator');
    const contentContainer = document.getElementById('content');
    const topicTitleEl = document.getElementById('topic-title');

    if (!loadingIndicator || !contentContainer || !topicTitleEl) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        document.body.innerHTML = '<p class="error-message">Sayfa yapılandırma hatası.</p>';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (!topicId || !topicName) {
        contentContainer.innerHTML = '<p class="error-message">Konu bilgisi eksik.</p>';
        loadingIndicator.style.display = 'none';
        contentContainer.style.display = 'block';
        return;
    }

    topicTitleEl.textContent = decodeURIComponent(topicName);
    
    const dataUrl = `yazilacaklar/${topicId}.json`;

    fetch(dataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Yazılacaklar verisi bulunamadı.');
            }
            return response.json();
        })
        .then(data => {
            renderContent(data);
            loadingIndicator.style.display = 'none';
            contentContainer.style.display = 'block';
        })
        .catch(error => {
            contentContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
            loadingIndicator.style.display = 'none';
            contentContainer.style.display = 'block';
        });

    function renderContent(data) {
        let html = '';

        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            html += '<h2>Kavramlar ve Tanımları</h2>';
            data.conceptDefinitions.forEach(item => {
                html += `
                    <div class="card">
                        <h3>${item.concept}</h3>
                        <p>${item.definition}</p>
                    </div>
                `;
            });
        }

        if (data.notes && data.notes.length > 0) {
            html += '<h2>Önemli Notlar</h2>';
            data.notes.forEach(note => {
                html += `
                    <div class="card">
                        <p>${note}</p>
                    </div>
                `;
            });
        }

        if (html === '') {
            html = '<p class="error-message">Bu konu için gösterilecek içerik bulunamadı.</p>';
        }

        contentContainer.innerHTML = html;
    }
});
