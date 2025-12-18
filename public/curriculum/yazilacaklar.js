document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    document.getElementById('topic-title').textContent = topicName || 'Yazılacaklar';

    if (topicId) {
        loadContentForTopic(topicId);
    } else {
        document.getElementById('content-container').innerHTML = '<p>İçerik görmek için bir konu seçmelisiniz.</p>';
    }
});

async function loadContentForTopic(topicId) {
    const contentContainer = document.getElementById('content-container');
    contentContainer.innerHTML = '<div class="loader"></div>';

    try {
        // YOL DÜZELTMESİ: /curriculum/ eklendi
        const res = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
        if (!res.ok) {
            throw new Error('Bu konu için "Yazılacaklar" içeriği bulunamadı.');
        }
        const data = await res.json();
        
        let html = '';
        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            html += '<h2>Kavramlar ve Tanımları</h2>';
            html += '<div class="grid concepts-grid">';
            data.conceptDefinitions.forEach(item => {
                html += `
                    <div class="card">
                        <h3>${item.concept}</h3>
                        <p>${item.definition}</p>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (data.notes && data.notes.length > 0) {
            html += '<h2 class="notes-title">Önemli Notlar</h2>';
            html += '<div class="grid notes-grid">';
            data.notes.forEach(note => {
                html += `
                    <div class="card note-card">
                        <p>${note}</p>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (html === '') {
            contentContainer.innerHTML = '<p>Bu konu için "Yazılacaklar" içeriği bulunmuyor.</p>';
        } else {
            contentContainer.innerHTML = html;
        }

    } catch (error) {
        console.error("Error loading content:", error);
        contentContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}
