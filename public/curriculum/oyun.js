document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('main-content');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-container');
    const gameTitleH2 = document.getElementById('game-title');
    const topicInfoSpan = document.getElementById('topic-info');

    const showLoading = (message) => {
        if (loadingDiv) {
            loadingDiv.style.display = 'flex';
            loadingDiv.querySelector('p').textContent = message;
        }
        if (mainContent) mainContent.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
    };

    const showError = (message) => {
        if (errorDiv) {
            errorDiv.style.display = 'flex';
            errorDiv.querySelector('p').textContent = message;
        }
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
    };

    const showContent = () => {
        if (mainContent) mainContent.style.display = 'block';
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
    };

    const urlParams = new URLSearchParams(window.location.search);
    const gameType = urlParams.get('game');
    const topicId = urlParams.get('topicId');
    const courseName = urlParams.get('courseName');
    const unitName = urlParams.get('unitName');
    const topicName = urlParams.get('topicName');

    if (gameTitleH2) gameTitleH2.textContent = gameType === 'kelime-avi' ? 'Kelime Avı' : 'Adam Asmaca';
    if (topicInfoSpan) topicInfoSpan.textContent = `${courseName} > ${unitName} > ${topicName}`;

    if (!gameType || !topicId) {
        showError("Oyun türü veya konu bilgisi eksik.");
        return;
    }

    // Abstracted data fetching
    async function fetchDataForGame(dataType) {
        showLoading('Oyun verileri yükleniyor...');
        try {
            const response = await fetch(`/curriculum/${dataType}/${topicId}.json`);
            if (!response.ok) {
                throw new Error(`Veri dosyası bulunamadı: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Veri yüklenirken hata:', error);
            showError(`Oyun verileri yüklenemedi. Lütfen bu konu için "${dataType}" verilerinin oluşturulduğundan emin olun.`);
            return null;
        }
    }

    // --- Adam Asmaca Mantığı ---
    const initHangman = (questions) => {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        let currentQuestionIndex = 0;
        let mistakes = 0;
        let guessedLetters = new Set();
        
        function setupQuestion() {
            const question = questions[currentQuestionIndex];
            if (!question) {
                gameContainer.innerHTML = '<div class="game-end"><h2>Tebrikler!</h2><p>Tüm kelimeleri buldunuz.</p></div>';
                return;
            }

            mistakes = 0;
            guessedLetters.clear();
            const word = question.correctAnswer.toUpperCase();
            
            gameContainer.innerHTML = `
                <div class="hangman-container">
                    <div class="hangman-scaffold">
                        <svg viewBox="0 0 100 120">
                            <line x1="10" y1="110" x2="90" y2="110" class="scaffold-part" />
                            <line x1="30" y1="110" x2="30" y2="10" class="scaffold-part" />
                            <line x1="30" y1="10" x2="70" y2="10" class="scaffold-part" />
                            <line x1="70" y1="10" x2="70" y2="20" class="scaffold-part" />
                            <circle cx="70" cy="30" r="10" class="hangman-part body-part-1" />
                            <line x1="70" y1="40" x2="70" y2="70" class="hangman-part body-part-2" />
                            <line x1="70" y1="50" x2="60" y2="60" class="hangman-part body-part-3" />
                            <line x1="70" y1="50" x2="80" y2="60" class="hangman-part body-part-4" />
                            <line x1="70" y1="70" x2="60" y2="90" class="hangman-part body-part-5" />
                            <line x1="70" y1="70" x2="80" y2="90" class="hangman-part body-part-6" />
                        </svg>
                    </div>
                    <div class="hangman-ui">
                        <p class="hint">İpucu: ${question.definition}</p>
                        <div class="word-display"></div>
                        <div class="keyboard"></div>
                    </div>
                </div>
            `;

            const wordDisplay = gameContainer.querySelector('.word-display');
            word.split('').forEach(letter => {
                const letterEl = document.createElement('div');
                letterEl.classList.add('letter-box');
                if (letter === ' ') {
                    letterEl.classList.add('space');
                }
                wordDisplay.appendChild(letterEl);
            });

            const keyboard = gameContainer.querySelector('.keyboard');
            'ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ'.split('').forEach(key => {
                const keyEl = document.createElement('button');
                keyEl.textContent = key;
                keyEl.addEventListener('click', () => handleGuess(key));
                keyboard.appendChild(keyEl);
            });
            
            updateWordDisplay();
        }

        function updateWordDisplay() {
            const word = questions[currentQuestionIndex].correctAnswer.toUpperCase();
            const wordDisplay = gameContainer.querySelector('.word-display');
            const letterBoxes = wordDisplay.querySelectorAll('.letter-box');
            let allGuessed = true;

            word.split('').forEach((letter, index) => {
                if (guessedLetters.has(letter) || letter === ' ') {
                    letterBoxes[index].textContent = letter;
                } else {
                    letterBoxes[index].textContent = '';
                    allGuessed = false;
                }
            });

            if (allGuessed) {
                endGame(true);
            }
        }
        
        function handleGuess(letter) {
            const keyEl = Array.from(gameContainer.querySelectorAll('.keyboard button')).find(btn => btn.textContent === letter);
            if (guessedLetters.has(letter) || keyEl.disabled) return;

            guessedLetters.add(letter);
            keyEl.disabled = true;
            
            const word = questions[currentQuestionIndex].correctAnswer.toUpperCase();
            if (word.includes(letter)) {
                keyEl.classList.add('correct');
                updateWordDisplay();
            } else {
                keyEl.classList.add('incorrect');
                mistakes++;
                updateHangmanFigure();
            }
        }

        function updateHangmanFigure() {
            const parts = gameContainer.querySelectorAll('.hangman-part');
            for(let i = 0; i < mistakes; i++){
                if(parts[i]) parts[i].style.display = 'block';
            }
            if (mistakes >= parts.length) {
                endGame(false);
            }
        }

        function endGame(won) {
            const word = questions[currentQuestionIndex].correctAnswer.toUpperCase();
            const keyboard = gameContainer.querySelector('.keyboard');
            keyboard.innerHTML = `
                <div class="game-over-message ${won ? 'won' : 'lost'}">
                    <p>${won ? 'Tebrikler, bildiniz!' : 'Kaybettiniz! Doğru kelime:'}</p>
                    <p class="correct-word">${word}</p>
                    <button id="next-hangman-btn">Sıradaki Kelime</button>
                </div>
            `;
            gameContainer.querySelector('#next-hangman-btn').addEventListener('click', () => {
                currentQuestionIndex++;
                setupQuestion();
            });
        }
        
        setupQuestion();
    };
    
    // --- Kelime Avı Mantığı ---
    const initWordSearch = (words) => {
        // Kelime Avı kodu buraya... (Bu kısım önceki örneklerdeki gibi detaylandırılabilir)
        const gameContainer = document.getElementById('game-container');
        gameContainer.innerHTML = `<p class="placeholder-message">Kelime Avı oyunu yakında burada olacak!</p>`;
    };

    // --- ANA MANTIK ---
    if (gameType === 'adam-asmaca') {
        const data = await fetchDataForGame('activities');
        if (data) {
            const questions = data.filter(item => item.type === 'definition').map(item => ({
                correctAnswer: item.content.term,
                definition: item.content.definition
            }));
            if (questions.length === 0) {
                showError('Bu konu için Adam Asmaca oyununa uygun "tanım" verisi bulunamadı.');
                return;
            }
            showContent();
            initHangman(questions);
        }
    } else if (gameType === 'kelime-avi') {
        const data = await fetchDataForGame('activities');
        if (data) {
             const words = data.filter(item => item.type === 'concept').map(item => item.content.text);
             if (words.length < 3) {
                 showError('Bu konu için Kelime Avı oyununa uygun en az 3 "kavram" verisi bulunmalıdır.');
                 return;
             }
            showContent();
            initWordSearch(words);
        }
    } else {
        showError(`"${gameType}" adlı oyun henüz hazır değil.`);
    }
});
