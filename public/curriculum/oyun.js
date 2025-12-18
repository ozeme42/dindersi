
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const gameType = params.get('game');
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    const gameTitleEl = document.getElementById('game-title');
    const gameContentEl = document.getElementById('game-content');
    const loadingEl = document.getElementById('loading');

    if (gameTitleEl) {
        gameTitleEl.textContent = `${topicName || 'Oyun'} - ${gameType || ''}`;
    }

    if (!gameType || !topicId || !gameContentEl || !loadingEl) {
        if(gameContentEl) gameContentEl.innerHTML = '<p class="error">Gerekli oyun bilgileri eksik.</p>';
        if(loadingEl) loadingEl.style.display = 'none';
        return;
    }

    // OYUN MANTIKLARI
    const loadKelimeAvi = async () => {
        try {
            const res = await fetch(`/curriculum/activities/${topicId}.json`);
            if (!res.ok) throw new Error('Veri dosyası bulunamadı.');
            const items = await res.json();
            const concepts = items.filter(item => item.type === 'concept').map(item => item.content.text.toUpperCase());
            
            if (concepts.length < 5) {
                throw new Error("Kelime Avı için en az 5 kavram gereklidir.");
            }
            
            gameContentEl.innerHTML = `<h2>Kelime Avı Başladı!</h2>`;
            // Kelime Avı oyununun tam mantığı buraya eklenebilir.
            // Bu kısım şimdilik basitleştirilmiştir.
            gameContentEl.innerHTML = `
                <h3>Aranacak Kelimeler</h3>
                <ul>${concepts.map(c => `<li>${c}</li>`).join('')}</ul>
                <p class="success-message">Oyun mantığı buraya eklenecek.</p>
            `;

        } catch (error) {
            gameContentEl.innerHTML = `<p class="error">Hata: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    };
    
    const loadAdamAsmaca = async () => {
        try {
            const res = await fetch(`/curriculum/activities/${topicId}.json`);
            if (!res.ok) throw new Error('Veri dosyası bulunamadı.');
            const items = await res.json();
            const definitions = items.filter(item => item.type === 'definition');
            
            if (definitions.length === 0) {
                throw new Error("Adam Asmaca için tanım verisi bulunamadı.");
            }

            // Adam asmaca oyun mantığı buraya eklenebilir.
            gameContentEl.innerHTML = `
                <h3>Adam Asmaca</h3>
                <p><strong>İpucu:</strong> ${definitions[0].content.definition}</p>
                <p><strong>Kelime:</strong> ${definitions[0].content.term.split('').map(() => '_ ').join('')}</p>
                 <p class="success-message">Oyun mantığı buraya eklenecek.</p>
            `;
        } catch(error) {
            gameContentEl.innerHTML = `<p class="error">Hata: ${error.message}</p>`;
        } finally {
            loadingEl.style.display = 'none';
        }
    };


    // Hangi oyunun yükleneceğini seç
    if (gameType.toLowerCase() === 'kelime avı') {
        loadKelimeAvi();
    } else if (gameType.toLowerCase() === 'adam asmaca') {
        loadAdamAsmaca();
    } else {
        gameContentEl.innerHTML = `<p class="error">"${gameType}" oyunu henüz desteklenmiyor.</p>`;
        loadingEl.style.display = 'none';
    }
});
