
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const gameTypeParam = params.get('game'); // Use 'game' parameter
    const container = document.getElementById('game-container');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    if (!container || !loadingDiv || !errorDiv) {
        console.error("Gerekli HTML elemanları bulunamadı: #game-container, #loading, #error");
        return;
    }

    if (!topicId || !gameTypeParam) {
        showError("Oyun türü veya konu bilgisi eksik.");
        return;
    }

    function showError(message) {
        loadingDiv.style.display = 'none';
        errorDiv.innerHTML = `<p>${message}</p>`;
        errorDiv.style.display = 'block';
    }

    function showLoading(message) {
        errorDiv.style.display = 'none';
        loadingDiv.innerHTML = `<div class="loader"></div><p>${message}</p>`;
        loadingDiv.style.display = 'flex';
    }

    showLoading("Oyun verileri yükleniyor...");
    
    // --- OYUN MANTIKLARI ---

    // Adam Asmaca Oyunu
    async function startHangman() {
        try {
            const res = await fetch(`activities/${topicId}.json`);
            if (!res.ok) throw new Error('Veri dosyası bulunamadı.');
            const items = await res.json();
            const definitions = items.filter(item => 
                item.type === 'definition' &&
                item.content && item.content.term && item.content.definition &&
                !item.content.term.includes(' ') && item.content.term.length >= 4 && item.content.term.length <= 12
            );
            if (definitions.length === 0) throw new Error('Bu konu için Adam Asmaca uygun veri bulunamadı.');

            const wordData = definitions[Math.floor(Math.random() * definitions.length)].content;
            const word = wordData.term.toLocaleUpperCase('tr-TR');
            const hint = wordData.definition;
            
            let mistakes = 0;
            const guessedLetters = new Set();
            
            container.innerHTML = `
                <h2>Adam Asmaca</h2>
                <div id="hangman-drawing"></div>
                <div id="word-display" class="word-display"></div>
                <p id="hint" class="hint">${hint}</p>
                <div id="keyboard" class="keyboard"></div>
            `;
            
            const wordDisplay = document.getElementById('word-display');
            const keyboardDiv = document.getElementById('keyboard');
            
            function renderWord() {
                wordDisplay.innerHTML = word.split('').map(letter => 
                    `<span class="letter">${guessedLetters.has(letter) ? letter : '_'}</span>`
                ).join('');
            }
            
            function checkWin() {
                return word.split('').every(letter => guessedLetters.has(letter));
            }
            
            function handleGuess(letter) {
                if (guessedLetters.has(letter) || mistakes >= 6 || checkWin()) return;
                
                guessedLetters.add(letter);
                const button = document.querySelector(`button[data-letter="${letter}"]`);
                if (word.includes(letter)) {
                    button.classList.add('correct');
                } else {
                    button.classList.add('incorrect');
                    mistakes++;
                    updateHangmanDrawing();
                }
                renderWord();
                checkGameState();
            }

            function updateHangmanDrawing() {
                // Burada CSS ile adamı çizen sınıfları ekleyebilirsiniz.
                // Örneğin: document.getElementById('hangman-drawing').className = `mistakes-${mistakes}`;
            }

            function checkGameState() {
                if (checkWin()) {
                    keyboardDiv.innerHTML = `<p class="win">Kazandın! 🎉</p>`;
                } else if (mistakes >= 6) {
                    keyboardDiv.innerHTML = `<p class="lose">Kaybettin! Doğru kelime: ${word}</p>`;
                    // Reveal the word
                    guessedLetters.add(...word.split(''));
                    renderWord();
                }
            }

            'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('').forEach(letter => {
                const button = document.createElement('button');
                button.textContent = letter;
                button.dataset.letter = letter;
                button.addEventListener('click', () => handleGuess(letter));
                keyboardDiv.appendChild(button);
            });
            
            renderWord();
            loadingDiv.style.display = 'none';
        } catch (err) {
            showError(err.message);
        }
    }

    // Kelime Avı Oyunu
    async function startWordSearch() {
        showError("Kelime Avı oyunu henüz bu statik sürümde hazır değil.");
    }
    
    // Yönlendirme
    if (gameTypeParam === 'adam-asmaca') {
        startHangman();
    } else if (gameTypeParam === 'kelime-avi') {
        startWordSearch();
    } else {
        showError(`Bilinmeyen oyun türü: "${gameTypeParam}"`);
    }
});
