document.addEventListener('DOMContentLoaded', () => {
    const gameTitleElem = document.getElementById('game-title');
    const gameContainer = document.getElementById('game-container');
    const loadingElem = document.getElementById('loading');
    const errorElem = document.getElementById('error-container');
    const errorTextElem = document.getElementById('error-text');

    const params = new URLSearchParams(window.location.search);
    const gameType = params.get('gamePath');
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (!gameType || !topicId) {
        showError("Oyun türü veya konu bilgisi eksik.");
        return;
    }

    // Set topic name in the header
    const topicNameElem = document.getElementById('topic-name');
    if (topicNameElem) {
        topicNameElem.textContent = decodeURIComponent(topicName || 'Genel');
    }

    function showError(message) {
        if (loadingElem) loadingElem.style.display = 'none';
        if (errorTextElem) errorTextElem.textContent = message;
        if (errorElem) errorElem.style.display = 'flex';
    }

    async function loadGameData() {
        let url;
        // Determine the data source based on game type
        if (['adam-asmaca', 'kelime-avi', 'bil-bakalim', 'hedefi-vur', 'eslestirme', 'hafiza-kartlari'].includes(gameType)) {
             url = `/curriculum/activities/${topicId}.json`;
        } else {
             url = `/curriculum/questions/${topicId}.json`;
        }
        
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("Bu konu için etkinlik verisi bulunamadı.");
                }
                throw new Error(`Veri dosyası yüklenemedi. Status: ${res.status}`);
            }
            const data = await res.json();
            if (!data || data.length === 0) {
                 throw new Error("Etkinlik verisi boş veya geçersiz.");
            }
            return data;
        } catch (error) {
            console.error(error);
            showError(error.message);
            return null;
        }
    }

    function renderGame(game, data) {
        if (!gameContainer || !gameTitleElem) return;

        gameTitleElem.textContent = getGameName(game);
        gameContainer.innerHTML = ''; // Clear loading/previous content
        if (loadingElem) loadingElem.style.display = 'none';
        gameContainer.style.display = 'block';

        switch (game) {
            case 'adam-asmaca':
                renderHangman(gameContainer, data);
                break;
            case 'kelime-avi':
                renderWordSearch(gameContainer, data);
                break;
            default:
                gameContainer.innerHTML = `
                    <div class="text-center text-slate-500 p-8 bg-slate-800 rounded-2xl">
                        <h3 class="text-2xl font-bold text-amber-400">${getGameName(game)}</h3>
                        <p class="mt-2">Bu oyun henüz hazır değil.</p>
                    </div>
                `;
        }
    }
    
    function getGameName(type) {
        const names = { 'adam-asmaca': 'Adam Asmaca', 'kelime-avi': 'Kelime Avı' };
        return names[type] || type;
    }


    loadGameData().then(data => {
        if (data) {
            renderGame(gameType, data);
        }
    });
});


// --- OYUN MANTIKLARI ---

