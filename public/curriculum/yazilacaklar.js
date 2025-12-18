document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicId = urlParams.get('topicId');

    if (!topicId) {
        displayError("Konu Belirtilmedi", "İçeriği görüntülemek için bir konu seçmelisiniz.");
        return;
    }
    loadContent(topicId);
});

// BASE_PATH'i dinamik olarak al
const scriptPath = document.currentScript.src;
const BASE_PATH = new URL('.', scriptPath).pathname.replace(/curriculum\/$/, 'curriculum');


async function loadContent(topicId) {
    try {
        const response = await fetch(`${BASE_PATH}/yazilacaklar/${topicId}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        renderContent(data);
    } catch (error) {
        console.error('Yazılacaklar içeriği yüklenemedi:', error);
        displayError('İçerik Yüklenemedi', 'Bu konu için "Yazılacaklar" içeriği bulunamadı veya yüklenirken bir hata oluştu.');
    }
}

function displayError(title, message) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-container">
                <h2>${title}</h2>
                <p>${message}</p>
                <a href="index.html" class="back-link">Ana Sayfaya Dön</a>
            </div>
        `;
    }
}

function renderContent(data) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    let html = '';

    if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
        html += '<h2>Kavramlar ve Tanımları</h2>';
        html += '<div class="definitions-grid">';
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
        html += '<h2>Önemli Notlar</h2>';
        html += '<div class="notes-list">';
        data.notes.forEach(note => {
            html += `<div class="note-item">${note}</div>`;
        });
        html += '</div>';
    }

    if (html === '') {
        displayError('İçerik Bulunamadı', 'Bu konu için "Yazılacaklar" içeriği bulunmuyor.');
    } else {
        mainContent.innerHTML = html;
    }
}
