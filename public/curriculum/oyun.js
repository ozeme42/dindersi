// Genel Oyun Mantığı
const gameTitleEl = document.getElementById('game-title');
const gameContainerEl = document.getElementById('game-container');
const loadingEl = document.getElementById('loading-screen');
const errorEl = document.getElementById('error-screen');
const errorMessageEl = document.getElementById('error-message');

function showLoading(message) {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (gameContainerEl) gameContainerEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    const loadingMessageEl = document.getElementById('loading-message');
    if (loadingMessageEl) loadingMessageEl.textContent = message;
}

function showError(message) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (gameContainerEl) gameContainerEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'flex';
    if (errorMessageEl) errorMessageEl.textContent = message;
}

function showGame() {
    if (loadingEl) loadingEl.style.display = 'none';
    if (gameContainerEl) gameContainerEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
}

// =================================================================================
// KELİME AVI OYUNU
// =================================================================================
const WORD_SEARCH_GRID_SIZE = 12;
const DIRECTIONS = [
    { x: 1, y: 0 },  // Horizontal
    { x: 0, y: 1 },  // Vertical
    { x: 1, y: 1 },  // Diagonal down-right
    { x: 1, y: -1 }  // Diagonal up-right
];

function generateWordSearch(words) {
    let grid = Array(WORD_SEARCH_GRID_SIZE).fill(null).map(() => Array(WORD_SEARCH_GRID_SIZE).fill(''));
    const placedWords = [];

    const sortedWords = words.sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            attempts++;
            const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const row = Math.floor(Math.random() * WORD_SEARCH_GRID_SIZE);
            const col = Math.floor(Math.random() * WORD_SEARCH_GRID_SIZE);

            if (canPlaceWord(grid, word, row, col, direction)) {
                for (let i = 0; i < word.length; i++) {
                    grid[row + i * direction.y][col + i * direction.x] = word[i];
                }
                placedWords.push(word);
                placed = true;
            }
        }
    }
    
    // Fill empty cells
    const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    for (let r = 0; r < WORD_SEARCH_GRID_SIZE; r++) {
        for (let c = 0; c < WORD_SEARCH_GRID_SIZE; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }

    return { grid, placedWords };
}

function canPlaceWord(grid, word, row, col, direction) {
    for (let i = 0; i < word.length; i++) {
        const newRow = row + i * direction.y;
        const newCol = col + i * direction.x;
        if (
            newRow < 0 || newRow >= WORD_SEARCH_GRID_SIZE ||
            newCol < 0 || newCol >= WORD_SEARCH_GRID_SIZE ||
            (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i])
        ) {
            return false;
        }
    }
    return true;
}


function runKelimeAvi(container, data) {
    const concepts = data.map(item => item.content.text).filter(text => text && text.length > 2 && text.length <= WORD_SEARCH_GRID_SIZE && !text.includes(' '));
    
    if (concepts.length < 3) {
        showError("Kelime Avı için yeterli uygun kelime bulunamadı (en az 3 adet, boşluksuz, 12 harften kısa).");
        return;
    }

    const { grid, placedWords } = generateWordSearch(concepts);
    
    let selection = [];
    let foundWords = new Set();
    
    container.innerHTML = `
        <div class="kelime-avi-container">
            <div id="kelime-avi-grid" class="kelime-avi-grid"></div>
            <div id="kelime-avi-word-list" class="kelime-avi-word-list">
                <h3>Aranacak Kelimeler</h3>
                <ul>${placedWords.map(word => `<li id="word-${word}">${word}</li>`).join('')}</ul>
            </div>
        </div>
    `;

    const gridEl = document.getElementById('kelime-avi-grid');
    for (let r = 0; r < WORD_SEARCH_GRID_SIZE; r++) {
        for (let c = 0; c < WORD_SEARCH_GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.textContent = grid[r][c];
            cell.dataset.row = r;
            cell.dataset.col = c;
            gridEl.appendChild(cell);

            cell.addEventListener('mousedown', () => { selection = [{row: r, col: c}]; cell.classList.add('selected'); });
            cell.addEventListener('mouseover', () => {
                if (selection.length > 0) {
                    const last = selection[selection.length - 1];
                    const dr = r - last.row;
                    const dc = c - last.col;
                    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) { // Only allow adjacent cells
                        selection.push({row: r, col: c});
                        cell.classList.add('selected');
                    }
                }
            });
        }
    }
    
    document.addEventListener('mouseup', () => {
        if (selection.length > 0) {
            const selectedWord = selection.map(cell => grid[cell.row][cell.col]).join('');
            const reversedWord = selectedWord.split('').reverse().join('');
            
            if (placedWords.includes(selectedWord) && !foundWords.has(selectedWord)) {
                foundWords.add(selectedWord);
                document.getElementById(`word-${selectedWord}`).style.textDecoration = 'line-through';
            } else if (placedWords.includes(reversedWord) && !foundWords.has(reversedWord)) {
                foundWords.add(reversedWord);
                 document.getElementById(`word-${reversedWord}`).style.textDecoration = 'line-through';
            }
            
            document.querySelectorAll('#kelime-avi-grid div').forEach(c => c.classList.remove('selected'));
            selection = [];
            if(foundWords.size === placedWords.length) {
                 setTimeout(() => alert("Tebrikler, tüm kelimeleri buldunuz!"), 200);
            }
        }
    });
}

