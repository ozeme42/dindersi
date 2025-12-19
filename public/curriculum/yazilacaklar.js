
document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('main-container');
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');
    
    if (!mainContainer || !loadingIndicator || !errorContainer) {
        console.error("Gerekli HTML elementleri bulunamadı!");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (!topicId) {
        showError("İçerik bulunamadı: Konu bilgisi eksik.");
        return;
    }
    
    document.title = topicName || "Yazılacaklar";
    const titleElement = document.getElementById('page-title');
    if(titleElement) titleElement.textContent = topicName || "Yazılacaklar";

    fetch(`/curriculum/yazilacaklar/${topicId}.json`)
        .then(response => {
             if (!response.ok) {
                if (response.status === 404) throw new Error("Bu konu için 'Yazılacaklar' içeriği bulunamadı.");
                throw new Error("İçerik yüklenirken bir ağ hatası oluştu.");
            }
            return response.json();
        })
        .then(data => {
            loadingIndicator.style.display = 'none';
            renderContent(data);
        })
        .catch(error => {
            console.error("Yazılacaklar verisi yüklenirken hata:", error);
            showError(error.message);
        });
        
    function renderContent(data) {
        if (!data || (!data.conceptDefinitions?.length && !data.notes?.length)) {
             showError("Bu konu için 'Yazılacaklar' içeriği bulunmuyor.");
             return;
        }

        const conceptsSection = document.createElement('div');
        conceptsSection.className = 'content-section';
        const conceptsTitle = document.createElement('h2');
        conceptsTitle.textContent = 'Kavramlar ve Tanımları';
        conceptsSection.appendChild(conceptsTitle);

        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            data.conceptDefinitions.forEach(item => {
                const div = document.createElement('div');
                div.className = 'item';
                div.innerHTML = `<strong>${item.concept}:</strong> ${item.definition}`;
                conceptsSection.appendChild(div);
            });
        } else {
            conceptsSection.innerHTML += '<p class="no-content-message">Bu konu için kavram bulunmuyor.</p>';
        }

        const notesSection = document.createElement('div');
        notesSection.className = 'content-section';
        const notesTitle = document.createElement('h2');
        notesTitle.textContent = 'Önemli Notlar';
        notesSection.appendChild(notesTitle);
        
        if (data.notes && data.notes.length > 0) {
            const list = document.createElement('ul');
            data.notes.forEach(note => {
                const listItem = document.createElement('li');
                listItem.className = 'item';
                listItem.textContent = note;
                list.appendChild(listItem);
            });
            notesSection.appendChild(list);
        } else {
            notesSection.innerHTML += '<p class="no-content-message">Bu konu için not bulunmuyor.</p>';
        }

        mainContainer.appendChild(conceptsSection);
        mainContainer.appendChild(notesSection);
    }
    
     function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
        mainContainer.style.display = 'none';
    }
});

    