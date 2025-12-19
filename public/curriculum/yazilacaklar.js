
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const loadingDiv = document.getElementById('loading');
    const mainContent = document.getElementById('mainContent');
    const errorDiv = document.getElementById('error');

    function showError(message) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = `Bir Hata Oluştu: ${message}`;
            errorDiv.style.display = 'block';
        }
        if (mainContent) mainContent.style.display = 'none';
    }

    if (!topicId) {
        showError("Konu bilgisi eksik.");
        return;
    }

    fetch(`/curriculum/yazilacaklar/${topicId}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Yazılacaklar içeriği bulunamadı.');
            }
            return response.json();
        })
        .then(data => {
            if (!data || (!data.notes && !data.conceptDefinitions)) {
                throw new Error("İçerik formatı geçersiz.");
            }

            if (mainContent) {
                mainContent.innerHTML = ''; // Clear previous content

                if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
                    const conceptsTitle = document.createElement('h2');
                    conceptsTitle.textContent = "Kavramlar ve Tanımları";
                    mainContent.appendChild(conceptsTitle);

                    data.conceptDefinitions.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'content-item';
                        div.innerHTML = `<strong>${item.concept}:</strong> ${item.definition}`;
                        mainContent.appendChild(div);
                    });
                }

                if (data.notes && data.notes.length > 0) {
                    const notesTitle = document.createElement('h2');
                    notesTitle.textContent = "Önemli Notlar";
                    mainContent.appendChild(notesTitle);

                    const ul = document.createElement('ul');
                    data.notes.forEach(note => {
                        const li = document.createElement('li');
                        li.className = 'content-item';
                        li.textContent = note;
                        ul.appendChild(li);
                    });
                    mainContent.appendChild(ul);
                }
                
                if (loadingDiv) loadingDiv.style.display = 'none';
                mainContent.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Yazılacaklar yüklenirken hata:", error);
            showError(error.message);
        });
});
