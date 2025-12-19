document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const titleElement = document.getElementById('title');
    const kavramlarContent = document.getElementById('kavramlar-content');
    const notlarContent = document.getElementById('notlar-content');
    const loadingMessage = document.getElementById('loading-message');

    if (!kavramlarContent || !notlarContent || !loadingMessage) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        if(loadingMessage) loadingMessage.textContent = 'Sayfa yapısı hatalı.';
        return;
    }

    if (!topicId) {
        loadingMessage.textContent = 'Konu bilgisi bulunamadı.';
        return;
    }
    
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Veri dosyası bulunamadı.');
        
        const data = await response.json();

        // Topic'i bul ve başlığı yaz
        let currentTopic = null;
        for (const course of data.courses) {
            for (const unit of course.units) {
                const foundTopic = unit.topics.find(t => t.id === topicId);
                if (foundTopic) {
                    currentTopic = foundTopic;
                    break;
                }
            }
            if (currentTopic) break;
        }

        if (titleElement && currentTopic) {
            titleElement.textContent = currentTopic.title;
        }

        // İlgili etkinlik verilerini bul
        const activitiesForTopic = data.activities.filter(a => a.topicId === topicId);
        
        const definitions = activitiesForTopic.filter(a => a.type === 'definition');
        const notes = activitiesForTopic.filter(a => a.type === 'sentence'); // Assuming notes are stored as 'sentence' type

        // Kavramları render et
        if (definitions.length > 0) {
            kavramlarContent.innerHTML = definitions.map(item => `
                <div class="item">
                    <h3>${item.content.term}</h3>
                    <p>${item.content.definition}</p>
                </div>
            `).join('');
        } else {
            kavramlarContent.innerHTML = '<p>Bu konu için kavram bulunamadı.</p>';
        }

        // Notları render et
        if (notes.length > 0) {
            notlarContent.innerHTML = notes.map(item => `
                <div class="item">
                    <p>${item.content.text}</p>
                </div>
            `).join('');
        } else {
            notlarContent.innerHTML = '<p>Bu konu için not bulunamadı.</p>';
        }

        loadingMessage.style.display = 'none';
        document.getElementById('content').style.display = 'block';

    } catch (error) {
        console.error("Yazılacaklar içeriği yüklenirken hata:", error);
        loadingMessage.textContent = 'İçerik yüklenemedi.';
    }
});
