
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const gameTitleEl = document.getElementById('game-title');
    const gameSubtitleEl = document.getElementById('game-subtitle');
    const gameContainer = document.getElementById('game-container');

    const params = new URLSearchParams(window.location.search);
    const gameType = params.get('game');
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');
    
    if (gameTitleEl) gameTitleEl.textContent = gameType || 'Etkinlik';
    if (gameSubtitleEl) gameSubtitleEl.textContent = topicName || '';

    if (!gameType || !topicId) {
        showError("Oyun tipi veya konu bilgisi eksik.");
        return;
    }

    // Basit bir oyun motoru
    switch (gameType) {
        case 'Kelime Avı':
            renderWordSearch(topicId);
            break;
        case 'Adam Asmaca':
            renderHangman(topicId);
            break;
        // Diğer oyunlar buraya eklenebilir
        default:
            showError(`"${gameType}" adlı oyun henüz oluşturulmadı.`);
    }

    function showError(message) {
        if (gameContainer) gameContainer.innerHTML = `<div class="error-message">${message}</div>`;
        if (loadingScreen) loadingScreen.classList.remove('loading-active');
    }

    // --- KELİME AVI OYUNU ---
    function renderWordSearch(topicId) {
        fetch(`/curriculum/activities/${topicId}.json`)
            .then(res => res.ok ? res.json() : Promise.reject('Veri dosyası bulunamadı.'))
            .then(items => {
                const concepts = items.filter(item => item.type === 'concept' && item.content.text && !item.content.text.includes(' '))
                                     .map(item => item.content.text.toLocaleUpperCase('tr-TR'));
                if (concepts.length < 3) {
                    showError("Kelime Avı için en az 3 uygun kelime bulunamadı.");
                    return;
                }
                
                // Basit bir grid oluşturma (Daha gelişmiş bir algoritma kullanılabilir)
                const gridSize = 12;
                let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
                const placedWords = [];

                // Kelimeleri yerleştir (sadece yatay ve dikey)
                for (const word of concepts) {
                    if (word.length > gridSize) continue;
                    const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    let placed = false;
                    for (let i = 0; i < 10; i++) { // 10 deneme
                        if (direction === 'horizontal') {
                            const row = Math.floor(Math.random() * gridSize);
                            const col = Math.floor(Math.random() * (gridSize - word.length));
                            let canPlace = true;
                            for (let j = 0; j < word.length; j++) {
                                if (grid[row][col + j] !== '') canPlace = false;
                            }
                            if (canPlace) {
                                for (let j = 0; j < word.length; j++) grid[row][col + j] = word[j];
                                placedWords.push(word);
                                placed = true;
                                break;
                            }
                        } else { // vertical
                            const row = Math.floor(Math.random() * (gridSize - word.length));
                            const col = Math.floor(Math.random() * gridSize);
                             let canPlace = true;
                            for (let j = 0; j < word.length; j++) {
                                if (grid[row + j][col] !== '') canPlace = false;
                            }
                            if (canPlace) {
                                for (let j = 0; j < word.length; j++) grid[row + j][col] = word[j];
                                placedWords.push(word);
                                placed = true;
                                break;
                            }
                        }
                    }
                    if (placedWords.length >= 8) break; // Maksimum 8 kelime
                }
                
                // Boşlukları doldur
                const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
                for (let r = 0; r < gridSize; r++) {
                    for (let c = 0; c < gridSize; c++) {
                        if (grid[r][c] === '') {
                            grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                        }
                    }
                }
                
                // HTML'e render et
                gameContainer.innerHTML = `
                    <div class="word-search-container">
                        <div class="word-search-grid" style="--grid-size: ${gridSize}">
                            ${grid.flat().map(letter => `<div>${letter}</div>`).join('')}
                        </div>
                        <div class="word-search-list">
                            <h3>Aranacak Kelimeler</h3>
                            <ul>${placedWords.map(word => `<li>${word}</li>`).join('')}</ul>
                        </div>
                    </div>
                `;
                if (loadingScreen) loadingScreen.classList.remove('loading-active');
            })
            .catch(error => showError(error.toString()));
    }
    
    // --- ADAM ASMACA OYUNU ---
    function renderHangman(topicId) {
        fetch(`/curriculum/activities/${topicId}.json`)
             .then(res => res.ok ? res.json() : Promise.reject('Veri dosyası bulunamadı.'))
             .then(items => {
                 const definitions = items.filter(item => item.type === 'definition' && item.content.term && item.content.definition && !item.content.term.includes(' '));
                 if (definitions.length === 0) {
                     showError("Adam Asmaca için uygun tanım/kelime bulunamadı.");
                     return;
                 }

                 let currentWordIndex = 0;
                 let mistakes = 0;
                 let guessedLetters = new Set();

                 const renderCurrentState = () => {
                     const currentItem = definitions[currentWordIndex];
                     const word = currentItem.content.term.toLocaleUpperCase('tr-TR');
                     const hint = currentItem.content.definition;

                     const wordDisplay = word.split('').map(letter => (guessedLetters.has(letter) ? letter : '_')).join(' ');

                     gameContainer.innerHTML = `
                        <div class="hangman-container">
                            <div class="hangman-drawing">
                                <!-- SVG for hangman drawing will go here -->
                                <svg viewBox="0 0 100 120">
                                    <line x1="10" y1="110" x2="90" y2="110" stroke="white" stroke-width="4"/>
                                    <line x1="30" y1="110" x2="30" y2="10" stroke="white" stroke-width="4"/>
                                    <line x1="30" y1="10" x2="70" y2="10" stroke="white" stroke-width="4"/>
                                    <line x1="70" y1="10" x2="70" y2="20" stroke="white" stroke-width="4"/>
                                    ${mistakes > 0 ? '<circle cx="70" cy="30" r="10" stroke="cyan" stroke-width="3" fill="none"/>' : ''}
                                    ${mistakes > 1 ? '<line x1="70" y1="40" x2="70" y2="70" stroke="cyan" stroke-width="3"/>' : ''}
                                    ${mistakes > 2 ? '<line x1="70" y1="50" x2="55" y2="60" stroke="cyan" stroke-width="3"/>' : ''}
                                    ${mistakes > 3 ? '<line x1="70" y1="50" x2="85" y2="60" stroke="cyan" stroke-width="3"/>' : ''}
                                    ${mistakes > 4 ? '<line x1="70" y1="70" x2="55" y2="90" stroke="cyan" stroke-width="3"/>' : ''}
                                    ${mistakes > 5 ? '<line x1="70" y1="70" x2="85" y2="90" stroke="cyan" stroke-width="3"/>' : ''}
                                </svg>
                            </div>
                            <div class="hangman-game">
                                <p class="hangman-hint">${hint}</p>
                                <div class="hangman-word">${wordDisplay}</div>
                                <div class="hangman-keyboard">
                                    ${"ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split('').map(letter => `
                                        <button class="keyboard-btn" data-letter="${letter}">${letter}</button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                     `;
                     
                     // Klavye event'lerini ekle
                     document.querySelectorAll('.keyboard-btn').forEach(btn => {
                         btn.addEventListener('click', (e) => {
                             const letter = (e.target as HTMLElement).dataset.letter;
                             if(letter) handleGuess(letter);
                         });
                         if(guessedLetters.has(btn.textContent)) {
                             (btn as HTMLButtonElement).disabled = true;
                         }
                     });
                 };

                 const handleGuess = (letter: string) => {
                     if (guessedLetters.has(letter) || mistakes >= 6) return;
                     
                     guessedLetters.add(letter);
                     const word = definitions[currentWordIndex].content.term.toLocaleUpperCase('tr-TR');

                     if (!word.includes(letter)) {
                         mistakes++;
                     }
                     
                     const wordDisplay = word.split('').map(l => (guessedLetters.has(l) ? l : '_')).join('');
                     if (!wordDisplay.includes('_')) { // Kelime bulundu
                         setTimeout(() => {
                             alert('Tebrikler, doğru kelime!');
                             nextWord();
                         }, 500);
                     } else if (mistakes >= 6) {
                         setTimeout(() => {
                            alert(`Kaybettiniz! Doğru kelime: ${word}`);
                            nextWord();
                         }, 500);
                     }
                     renderCurrentState();
                 };
                 
                 const nextWord = () => {
                     currentWordIndex = (currentWordIndex + 1) % definitions.length;
                     mistakes = 0;
                     guessedLetters = new Set();
                     renderCurrentState();
                 }

                 renderCurrentState();
                 if (loadingScreen) loadingScreen.classList.remove('loading-active');

             })
             .catch(error => showError(error.toString()));
    }
});
