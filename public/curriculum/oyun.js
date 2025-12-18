document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicId = urlParams.get('topicId');

    if (!topicId) {
        displayError("Konu Belirtilmedi", "Oyunları görüntülemek için bir konu seçmelisiniz.");
        return;
    }

    loadGameData(topicId);
});

// BASE_PATH'i dinamik olarak al
const scriptPath = document.currentScript.src;
const BASE_PATH = new URL('.', scriptPath).pathname.replace(/curriculum\/$/, 'curriculum');


async function loadGameData(topicId) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    
    try {
        const [questionsRes, activitiesRes] = await Promise.all([
            fetch(`${BASE_PATH}/questions/${topicId}.json`).catch(() => ({ ok: false })),
            fetch(`${BASE_PATH}/activities/${topicId}.json`).catch(() => ({ ok: false }))
        ]);

        const questions = questionsRes.ok ? await questionsRes.json() : [];
        const activities = activitiesRes.ok ? await activitiesRes.json() : [];

        renderGameMenu(questions, activities);

    } catch (error) {
        console.error('Oyun verileri yüklenemedi:', error);
        displayError("Veri Yükleme Hatası", "Oyun verileri yüklenirken bir sorun oluştu.");
    }
}

function displayError(title, message) {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.innerHTML = `
            <div class="error-container">
                <h2>${title}</h2>
                <p>${message}</p>
                <a href="index.html" class="back-link">Ana Sayfaya Dön</a>
            </div>
        `;
    }
}

function renderGameMenu(questions, activities) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    gameContainer.innerHTML = '<h2>Oyun Seçin</h2>';

    const games = [];

    // Kelime Avı
    const concepts = activities.filter(a => a.type === 'concept' && a.content.text && a.content.text.length > 2 && a.content.text.length < 12 && !a.content.text.includes(' '));
    if (concepts.length >= 5) {
        games.push({ id: 'kelime-avi', name: 'Kelime Avı', data: concepts });
    }

    // Adam Asmaca
    const definitions = activities.filter(a => a.type === 'definition');
    if (definitions.length >= 3) {
         games.push({ id: 'adam-asmaca', name: 'Adam Asmaca', data: definitions });
    }
    
    // Diğer oyunlar buraya eklenebilir...
    
    if (games.length === 0) {
        gameContainer.innerHTML += '<p>Bu konu için uygun oyun bulunamadı.</p>';
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'game-menu';
    games.forEach(game => {
        const button = document.createElement('button');
        button.textContent = game.name;
        button.onclick = () => startGame(game.id, game.data);
        menu.appendChild(button);
    });
    gameContainer.appendChild(menu);
}

function startGame(gameId, data) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    gameContainer.innerHTML = `<h3>${gameId} Başlatılıyor...</h3>`;
    // Her oyunun kendi başlatma fonksiyonunu çağır
    if (gameId === 'kelime-avi') {
        startKelimeAvi(data);
    } else if (gameId === 'adam-asmaca') {
        startAdamAsmaca(data);
    }
}


function startKelimeAvi(concepts) {
     const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    // Kelime Avı oyun mantığı buraya gelecek...
    gameContainer.innerHTML = '<h1>Kelime Avı</h1><p>Bu oyun henüz hazır değil.</p>';
}

function startAdamAsmaca(definitions) {
     const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;
    // Adam Asmaca oyun mantığı buraya gelecek...
    gameContainer.innerHTML = '<h1>Adam Asmaca</h1><p>Bu oyun henüz hazır değil.</p>';
}
