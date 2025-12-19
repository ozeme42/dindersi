
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gameType = params.get('game');
    const topicId = params.get('topicId');
    const gameTitleEl = document.getElementById('gameTitle');
    const loadingDiv = document.getElementById('loading');
    const gameContainer = document.getElementById('gameContainer');
    const errorDiv = document.getElementById('error');

    function showError(message) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = `Bir Hata Oluştu: ${message}`;
            errorDiv.style.display = 'block';
        }
        if (gameContainer) gameContainer.innerHTML = '';
    }

    if (!gameType || !topicId) {
        showError("Oyun türü veya konu bilgisi eksik.");
        return;
    }
    
    if (gameTitleEl) {
        gameTitleEl.textContent = gameType.charAt(0).toUpperCase() + gameType.slice(1);
    }
    
    // Abstracted data fetching
    const fetchDataForGame = (dataType, topicId) => {
        return fetch(`/curriculum/${dataType}/${topicId}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Data for topic ${topicId} not found.`);
                }
                return response.json();
            });
    };

    const renderWordSearch = (words) => {
        if (!gameContainer || !words || words.length === 0) {
            showError("Kelime Avı için kelime bulunamadı.");
            return;
        }
        gameContainer.innerHTML = `<h2>Kelime Avı</h2><p>Bu oyun henüz hazır değil.</p>`;
        // TODO: Implement actual Word Search game logic and rendering
    };
    
    const renderHangman = (definitions) => {
        if (!gameContainer || !definitions || definitions.length === 0) {
            showError("Adam Asmaca için uygun veri (tanımlar) bulunamadı.");
            return;
        }
        gameContainer.innerHTML = `<h2>Adam Asmaca</h2><p>Bu oyun henüz hazır değil.</p>`;
        // TODO: Implement actual Hangman game logic and rendering
    };

    // Main game logic based on gameType
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (errorDiv) errorDiv.style.display = 'none';

    if (gameType === 'kelime-avi') {
        fetchDataForGame('activities', topicId)
            .then(data => {
                const concepts = data.filter(item => item.type === 'concept').map(item => item.content.text);
                renderWordSearch(concepts);
                if (loadingDiv) loadingDiv.style.display = 'none';
            })
            .catch(err => showError(err.message));
    } else if (gameType === 'adam-asmaca') {
        fetchDataForGame('activities', topicId)
            .then(data => {
                 const definitions = data.filter(item => item.type === 'definition');
                 renderHangman(definitions);
                 if (loadingDiv) loadingDiv.style.display = 'none';
            })
            .catch(err => showError(err.message));
    } else {
        showError(`Bilinmeyen oyun türü: ${gameType}`);
    }
});
