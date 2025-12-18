
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    const titleEl = document.getElementById('title');
    const kavramlarContentEl = document.getElementById('kavramlar-content');
    const notlarContentEl = document.getElementById('notlar-content');
    const loadingEl = document.getElementById('loading');

    if (titleEl) {
        titleEl.textContent = topicName || 'Yazılacaklar';
    }

    if (!topicId || !kavramlarContentEl || !notlarContentEl || !loadingEl) {
        if (kavramlarContentEl) kavramlarContentEl.innerHTML = '<p class="error">Gerekli bilgiler eksik.</p>';
        if (loadingEl) loadingEl.style.display = 'none';
        return;
    }

    const fetchContent = async () => {
        try {
            const res = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
            if (!res.ok) {
                 throw new Error('İçerik dosyası bulunamadı. Lütfen yöneticinizle iletişime geçin.');
            }
            const data = await res.json();

            // Kavramlar ve Tanımlar
            if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
                kavramlarContentEl.innerHTML = data.conceptDefinitions.map((item, index) => `
                    <div class="card">
                        <h3>${index + 1}. ${item.concept}</h3>
                        <p>${item.definition}</p>
                    </div>
                `).join('');
            } else {
                kavramlarContentEl.innerHTML = '<p class="info">Bu konu için tanımlanmış kavram bulunmuyor.</p>';
            }

            // Önemli Notlar
            if (data.notes && data.notes.length > 0) {
                notlarContentEl.innerHTML = data.notes.map((note, index) => `
                    <div class="card">
                        <p>${note}</p>
                    </div>
                `).join('');
            } else {
                notlarContentEl.innerHTML = '<p class="info">Bu konu için eklenmiş not bulunmuyor.</p>';
            }

        } catch (error) {
            kavramlarContentEl.innerHTML = `<p class="error">Hata: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    };

    fetchContent();
});
