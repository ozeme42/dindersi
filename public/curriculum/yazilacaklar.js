document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('main-content');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-container');
    const pageTitleH2 = document.getElementById('page-title');
    const topicInfoSpan = document.getElementById('topic-info');

    const showLoading = (message) => {
        if (loadingDiv) {
            loadingDiv.style.display = 'flex';
            loadingDiv.querySelector('p').textContent = message;
        }
        if (mainContent) mainContent.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
    };

    const showError = (message) => {
        if (errorDiv) {
            errorDiv.style.display = 'flex';
            errorDiv.querySelector('p').textContent = message;
        }
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
    };

    const showContent = () => {
        if (mainContent) mainContent.style.display = 'block';
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
    };

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const topicId = urlParams.get('topicId');
        const topicName = urlParams.get('topicName');
        const courseName = urlParams.get('courseName');
        const unitName = urlParams.get('unitName');

        if (!topicId) {
            throw new Error("Konu bilgisi bulunamadı.");
        }
        
        if(pageTitleH2) pageTitleH2.textContent = topicName || 'Yazılacaklar';
        if(topicInfoSpan) topicInfoSpan.textContent = `${courseName} > ${unitName}`;

        showLoading('Yazılacaklar içeriği yükleniyor...');
        
        const response = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
        
        if (!response.ok) {
            if (response.status === 404) {
                 throw new Error("Bu konu için 'Yazılacaklar' içeriği henüz oluşturulmamış.");
            }
            throw new Error(`Veri dosyası yüklenemedi: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (!data || (!data.conceptDefinitions && !data.notes)) {
            throw new Error("İçerik formatı geçersiz veya boş.");
        }
        
        let kavramlarHtml = '<h2>Kavramlar ve Tanımları</h2>';
        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            kavramlarHtml += '<div class="grid">';
            data.conceptDefinitions.forEach(item => {
                kavramlarHtml += `
                    <div class="card">
                        <h3>${item.concept}</h3>
                        <p>${item.definition}</p>
                    </div>
                `;
            });
            kavramlarHtml += '</div>';
        } else {
            kavramlarHtml += '<p class="no-content">Bu konu için kavram bulunmuyor.</p>';
        }

        let notlarHtml = '<h2>Önemli Notlar</h2>';
        if (data.notes && data.notes.length > 0) {
            notlarHtml += '<div class="notes-list">';
            data.notes.forEach(note => {
                notlarHtml += `<div class="note-item">${note}</div>`;
            });
            notlarHtml += '</div>';
        } else {
            notlarHtml += '<p class="no-content">Bu konu için not bulunmuyor.</p>';
        }

        if (mainContent) {
            mainContent.innerHTML = kavramlarHtml + notlarHtml;
        }

        showContent();

    } catch (error) {
        console.error('Hata:', error);
        showError(error.message);
    }
});
