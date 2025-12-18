// Gerekli DOM elementlerini seçme
const contentEl = document.getElementById('content');
const loadingEl = document.getElementById('loading-screen');
const errorEl = document.getElementById('error-screen');
const errorMessageEl = document.getElementById('error-message');
const topicTitleEl = document.getElementById('topic-title');


function showLoading(message) {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (contentEl) contentEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    const loadingMessageEl = document.getElementById('loading-message');
    if (loadingMessageEl) loadingMessageEl.textContent = message;
}

function showError(message) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'flex';
    if (errorMessageEl) errorMessageEl.textContent = message;
}

function showContent() {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
}


async function loadYazilacaklar() {
    showLoading('İçerik Yükleniyor...');
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (topicTitleEl) {
        topicTitleEl.textContent = topicName || 'Yazılacaklar';
    }

    if (!topicId) {
        showError("Konu bilgisi bulunamadı.");
        return;
    }

    try {
        const response = await fetch(`/curriculum/yazilacaklar/${topicId}.json`);
        if (!response.ok) {
            throw new Error('Bu konu için "Yazılacaklar" içeriği bulunamadı veya yüklenemedi.');
        }
        const data = await response.json();
        
        renderContent(data);
        showContent();

    } catch (error) {
        console.error('Error loading content:', error);
        showError(error.message);
    }
}

function renderContent(data) {
    if (!contentEl) return;
    contentEl.innerHTML = ''; // Clear previous content

    const kavramlarContainer = document.createElement('div');
    kavramlarContainer.id = 'kavramlar';
    kavramlarContainer.innerHTML = '<h2>Kavramlar ve Tanımları</h2>';

    if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
        data.conceptDefinitions.forEach(item => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `<h3>${item.concept}</h3><p>${item.definition}</p>`;
            kavramlarContainer.appendChild(div);
        });
    } else {
        kavramlarContainer.innerHTML += '<p class="empty-message">Bu konu için kavram ve tanım bulunmuyor.</p>';
    }

    const notlarContainer = document.createElement('div');
    notlarContainer.id = 'notlar';
    notlarContainer.innerHTML = '<h2>Önemli Notlar</h2>';

    if (data.notes && data.notes.length > 0) {
        const ul = document.createElement('ul');
        data.notes.forEach(note => {
            const li = document.createElement('li');
            li.innerHTML = note; // Notların HTML içerebileceğini varsayıyoruz
            ul.appendChild(li);
        });
        notlarContainer.appendChild(ul);
    } else {
        notlarContainer.innerHTML += '<p class="empty-message">Bu konu için önemli not bulunmuyor.</p>';
    }

    contentEl.appendChild(kavramlarContainer);
    contentEl.appendChild(notlarContainer);
}


document.addEventListener('DOMContentLoaded', loadYazilacaklar);
