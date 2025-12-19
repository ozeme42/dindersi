document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');
    const gameTitle = document.getElementById('game-title');
    const topicNameEl = document.getElementById('topic-name');

    if (!loadingScreen || !gameContainer || !gameTitle || !topicNameEl) {
        console.error("Gerekli HTML elementleri bulunamadı.");
        document.body.innerHTML = '<p class="error-message">Sayfa yüklenirken kritik bir hata oluştu.</p>';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const gameType = params.get('game');
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (!gameType || !topicId || !topicName) {
        gameContainer.innerHTML = '<p class="error-message">Bir Hata Oluştu<br>Oyun türü veya konu bilgisi eksik.</p>';
        loadingScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        return;
    }

    topicNameEl.textContent = decodeURIComponent(topicName);
    gameTitle.textContent = gameType === 'kelime-avi' ? 'Kelime Avı' : 'Adam Asmaca';
    
    // Veri dosyasının yolu
    const dataUrl = `activities/${topicId}.json`;

    fetch(dataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Veri dosyası bulunamadı. Lütfen konuya özel etkinlik verilerinin oluşturulduğundan emin olun.');
            }
            return response.json();
        })
        .then(data => {
            loadingScreen.style.display = 'none';
            gameContainer.style.display = 'block';
            if (gameType === 'adam-asmaca') {
                const definitions = data.filter(item => item.type === 'definition');
                if (definitions.length === 0) throw new Error('Bu konu için Adam Asmaca oynanacak uygun tanım bulunamadı.');
                initHangman(definitions);
            } else if (gameType === 'kelime-avi') {
                const concepts = data.filter(item => item.type === 'concept').map(item => item.content.text);
                if (concepts.length < 3) throw new Error('Bu konu için Kelime Avı oynanacak en az 3 kavram bulunmalıdır.');
                initWordSearch(concepts);
            } else {
                throw new Error('Geçersiz oyun türü.');
            }
        })
        .catch(error => {
            gameContainer.innerHTML = `<p class="error-message">Bir Hata Oluştu<br>${error.message}</p>`;
            loadingScreen.style.display = 'none';
            gameContainer.style.display = 'block';
        });

    // ADAM ASMACA OYUN MANTIĞI
    function initHangman(definitions) {
        let currentDefinitionIndex = 0;
        let mistakes = 0;
        let correctLetters = [];
        
        const hintEl = document.createElement('p');
        hintEl.id = 'hangman-hint';
        hintEl.className = 'game-hint';

        const wordDisplay = document.createElement('div');
        wordDisplay.id = 'hangman-word';
        wordDisplay.className = 'word-display';

        const hangmanDrawing = document.createElement('div');
        hangmanDrawing.id = 'hangman-drawing';
        hangmanDrawing.className = 'hangman-drawing';
        hangmanDrawing.innerHTML = `
            <svg height="250" width="200" class="figure-container">
                <line x1="60" y1="230" x2="140" y2="230" class="figure-part" />
                <line x1="100" y1="230" x2="100" y2="20" class="figure-part" />
                <line x1="100" y1="20" x2="180" y2="20" class="figure-part" />
                <line x1="180" y1="20" x2="180" y2="50" class="figure-part" />
                <circle cx="180" cy="70" r="20" class="figure-part" id="hangman-head" />
                <line x1="180" y1="90" x2="180" y2="150" class="figure-part" id="hangman-body" />
                <line x1="180" y1="120" x2="160" y2="100" class="figure-part" id="hangman-left-arm" />
                <line x1="180" y1="120" x2="200" y2="100" class="figure-part" id="hangman-right-arm" />
                <line x1="180" y1="150" x2="160" y2="180" class="figure-part" id="hangman-left-leg" />
                <line x1="180" y1="150" x2="200" y2="180" class="figure-part" id="hangman-right-leg" />
            </svg>
        `;
        
        const keyboardContainer = document.createElement('div');
        keyboardContainer.id = 'hangman-keyboard';
        keyboardContainer.className = 'keyboard';
        
        const notification = document.createElement('div');
        notification.id = 'hangman-notification';
        notification.className = 'game-notification';

        gameContainer.append(hintEl, wordDisplay, hangmanDrawing, keyboardContainer, notification);
        
        function setupNewWord() {
            mistakes = 0;
            correctLetters = [];
            const { term, definition } = definitions[currentDefinitionIndex].content;
            const word = term.toLocaleUpperCase('tr-TR');

            hintEl.textContent = `İpucu: ${definition}`;
            wordDisplay.innerHTML = word.split('').map(letter => `<span class="letter">${letter === ' ' ? ' ' : '_'}</span>`).join('');
            
            document.querySelectorAll('.figure-part').forEach(part => part.style.display = 'none');
            updateKeyboard();
        }

        function updateKeyboard() {
            keyboardContainer.innerHTML = '';
            'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('').forEach(letter => {
                const btn = document.createElement('button');
                btn.textContent = letter;
                btn.addEventListener('click', () => handleGuess(letter));
                keyboardContainer.appendChild(btn);
            });
        }
        
        function handleGuess(letter) {
            const { term } = definitions[currentDefinitionIndex].content;
            const word = term.toLocaleUpperCase('tr-TR');
            
            if(word.includes(letter)) {
                if(!correctLetters.includes(letter)) {
                    correctLetters.push(letter);
                    displayWord();
                }
            } else {
                mistakes++;
                updateFigure();
            }
            checkGameStatus();
        }

        function displayWord() {
            const { term } = definitions[currentDefinitionIndex].content;
            const word = term.toLocaleUpperCase('tr-TR');
            wordDisplay.innerHTML = word.split('').map(letter => 
                `<span class="letter">${correctLetters.includes(letter) || letter === ' ' ? letter : '_'}</span>`
            ).join('');
        }

        function updateFigure() {
            const parts = ['hangman-head', 'hangman-body', 'hangman-left-arm', 'hangman-right-arm', 'hangman-left-leg', 'hangman-right-leg'];
            if(mistakes <= parts.length) {
                document.getElementById(parts[mistakes - 1]).style.display = 'block';
            }
        }
        
        function checkGameStatus() {
             const { term } = definitions[currentDefinitionIndex].content;
             const word = term.toLocaleUpperCase('tr-TR');
             const won = word.split('').every(letter => correctLetters.includes(letter) || letter === ' ');

             if (won) {
                 showNotification("Kazandın! 🥳");
                 setTimeout(() => {
                     currentDefinitionIndex = (currentDefinitionIndex + 1) % definitions.length;
                     setupNewWord();
                     hideNotification();
                 }, 2000);
             } else if (mistakes >= 6) {
                 showNotification(`Kaybettin! 😕 Doğru kelime: ${word}`);
                 setTimeout(() => {
                     currentDefinitionIndex = (currentDefinitionIndex + 1) % definitions.length;
                     setupNewWord();
                     hideNotification();
                 }, 3000);
             }
        }

        function showNotification(message) {
            notification.textContent = message;
            notification.classList.add('show');
        }
        function hideNotification() {
            notification.classList.remove('show');
        }

        setupNewWord();
    }
    
    // KELİME AVI OYUN MANTIĞI
    function initWordSearch(words) {
         // Oyun mantığı buraya gelecek
    }
});
