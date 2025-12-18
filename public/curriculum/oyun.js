
document.addEventListener('DOMContentLoaded', async () => {
    const gameContainer = document.getElementById('game-container');
    const loadingText = document.querySelector('.loading-text');

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const gameType = params.get('gamePath') || 'kelime-avi'; // Default to a game

    if (!topicId) {
        if (loadingText) loadingText.textContent = 'Hata: Konu bilgisi bulunamadı.';
        return;
    }

    try {
        // KELİME AVI OYUNU MANTIĞI
        if (gameType === 'kelime-avi') {
            const response = await fetch(`/curriculum/activities/${topicId}.json`);
            if (!response.ok) throw new Error('Veri dosyası yüklenemedi.');
            const items = await response.json();
            const concepts = items.filter(item => item.type === 'concept').map(item => item.content.text.toLocaleUpperCase('tr-TR'));
            
            if (concepts.length < 3) {
                 if (loadingText) loadingText.textContent = 'Bu konu için yeterli kelime bulunamadı.';
                 return;
            }
            
            initializeWordSearch(gameContainer, concepts.slice(0, 10)); // Limit to 10 words
        } 
        // ADAM ASMACA OYUNU MANTIĞI
        else if (gameType === 'adam-asmaca') {
             const response = await fetch(`/curriculum/activities/${topicId}.json`);
             if (!response.ok) throw new Error('Veri dosyası yüklenemedi.');
             const items = await response.json();
             const definitions = items.filter(item => item.type === 'definition' && item.content.term && item.content.definition && !item.content.term.includes(' '));
             
             if (definitions.length === 0) {
                  if (loadingText) loadingText.textContent = 'Bu konu için uygun kelime bulunamadı.';
                  return;
             }
             initializeHangman(gameContainer, definitions);
        }
        // Diğer oyunlar buraya `else if` olarak eklenebilir.
        else {
             if (loadingText) loadingText.textContent = `Hata: '${gameType}' oyunu henüz hazır değil.`;
        }

    } catch (error) {
        console.error('Oyun yüklenirken hata:', error);
        if (loadingText) loadingText.textContent = 'İçerikler Yüklenemedi. Lütfen tekrar deneyin.';
    }
});


// ===================================
// KELİME AVI OYUNU FONKSİYONLARI
// ===================================
function initializeWordSearch(container, words) {
    container.innerHTML = `
        <h2>Kelime Avı</h2>
        <div id="word-search-wrapper">
            <div id="grid-container"></div>
            <div id="word-list"></div>
        </div>
    `;
    const gridContainer = document.getElementById('grid-container');
    const wordListContainer = document.getElementById('word-list');

    const gridSize = 12;
    let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
    const placedWords = [];

    // Kelimeleri yerleştir
    words.forEach(word => {
        // Logic to place words in grid...
        // This is complex, so we'll use a simplified placement for now
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 50) {
            const direction = Math.floor(Math.random() * 2); // 0: yatay, 1: dikey
            const row = Math.floor(Math.random() * gridSize);
            const col = Math.floor(Math.random() * gridSize);

            if (direction === 0 && col + word.length <= gridSize) { // Yatay
                let canPlace = true;
                for (let i = 0; i < word.length; i++) {
                    if (grid[row][col + i] !== '') {
                        canPlace = false;
                        break;
                    }
                }
                if (canPlace) {
                    for (let i = 0; i < word.length; i++) {
                        grid[row][col + i] = word[i];
                    }
                    placed = true;
                    placedWords.push(word);
                }
            } else if (direction === 1 && row + word.length <= gridSize) { // Dikey
                let canPlace = true;
                for (let i = 0; i < word.length; i++) {
                    if (grid[row + i][col] !== '') {
                        canPlace = false;
                        break;
                    }
                }
                if (canPlace) {
                    for (let i = 0; i < word.length; i++) {
                        grid[row + i][col] = word[i];
                    }
                    placed = true;
                     placedWords.push(word);
                }
            }
            attempts++;
        }
    });

    // Boşlukları doldur
    const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }

    // Grid'i render et
    grid.forEach(row => {
        row.forEach(letter => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = letter;
            gridContainer.appendChild(cell);
        });
    });
     gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

    // Kelime listesini render et
    placedWords.forEach(word => {
        const wordEl = document.createElement('div');
        wordEl.textContent = word;
        wordListContainer.appendChild(wordEl);
    });
}