// 1. ADAM ASMACA (HANGMAN)
function renderHangman(container, data) {
    const definitions = data.filter(item => 
        item.type === 'definition' && 
        item.content.term && 
        !item.content.term.includes(' ') &&
        item.content.term.length >= 3 &&
        item.content.term.length <= 12
    );

    if (definitions.length === 0) {
        container.innerHTML = `<p class="text-red-400 text-center">Bu konu için uygun Adam Asmaca kelimesi bulunamadı.</p>`;
        return;
    }

    let currentWordIndex = 0;
    let wrongGuesses = 0;
    let guessedLetters = new Set();
    let currentWordObj;

    const setupLevel = () => {
        if (currentWordIndex >= definitions.length) {
            showEndScreen(true);
            return;
        }
        currentWordObj = definitions[currentWordIndex];
        wrongGuesses = 0;
        guessedLetters = new Set();
        renderUI();
    };

    const renderUI = () => {
        const word = currentWordObj.content.term.toLocaleUpperCase('tr-TR');
        const hint = currentWordObj.content.definition;

        container.innerHTML = `
            <div class="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
                <div class="w-full flex justify-between items-start">
                    <div id="hangman-hint" class="bg-slate-800 p-4 rounded-lg text-slate-300 text-lg text-center shadow-inner max-w-xl"><strong>İpucu:</strong> ${hint}</div>
                    <div id="hangman-drawing" class="w-48 h-56 bg-slate-900/50 p-2 rounded-lg border border-white/10">
                        <svg viewBox="0 0 200 250" id="hangman-svg"></svg>
                    </div>
                </div>
                <div id="hangman-word" class="flex gap-2"></div>
                <div id="hangman-keyboard" class="flex flex-wrap justify-center gap-2 max-w-2xl"></div>
                <div id="hangman-result" class="text-3xl font-bold"></div>
            </div>
        `;

        updateWordDisplay();
        updateDrawing();
        renderKeyboard();
    };

    const updateWordDisplay = () => {
        const wordContainer = document.getElementById('hangman-word');
        const word = currentWordObj.content.term.toLocaleUpperCase('tr-TR');
        wordContainer.innerHTML = word.split('').map(letter => 
            `<div class="w-10 h-12 md:w-12 md:h-16 text-2xl md:text-4xl font-black flex items-center justify-center rounded-lg bg-slate-800 border-b-4 border-slate-900">${guessedLetters.has(letter) ? letter : ''}</div>`
        ).join('');
    };

    const updateDrawing = () => {
        const svg = document.getElementById('hangman-svg');
        let parts = `
            <line x1="20" y1="240" x2="180" y2="240" stroke="#475569" stroke-width="4" />
            <line x1="60" y1="240" x2="60" y2="20" stroke="#475569" stroke-width="4" />
            <line x1="60" y1="20" x2="140" y2="20" stroke="#475569" stroke-width="4" />
            <line x1="140" y1="20" x2="140" y2="50" stroke="#475569" stroke-width="4" />
        `;
        if (wrongGuesses > 0) parts += '<circle cx="140" cy="80" r="20" stroke="white" stroke-width="4" fill="none" class="draw-anim" />';
        if (wrongGuesses > 1) parts += '<line x1="140" y1="100" x2="140" y2="170" stroke="white" stroke-width="4" class="draw-anim"/>';
        if (wrongGuesses > 2) parts += '<line x1="140" y1="120" x2="110" y2="150" stroke="white" stroke-width="4" class="draw-anim"/>';
        if (wrongGuesses > 3) parts += '<line x1="140" y1="120" x2="170" y2="150" stroke="white" stroke-width="4" class="draw-anim"/>';
        if (wrongGuesses > 4) parts += '<line x1="140" y1="170" x2="110" y2="210" stroke="white" stroke-width="4" class="draw-anim"/>';
        if (wrongGuesses > 5) parts += '<line x1="140" y1="170" x2="170" y2="210" stroke="white" stroke-width="4" class="draw-anim"/>';
        svg.innerHTML = parts;
    };

    const renderKeyboard = () => {
        const keyboardContainer = document.getElementById('hangman-keyboard');
        const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
        keyboardContainer.innerHTML = alphabet.split('').map(letter => 
            `<button class="w-10 h-10 md:w-12 md:h-12 rounded-lg text-lg md:text-xl font-bold bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500" data-letter="${letter}">${letter}</button>`
        ).join('');

        keyboardContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                handleGuess(e.target.dataset.letter);
            }
        });
    };

    const handleGuess = (letter) => {
        if (guessedLetters.has(letter) || wrongGuesses >= 6) return;

        guessedLetters.add(letter);
        const word = currentWordObj.content.term.toLocaleUpperCase('tr-TR');
        const button = document.querySelector(`[data-letter="${letter}"]`);
        button.disabled = true;

        if (word.includes(letter)) {
            button.classList.add('bg-emerald-600');
            updateWordDisplay();
            checkWin();
        } else {
            button.classList.add('bg-red-600');
            wrongGuesses++;
            updateDrawing();
            checkLoss();
        }
    };
    
    const checkWin = () => {
        const word = currentWordObj.content.term.toLocaleUpperCase('tr-TR');
        if (word.split('').every(letter => guessedLetters.has(letter))) {
            showEndScreen(true, false);
        }
    };

    const checkLoss = () => {
        if (wrongGuesses >= 6) {
            showEndScreen(false, false);
        }
    };

    const showEndScreen = (isWin, isGameEnd) => {
        const resultContainer = document.getElementById('hangman-result');
        const keyboard = document.getElementById('hangman-keyboard');
        keyboard.style.pointerEvents = 'none';

        if (isGameEnd) {
             resultContainer.innerHTML = `<div class="p-8 bg-slate-800 rounded-xl shadow-lg text-center"><p class="text-4xl">Tebrikler, tüm kelimeleri bildin!</p><button id="restart-game" class="mt-4 px-6 py-2 bg-indigo-600 rounded-lg">Tekrar Oyna</button></div>`;
             document.getElementById('restart-game').addEventListener('click', () => { currentWordIndex = 0; setupLevel(); });
        }
        else if (isWin) {
            resultContainer.innerHTML = `<p class="text-green-400">Tebrikler, bildiniz!</p>`;
            setTimeout(() => { currentWordIndex++; setupLevel(); }, 2000);
        } else {
            resultContainer.innerHTML = `<p class="text-red-400">Kaybettiniz! Doğru kelime: <span class="font-mono">${currentWordObj.content.term.toLocaleUpperCase('tr-TR')}</span></p>`;
            setTimeout(() => { currentWordIndex++; setupLevel(); }, 3000);
        }
    };

    setupLevel();
}

