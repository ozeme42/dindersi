document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    document.getElementById('topic-title').textContent = topicName || 'Oyunlar';

    if (topicId) {
        loadGamesForTopic(topicId);
    } else {
        document.getElementById('game-list').innerHTML = '<p>Oyunları görmek için bir konu seçmelisiniz.</p>';
    }
});

async function loadGamesForTopic(topicId) {
    const gameListEl = document.getElementById('game-list');
    gameListEl.innerHTML = '<div class="loader"></div>';
    
    try {
        // YOL DÜZELTMESİ: /curriculum/ eklendi
        const questionsRes = await fetch(`/curriculum/questions/${topicId}.json`);
        // YOL DÜZELTMESİ: /curriculum/ eklendi
        const activitiesRes = await fetch(`/curriculum/activities/${topicId}.json`);
        
        const hasQuestions = questionsRes.ok;
        const hasActivities = activitiesRes.ok;

        if (!hasQuestions && !hasActivities) {
            throw new Error('Bu konu için oyun verisi bulunamadı.');
        }

        const allGames = [
            { name: 'Kelime Avı', type: 'activity', available: hasActivities },
            { name: 'Adam Asmaca', type: 'activity', available: hasActivities },
            { name: 'Eşleştirme', type: 'activity', available: hasActivities },
            { name: 'Cümle Oluşturma', type: 'activity', available: hasActivities },
            { name: 'Soru Çöz', type: 'question', available: hasQuestions },
        ];

        let gamesHtml = '';
        allGames.forEach(game => {
            if (game.available) {
                gamesHtml += `<a href="#" class="game-card" onclick="alert('Bu oyun henüz statik sitede aktif değil.');">${game.name}</a>`;
            }
        });
        
        if (gamesHtml === '') {
            gameListEl.innerHTML = '<p>Bu konu için uygun oyun bulunmuyor.</p>';
        } else {
            gameListEl.innerHTML = gamesHtml;
        }

    } catch (error) {
        console.error("Error loading game data:", error);
        gameListEl.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}