// ===================================
// ADAM ASMACA OYUNU FONKSİYONLARI
// ===================================
function initializeHangman(container, definitions) {
    let currentWordIndex = 0;
    let wrongGuesses = 0;
    let correctLetters = [];

    const renderGame = () => {
        const currentDef = definitions[currentWordIndex];
        const word = currentDef.content.term.toLocaleUpperCase('tr-TR');
        const hint = currentDef.content.definition;

        container.innerHTML = `
            <h2>Adam Asmaca</h2>
            <div id="hangman-container">
                <div id="hangman-drawing"></div>
                <div id="hangman-word">
                    ${word.split('').map(letter => `<span class="letter ${correctLetters.includes(letter) ? 'visible' : ''}">${correctLetters.includes(letter) ? letter : '_'}</span>`).join('')}
                </div>
                <div id="hangman-hint">İpucu: ${hint}</div>
                <div id="keyboard"></div>
                <button id="next-word-btn" style="display: none;">Sonraki Kelime</button>
            </div>
        `;
        
        drawHangman(wrongGuesses);
        createKeyboard();
    };

    const drawHangman = (stage) => {
        const drawingEl = document.getElementById('hangman-drawing');
        drawingEl.innerHTML = `<svg viewBox="0 0 100 120">
            ${stage > 0 ? '<line x1="10" y1="110" x2="90" y2="110" stroke="white" />' : ''}
            ${stage > 1 ? '<line x1="30" y1="110" x2="30" y2="10" stroke="white" />' : ''}
            ${stage > 2 ? '<line x1="30" y1="10" x2="70" y2="10" stroke="white" />' : ''}
            ${stage > 3 ? '<line x1="70" y1="10" x2="70" y2="30" stroke="white" />' : ''}
            ${stage > 4 ? '<circle cx="70" cy="40" r="10" stroke="white" fill="none"/>' : ''}
            ${stage > 5 ? '<line x1="70" y1="50" x2="70" y2="80" stroke="white" />' : ''}
        </svg>`;
    };

    const createKeyboard = () => {
        const keyboardEl = document.getElementById('keyboard');
        'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('').forEach(letter => {
            const key = document.createElement('button');
            key.textContent = letter;
            key.addEventListener('click', () => handleGuess(letter));
            keyboardEl.appendChild(key);
        });
    };

    const handleGuess = (letter) => {
        const word = definitions[currentWordIndex].content.term.toLocaleUpperCase('tr-TR');
        if (word.includes(letter)) {
            correctLetters.push(letter);
        } else {
            wrongGuesses++;
        }
        checkGameState();
        renderGame();
    };

    const checkGameState = () => {
        const word = definitions[currentWordIndex].content.term.toLocaleUpperCase('tr-TR');
        const won = word.split('').every(l => correctLetters.includes(l));
        const lost = wrongGuesses >= 6;

        if (won || lost) {
            document.getElementById('keyboard').style.display = 'none';
            document.getElementById('next-word-btn').style.display = 'block';
            if(won) document.getElementById('hangman-hint').textContent = 'Tebrikler, bildiniz!';
            if(lost) document.getElementById('hangman-hint').textContent = `Kaybettiniz! Doğru kelime: ${word}`;
        }
    };
    
    document.addEventListener('click', (e) => {
        if(e.target && e.target.id === 'next-word-btn') {
            currentWordIndex = (currentWordIndex + 1) % definitions.length;
            wrongGuesses = 0;
            correctLetters = [];
            renderGame();
        }
    });

    renderGame();
}