// 2. KELİME AVI (WORD SEARCH)
function renderWordSearch(container, data) {
    const concepts = data
        .filter(item => item.type === 'concept' && item.content.text && !item.content.text.includes(' ') && item.content.text.length > 2 && item.content.text.length <= 12)
        .map(item => item.content.text.toLocaleUpperCase('tr-TR'));
        
    if (concepts.length < 3) {
        container.innerHTML = `<p class="text-red-400 text-center">Bu konu için en az 3 uygun kelime bulunamadı.</p>`;
        return;
    }

    const GRID_SIZE = 14;
    const { grid, placedWords } = generateWordSearchGrid(concepts.slice(0, 10)); // Max 10 words
    
    let selection = [];
    let foundWords = new Set();
    
    const render = () => {
        container.innerHTML = `
            <div class="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
                <div id="wordsearch-grid-container" class="flex-1 aspect-square bg-slate-900 p-2 rounded-2xl border-2 border-white/10"></div>
                <div class="w-full lg:w-64">
                    <h3 class="font-bold text-xl mb-4 text-cyan-400">Bulunacak Kelimeler (${foundWords.size}/${placedWords.length})</h3>
                    <ul id="wordsearch-list" class="space-y-2"></ul>
                </div>
            </div>
        `;
        renderGrid();
        renderWordList();
    };

    const renderGrid = () => {
        const gridContainer = document.getElementById('wordsearch-grid-container');
        gridContainer.innerHTML = grid.map((row, r) => 
            row.map((letter, c) => {
                const isSelected = selection.some(cell => cell.r === r && cell.c === c);
                const isFound = [...foundWords].some(word => word.path.some(cell => cell.r === r && cell.c === c));
                const foundWordData = [...foundWords].find(word => word.path.some(cell => cell.r === r && cell.c === c));
                let foundClass = '';
                if(foundWordData){
                    const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-rose-500", "bg-amber-500"];
                    foundClass = colors[foundWordData.index % colors.length];
                }

                return `<div class="w-full h-full rounded-md flex items-center justify-center text-xl md:text-2xl font-black select-none cursor-pointer border border-transparent 
                    ${isSelected ? 'bg-yellow-400 text-black scale-110' : ''}
                    ${isFound ? `${foundClass} text-white` : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                    " data-r="${r}" data-c="${c}">${letter}</div>`;
            }).join('')
        ).join('').replace(/<div/g, '<div class="flex items-center justify-center"');
        
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
        gridContainer.style.gap = '4px';

        gridContainer.addEventListener('mousedown', startSelection);
        gridContainer.addEventListener('mousemove', dragSelection);
        window.addEventListener('mouseup', endSelection);
    };

    const renderWordList = () => {
        const listContainer = document.getElementById('wordsearch-list');
        listContainer.innerHTML = placedWords.map(word => 
            `<li class="${foundWords.has(word.word) ? 'line-through text-slate-500' : 'text-slate-100'} font-semibold text-lg">${word.word}</li>`
        ).join('');
    };

    const startSelection = (e) => {
        if (e.target.dataset.r) {
            selection = [{ r: parseInt(e.target.dataset.r), c: parseInt(e.target.dataset.c) }];
            renderGrid();
        }
    };
    
    const dragSelection = (e) => {
        if (selection.length > 0 && e.target.dataset.r) {
             const start = selection[0];
             const end = { r: parseInt(e.target.dataset.r), c: parseInt(e.target.dataset.c) };
             const line = getCellsInLine(start, end);
             if (line) {
                 selection = line;
                 renderGrid();
             }
        }
    };

    const endSelection = () => {
        if (selection.length > 1) {
            const selectedWord = selection.map(cell => grid[cell.r][cell.c]).join('');
            const reversedSelectedWord = selectedWord.split('').reverse().join('');
            const found = placedWords.find(w => !foundWords.has(w.word) && (w.word === selectedWord || w.word === reversedSelectedWord));
            if (found) {
                foundWords.add(found.word);
                // This is a bit of a hack to store the path and index with the found word
                const foundWithMeta = { word: found.word, path: selection, index: foundWords.size };
                foundWords.delete(found.word);
                foundWords.add(foundWithMeta);

                renderWordList();
            }
        }
        selection = [];
        renderGrid();
        
        if (foundWords.size === placedWords.length) {
            setTimeout(() => {
                 container.innerHTML = `<div class="text-center p-8 text-2xl font-bold text-green-400">Tebrikler, tüm kelimeleri buldun!</div>`;
            }, 500);
        }
    };

    render();
}

