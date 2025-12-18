
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('content-container');
    const loadingText = document.querySelector('.loading-text');

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (document.querySelector('h1')) {
        document.querySelector('h1').textContent = decodeURIComponent(topicName || 'Yazılacaklar');
    }

    if (!topicId) {
        if (loadingText) loadingText.textContent = 'Hata: Konu bilgisi bulunamadı.';
        return;
    }

    try {
        const response = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
        if (!response.ok) {
            // Eğer özel yazılacaklar dosyası yoksa, activityItems'tan definitionları çekmeyi dene
            try {
                const activityResponse = await fetch(`/curriculum/activities/${topicId}.json`);
                if (!activityResponse.ok) throw new Error('Aktivite verisi de bulunamadı.');
                const items = await activityResponse.json();
                const definitions = items
                    .filter(item => item.type === 'definition' && item.content.term && item.content.definition)
                    .map(item => ({ concept: item.content.term, definition: item.content.definition }));

                if (definitions.length === 0) throw new Error('Bu konu için yazılacaklar içeriği bulunamadı.');

                renderContent({ conceptDefinitions: definitions, notes: [] }, container);

            } catch (activityError) {
                 throw new Error('Bu konu için yazılacaklar içeriği bulunamadı.');
            }
        } else {
            const data = await response.json();
            renderContent(data, container);
        }

        if (loadingText) loadingText.style.display = 'none';

    } catch (error) {
        console.error('İçerik yüklenirken hata:', error);
        if (loadingText) loadingText.textContent = 'İçerikler Yüklenemedi. Lütfen tekrar deneyin.';
    }
});

function renderContent(data, container) {
    let html = '';

    if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
        html += '<h2 class="category-title">Kavramlar ve Tanımları</h2>';
        html += '<div class="grid concepts">';
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
        html += '<h2 class="category-title">Önemli Notlar</h2>';
        html += '<div class="grid notes">';
        data.notes.forEach(note => {
            html += `
                <div class="card note-card">
                    <p>${note}</p>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (!html) {
        html = '<p class="loading-text">Bu konu için gösterilecek içerik bulunamadı.</p>';
    }

    container.innerHTML = html;
}
