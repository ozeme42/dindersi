
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');
    const gameTitleDiv = document.getElementById('game-title');
    const gameArea = document.getElementById('game-area');

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const gameType = params.get('game'); // 'adam-asmaca' veya 'kelime-avi'

    function showError(message) {
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) {
            errorDiv.textContent = `Hata: ${message}`;
            errorDiv.style.display = 'block';
        }
        console.error(message);
    }

    if (!topicId || !gameType) {
        showError("Oyun türü veya konu bilgisi eksik.");
        return;
    }

    // Veri çekme ve oyunu başlatma
    const dataUrl = `/curriculum/activities/${topicId}.json`;
    fetch(dataUrl)
        .then(response => {
            if (!response.ok) throw new Error(`Veri dosyası bulunamadı: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (gameType === 'adam-asmaca') {
                const definitions = data.filter(item => item.type === 'definition' && item.content.term && item.content.definition && !item.content.term.includes(' '));
                if (definitions.length === 0) throw new Error("Adam Asmaca için uygun kelime/tanım bulunamadı.");
                initAdamAsmaca(definitions);
            } else if (gameType === 'kelime-avi') {
                const concepts = data.filter(item => item.type === 'concept' && item.content.text && !item.content.text.includes(' ') && item.content.text.length > 2 && item.content.text.length < 12);
                if (concepts.length < 3) throw new Error("Kelime Avı için en az 3 uygun kavram bulunamadı.");
                initKelimeAvi(concepts.map(c => c.content.text.toLocaleUpperCase('tr-TR')));
            } else {
                throw new Error("Geçersiz oyun türü.");
            }
        })
        .catch(error => showError(error.message));

    // --- Adam Asmaca Oyunu ---
    function initAdamAsmaca(definitions) {
        if (!gameArea || !gameTitleDiv) return;
        gameTitleDiv.textContent = "Adam Asmaca";
        gameArea.innerHTML = `
            <div id="hangman-container" class="w-full max-w-2xl mx-auto text-center">
                <svg id="hangman-svg" viewBox="0 0 200 250" class="mx-auto h-48"></svg>
                <p id="hangman-hint" class="text-lg text-slate-400 my-4 italic"></p>
                <div id="hangman-word" class="flex justify-center gap-2 my-4"></div>
                <div id="hangman-keyboard" class="flex flex-wrap justify-center gap-2 mt-6"></div>
            </div>`;

        let currentDefinitionIndex = 0;
        let mistakes = 0;
        const maxMistakes = 6;
        let guessedLetters = new Set();
        let currentWord = '';

        const wordDisplay = document.getElementById('hangman-word');
        const hintDisplay = document.getElementById('hangman-hint');
        const keyboardDiv = document.getElementById('hangman-keyboard');
        const hangmanSVG = document.getElementById('hangman-svg');

        function setupLevel() {
            mistakes = 0;
            guessedLetters.clear();
            const definition = definitions[currentDefinitionIndex];
            currentWord = definition.content.term.toLocaleUpperCase('tr-TR');
            if (hintDisplay) hintDisplay.textContent = `İpucu: ${definition.content.definition}`;
            drawHangman();
            updateWordDisplay();
        }

        function updateWordDisplay() {
            if (!wordDisplay) return;
            wordDisplay.innerHTML = currentWord
                .split('')
                .map(letter => `<span class="w-8 h-10 text-2xl font-bold flex items-center justify-center border-b-2 ${guessedLetters.has(letter) ? 'border-emerald-500 text-white' : 'border-slate-600 text-transparent'}">${guessedLetters.has(letter) ? letter : '_'}</span>`)
                .join('');
        }

        function drawHangman() {
            if (!hangmanSVG) return;
            const parts = [
                '<line x1="20" y1="230" x2="180" y2="230" stroke="#fff" stroke-width="4"/>', // Zemin
                '<line x1="60" y1="230" x2="60" y2="20" stroke="#fff" stroke-width="4"/>', // Direk
                '<line x1="60" y1="20" x2="140" y2="20" stroke="#fff" stroke-width="4"/>', // Üst Çubuk
                '<line x1="140" y1="20" x2="140" y2="50" stroke="#fff" stroke-width="4"/>'  // İp
            ];
            const bodyParts = [
                '<circle cx="140" cy="70" r="20" stroke="#ff4500" stroke-width="4" fill="none"/>', // Kafa
                '<line x1="140" y1="90" x2="140" y2="150" stroke="#ff4500" stroke-width="4"/>', // Gövde
                '<line x1="140" y1="110" x2="110" y2="140" stroke="#ff4500" stroke-width="4"/>', // Sol Kol
                '<line x1="140" y1="110" x2="170" y2="140" stroke="#ff4500" stroke-width="4"/>', // Sağ Kol
                '<line x1="140" y1="150" x2="110" y2="180" stroke="#ff4500" stroke-width="4"/>', // Sol Bacak
                '<line x1="140" y1="150" x2="170" y2="180" stroke="#ff4500" stroke-width="4"/>'  // Sağ Bacak
            ];
            hangmanSVG.innerHTML = parts.join('') + bodyParts.slice(0, mistakes).join('');
        }

        function checkWin() {
            const won = currentWord.split('').every(letter => guessedLetters.has(letter));
            if (won) {
                setTimeout(() => {
                    alert("Tebrikler! Kelimeyi buldunuz.");
                    currentDefinitionIndex = (currentDefinitionIndex + 1) % definitions.length;
                    setupLevel();
                }, 500);
            }
        }

        function checkLoss() {
            if (mistakes >= maxMistakes) {
                 drawHangman();
                setTimeout(() => {
                    alert(`Kaybettiniz! Doğru kelime: ${currentWord}`);
                    currentDefinitionIndex = (currentDefinitionIndex + 1) % definitions.length;
                    setupLevel();
                }, 500);
            }
        }

        const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
        alphabet.split('').forEach(letter => {
            const btn = document.createElement('button');
            btn.className = "w-10 h-10 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500";
            btn.textContent = letter;
            btn.onclick = () => {
                btn.disabled = true;
                if (currentWord.includes(letter)) {
                    guessedLetters.add(letter);
                    updateWordDisplay();
                    checkWin();
                } else {
                    mistakes++;
                    drawHangman();
                    checkLoss();
                }
            };
            keyboardDiv?.appendChild(btn);
        });

        setupLevel();
    }

    // --- Kelime Avı Oyunu ---
    function initKelimeAvi(words) {
         if (!gameArea || !gameTitleDiv) return;
        gameTitleDiv.textContent = "Kelime Avı";
        // Setup UI
        gameArea.innerHTML = `
            <div id="word-hunt-container" class="w-full flex flex-col lg:flex-row gap-4 max-w-4xl mx-auto">
                <div id="word-hunt-grid" class="flex-1 grid gap-1 p-2 bg-slate-800 rounded-lg aspect-square"></div>
                <div id="word-hunt-list" class="w-full lg:w-56 p-4 bg-slate-800 rounded-lg"></div>
            </div>
        `;
        const gridContainer = document.getElementById('word-hunt-grid');
        const listContainer = document.getElementById('word-hunt-list');
        if (!gridContainer || !listContainer) return;

        const GRID_SIZE = 12;
        let grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
        
        // Kelimeleri yerleştir
        words.forEach(word => {
            let placed = false;
            while (!placed) {
                const direction = Math.floor(Math.random() * 2); // 0: yatay, 1: dikey
                const row = Math.floor(Math.random() * GRID_SIZE);
                const col = Math.floor(Math.random() * GRID_SIZE);
                
                if (direction === 0 && col + word.length <= GRID_SIZE) {
                    for(let i=0; i<word.length; i++) grid[row][col+i] = word[i];
                    placed = true;
                } else if (direction === 1 && row + word.length <= GRID_SIZE) {
                     for(let i=0; i<word.length; i++) grid[row+i][col] = word[i];
                    placed = true;
                }
            }
        });
        
        // Boşlukları doldur
        const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
        for(let r=0; r<GRID_SIZE; r++) {
            for(let c=0; c<GRID_SIZE; c++) {
                if(grid[r][c] === '') {
                    grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }
        
        // Render
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
        grid.flat().forEach(letter => {
            const cell = document.createElement('div');
            cell.className = 'w-full aspect-square flex items-center justify-center bg-slate-700 rounded text-white font-bold';
            cell.textContent = letter;
            gridContainer.appendChild(cell);
        });

        listContainer.innerHTML = words.map(word => `<p class="text-slate-400">${word}</p>`).join('');
    }
});
