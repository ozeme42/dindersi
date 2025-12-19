
document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');

    if (!gameContainer || !loadingIndicator || !errorContainer) {
        console.error("Gerekli HTML elementleri bulunamadı!");
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');

    if (!topicId) {
        showError("Oyun başlatılamadı: Konu bilgisi eksik.");
        return;
    }
    
    // Basit bir oyun mantığı: Şimdilik sadece soru listesi gösterelim
    fetch(`/curriculum/questions/${topicId}.json`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) throw new Error("Bu konu için soru bulunamadı.");
                throw new Error("Sorular yüklenirken bir ağ hatası oluştu.");
            }
            return response.json();
        })
        .then(questions => {
            loadingIndicator.style.display = 'none';
            if (questions.length === 0) {
                showError("Bu konu için hiç soru bulunmuyor.");
                return;
            }
            renderQuestions(questions);
        })
        .catch(error => {
            console.error("Oyun verisi yüklenirken hata:", error);
            showError(error.message);
        });

    function renderQuestions(questions) {
        gameContainer.innerHTML = '<h2>Bu Konudaki Sorular:</h2>';
        const list = document.createElement('ul');
        questions.forEach(q => {
            const listItem = document.createElement('li');
            listItem.textContent = q.text;
            list.appendChild(listItem);
        });
        gameContainer.appendChild(list);
    }
    
    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        loadingIndicator.style.display = 'none';
        gameContainer.style.display = 'none';
    }
});

    