// =================================================================================
// ADAM ASMAca OYUNU
// =================================================================================
function runAdamAsmaca(container, data) {
    const definitions = data.filter(item => 
        item.content && item.content.term && item.content.definition && 
        item.content.term.length >= 3 && item.content.term.length <= 12 && !item.content.term.includes(' ')
    );

    if (definitions.length === 0) {
        showError("Adam Asmaca için uygun kelime/tanım bulunamadı.");
        return;
    }

    let currentWordIndex = 0;
    let wrongGuesses = 0;
    let guessedLetters = new Set();
    
    function setupRound() {
        const currentData = definitions[currentWordIndex];
        const word = currentData.content.term.toLocaleUpperCase('tr-TR');
        const hint = currentData.content.definition;
        
        wrongGuesses = 0;
        guessedLetters.clear();

        container.innerHTML = `
            <div class="adam-asmaca-container">
                <div class="game-area">
                    <svg id="hangman-svg" viewBox="0 0 200 250"></svg>
                    <div id="hint-box">${hint}</div>
                </div>
                <div class="controls-area">
                    <div id="word-display"></div>
                    <div id="keyboard"></div>
                </div>
            </div>
        `;
        
        updateWordDisplay(word);
        drawHangman();
        createKeyboard(word);
    }
    
    function updateWordDisplay(word) {
        const displayEl = document.getElementById('word-display');
        displayEl.innerHTML = word.split('').map(letter => 
            `<span class="letter">${guessedLetters.has(letter) ? letter : '_'}</span>`
        ).join('');
    }

    function createKeyboard(word) {
        const keyboardEl = document.getElementById('keyboard');
        "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split('').forEach(letter => {
            const btn = document.createElement('button');
            btn.textContent = letter;
            btn.addEventListener('click', () => handleGuess(letter, word));
            keyboardEl.appendChild(btn);
        });
    }

    function handleGuess(letter, word) {
        if (guessedLetters.has(letter)) return;
        
        guessedLetters.add(letter);
        
        document.querySelectorAll('#keyboard button').forEach(btn => {
            if (btn.textContent === letter) {
                btn.disabled = true;
            }
        });

        if (word.includes(letter)) {
            updateWordDisplay(word);
            checkWin(word);
        } else {
            wrongGuesses++;
            drawHangman();
            checkLoss();
        }
    }
    
    function drawHangman() {
        const svg = document.getElementById('hangman-svg');
        svg.innerHTML = `
            <line x1="20" y1="230" x2="100" y2="230" stroke="#fff" stroke-width="2"/>
            <line x1="60" y1="230" x2="60" y2="50" stroke="#fff" stroke-width="2"/>
            <line x1="60" y1="50" x2="140" y2="50" stroke="#fff" stroke-width="2"/>
            <line x1="140" y1="50" x2="140" y2="80" stroke="#fff" stroke-width="2"/>
        `;
        if (wrongGuesses > 0) svg.innerHTML += '<circle cx="140" cy="100" r="20" stroke="#fff" stroke-width="2" fill="none"/>';
        if (wrongGuesses > 1) svg.innerHTML += '<line x1="140" y1="120" x2="140" y2="170" stroke="#fff" stroke-width="2"/>';
        if (wrongGuesses > 2) svg.innerHTML += '<line x1="140" y1="130" x2="110" y2="150" stroke="#fff" stroke-width="2"/>';
        if (wrongGuesses > 3) svg.innerHTML += '<line x1="140" y1="130" x2="170" y2="150" stroke="#fff" stroke-width="2"/>';
        if (wrongGuesses > 4) svg.innerHTML += '<line x1="140" y1="170" x2="110" y2="200" stroke="#fff" stroke-width="2"/>';
        if (wrongGuesses > 5) svg.innerHTML += '<line x1="140" y1="170" x2="170" y2="200" stroke="#fff" stroke-width="2"/>';
    }

    function checkWin(word) {
        if (word.split('').every(letter => guessedLetters.has(letter))) {
            setTimeout(() => {
                alert('Tebrikler! Doğru bildiniz.');
                nextRound();
            }, 300);
        }
    }
    
    function checkLoss() {
        if (wrongGuesses >= 6) {
            setTimeout(() => {
                alert('Kaybettiniz! Doğru kelime: ' + definitions[currentWordIndex].content.term);
                nextRound();
            }, 300);
        }
    }

    function nextRound() {
        currentWordIndex = (currentWordIndex + 1) % definitions.length;
        setupRound();
    }
    
    setupRound();
}

// =================================================================================
// ANA MANTIK
// =================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    showLoading('Oyun Yükleniyor...');
    
    const params = new URLSearchParams(window.location.search);
    const gameKey = params.get('game');
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (gameTitleEl) {
        gameTitleEl.textContent = topicName || 'Oyun';
    }
    
    if (!gameKey || !topicId) {
        showError("Oyun türü veya konu bilgisi eksik.");
        return;
    }
    
    let dataSourceUrl = '';
    // Determine data source based on game
    if (gameKey === 'kelime-avi') {
        dataSourceUrl = `/curriculum/activities/${topicId}.json`;
    } else if (gameKey === 'adam-asmaca') {
        dataSourceUrl = `/curriculum/activities/${topicId}.json`;
    } else {
        showError("Bilinmeyen oyun türü.");
        return;
    }

    try {
        const response = await fetch(dataSourceUrl);
        if (!response.ok) {
            throw new Error(`Veri dosyası yüklenemedi: ${response.statusText}`);
        }
        const data = await response.json();
        
        showGame();

        if (gameKey === 'kelime-avi') {
            runKelimeAvi(gameContainerEl, data);
        } else if (gameKey === 'adam-asmaca') {
            runAdamAsmaca(gameContainerEl, data);
        }
    } catch (error) {
        showError(`Veriler yüklenirken bir sorun oluştu: ${error.message}`);
    }
});
