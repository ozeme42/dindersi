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
    const topicName = params.get('topicName'); // URL'den ismi de alalım

    if (!topicId) {
        showError("İçerik bulunamadı: Konu bilgisi eksik.");
        return;
    }
    
    // Başlığı güncelle
    if(topicName) {
        document.title = topicName;
        const titleElement = document.getElementById('page-title');
        if(titleElement) titleElement.textContent = topicName;
    }

    // DİKKAT: Klasör yapısına göre path'i ayarlıyoruz
    fetch(`curriculum/yazilacaklar/${topicId}.json`)
        .then(response => {
             if (!response.ok) {
                if (response.status === 404) throw new Error("Bu konu için henüz not girişi yapılmamıştır.");
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
             showError("Bu konu için içerik boş görünüyor.");
             return;
        }

        // 1. Kavramlar Bölümü
        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            const conceptsSection = document.createElement('div');
            conceptsSection.className = 'content-section';
            
            const conceptsTitle = document.createElement('h2');
            conceptsTitle.textContent = 'Kavramlar ve Tanımları';
            conceptsSection.appendChild(conceptsTitle);

            data.conceptDefinitions.forEach(item => {
                const div = document.createElement('div');
                div.className = 'item';
                div.innerHTML = `<strong>${item.concept}:</strong> ${item.definition}`;
                conceptsSection.appendChild(div);
            });
            mainContainer.appendChild(conceptsSection);
        }

        // 2. Notlar Bölümü
        if (data.notes && data.notes.length > 0) {
            const notesSection = document.createElement('div');
            notesSection.className = 'content-section';
            
            const notesTitle = document.createElement('h2');
            notesTitle.textContent = 'Önemli Notlar';
            notesSection.appendChild(notesTitle);
            
            const list = document.createElement('ul');
            data.notes.forEach(note => {
                const listItem = document.createElement('li');
                listItem.className = 'item';
                listItem.textContent = note;
                list.appendChild(listItem);
            });
            notesSection.appendChild(list);
            mainContainer.appendChild(notesSection);
        }
    }
    
     function showError(message) {
        errorContainer.innerHTML = `⚠️ ${message}`;
        errorContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
        mainContainer.style.display = 'none';
    }
});