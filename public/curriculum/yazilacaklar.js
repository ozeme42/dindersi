
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const container = document.getElementById('content-container');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    if (!container || !loadingDiv || !errorDiv) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        return;
    }

    if (!topicId) {
        showError("Konu bilgisi eksik.");
        return;
    }
    
    function showError(message) {
        loadingDiv.style.display = 'none';
        errorDiv.innerHTML = `<p>${message}</p>`;
        errorDiv.style.display = 'block';
    }

    showLoading("İçerik yükleniyor...");

    fetch(`yazilacaklar/${topicId}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Veri dosyası bulunamadı (HTTP ${response.status}).`);
            }
            return response.json();
        })
        .then(data => {
            loadingDiv.style.display = 'none';
            renderContent(data);
        })
        .catch(error => {
            console.error("Yazılacaklar verisi yüklenirken hata:", error);
            showError(`İçerik yüklenemedi: ${error.message}`);
        });

    function renderContent(data) {
        let html = '';

        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            html += '<section class="content-section">';
            html += '<h2>Kavramlar ve Tanımları</h2>';
            html += '<dl class="definitions-list">';
            data.conceptDefinitions.forEach(item => {
                html += `<dt>${item.concept}</dt><dd>${item.definition}</dd>`;
            });
            html += '</dl>';
            html += '</section>';
        }

        if (data.notes && data.notes.length > 0) {
            html += '<section class="content-section">';
            html += '<h2>Önemli Notlar</h2>';
            html += '<ul class="notes-list">';
            data.notes.forEach(note => {
                html += `<li>${note}</li>`;
            });
            html += '</ul>';
            html += '</section>';
        }

        if (html === '') {
            container.innerHTML = '<p>Bu konu için yazılacaklar içeriği bulunmuyor.</p>';
        } else {
            container.innerHTML = html;
        }
    }
    
    function showLoading(message) {
        errorDiv.style.display = 'none';
        loadingDiv.innerHTML = `<div class="loader"></div><p>${message}</p>`;
        loadingDiv.style.display = 'flex';
    }
});