// --- UTILITIES FOR GAMES ---
function generateWordSearchGrid(words) {
    const GRID_SIZE = 14;
    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    const placedWords = [];
    const DIRECTIONS = [
        { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, 
        { x: -1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 },
        { x: 1, y: -1 }, { x: -1, y: 1 }
    ].sort(() => Math.random() - 0.5);

    for (const word of words) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);
            
            if (canPlaceWord(word, r, c, direction, grid)) {
                for (let i = 0; i < word.length; i++) {
                    grid[r + i * direction.y][c + i * direction.x] = word[i];
                }
                placedWords.push({word, path: []});
                placed = true;
            }
            attempts++;
        }
    }

    const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }
    return { grid, placedWords };
}

function canPlaceWord(word, r, c, direction, grid) {
    const GRID_SIZE = 14;
    for (let i = 0; i < word.length; i++) {
        const newR = r + i * direction.y;
        const newC = c + i * direction.x;
        if (newR < 0 || newR >= GRID_SIZE || newC < 0 || newC >= GRID_SIZE || (grid[newR][newC] !== '' && grid[newR][newC] !== word[i])) {
            return false;
        }
    }
    return true;
}

function getCellsInLine(start, end) {
    const cells = [];
    const dx = end.c - start.c;
    const dy = end.r - start.r;

    if (dx === 0 && dy === 0) return [start];
    
    if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
        const len = Math.max(Math.abs(dx), Math.abs(dy));
        const dirX = dx / len;
        const dirY = dy / len;
        for (let i = 0; i <= len; i++) {
            cells.push({ r: start.r + i * dirY, c: start.c + i * dirX });
        }
        return cells;
    }
    return null;
}
