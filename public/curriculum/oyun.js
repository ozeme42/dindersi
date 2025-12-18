
document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    const params = new URLSearchParams(window.location.search);
    const topicId = params.get('topicId');
    const topicName = params.get('topicName');

    if (!topicId) {
        renderError("Konu ID'si bulunamadı.");
        return;
    }
    
    // Şimdilik sadece Adam Asmaca oyununu başlatalım
    loadHangman(topicId, topicName);
});

function renderError(message) {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = `
        <div class="bg-red-900/50 border border-red-500 text-red-200 p-8 rounded-2xl text-center">
            <h2 class="text-2xl font-bold mb-2">Hata</h2>
            <p>${message}</p>
            <a href="index.html" class="mt-6 inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Ana Sayfaya Dön</a>
        </div>
    `;
}

// --- ADAM ASMACA OYUNU MANTIĞI ---
async function loadHangman(topicId, topicName) {
    const gameContainer = document.getElementById('game-container');
    try {
        const response = await fetch(`activities/${topicId}.json`);
        if (!response.ok) throw new Error('Etkinlik verileri bulunamadı.');
        const activities = await response.json();
        
        const words = activities
            .filter(item => 
                item.type === 'definition' && 
                item.content?.term && 
                item.content.term.length > 3 && 
                item.content.term.length < 12 &&
                !item.content.term.includes(' ')
            )
            .map(item => ({ word: item.content.term.toUpperCase(), hint: item.content.definition }));

        if (words.length === 0) {
            renderError("Bu konu için Adam Asmaca oyununa uygun kelime bulunamadı.");
            return;
        }

        new Hangman(gameContainer, words, topicName).start();

    } catch (error) {
        console.error(error);
        renderError(error.message);
    }
}

class Hangman {
    constructor(container, words, topicName) {
        this.container = container;
        this.words = this.shuffle(words);
        this.topicName = topicName;
        this.currentWordIndex = 0;
        this.resetGame();
    }

    resetGame() {
        if (this.currentWordIndex >= this.words.length) {
            this.showFinalScore();
            return;
        }
        const current = this.words[this.currentWordIndex];
        this.word = current.word;
        this.hint = current.hint;
        this.guessedLetters = new Set();
        this.mistakes = 0;
        this.render();
    }

    start() {
        this.render();
    }
    
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    handleGuess(letter) {
        if (this.guessedLetters.has(letter)) return;

        this.guessedLetters.add(letter);
        if (!this.word.includes(letter)) {
            this.mistakes++;
        }
        
        const wordGuessed = this.word.split('').every(l => this.guessedLetters.has(l));
        
        if (wordGuessed) {
            this.currentWordIndex++;
            setTimeout(() => this.resetGame(), 1500);
        } else if (this.mistakes >= 6) {
            this.currentWordIndex++;
            setTimeout(() => this.resetGame(), 2000);
        }
        
        this.render();
    }
    
    showFinalScore() {
        // Bu kısım daha sonra geliştirilebilir, şimdilik basit bir bitiş mesajı
         this.container.innerHTML = `
            <div class="text-center space-y-6">
                <h2 class="text-4xl font-black text-cyan-400">Oyun Bitti!</h2>
                <p class="text-slate-400">Tüm kelimeleri tamamladınız.</p>
                <a href="index.html" class="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-lg font-bold">Ana Sayfaya Dön</a>
            </div>
        `;
    }

    render() {
        const wordGuessed = this.word.split('').every(l => this.guessedLetters.has(l));
        const gameOver = this.mistakes >= 6;

        const maskedWord = this.word.split('').map(letter => 
            this.guessedLetters.has(letter) || gameOver ? letter : '_'
        ).join(' ');

        const alphabet = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
        
        this.container.innerHTML = `
            <a href="index.html" class="absolute top-4 left-4 px-4 py-2 bg-slate-800/50 text-slate-300 hover:bg-slate-700 rounded-lg text-sm font-semibold">Geri</a>
            <div class="w-full max-w-4xl text-center">
                <p class="text-lg text-slate-400 font-semibold">${this.topicName}</p>
                <h2 class="text-4xl font-black text-white mb-8">Adam Asmaca</h2>
                
                <div class="mb-8 p-4 bg-slate-800/50 rounded-xl border border-white/10">
                    <p class="text-xl text-cyan-300 italic">İpucu: ${this.hint}</p>
                </div>
                
                <div class="text-5xl font-mono tracking-widest mb-10 text-white">${maskedWord}</div>
                
                ${wordGuessed ? `
                    <div class="text-3xl font-bold text-green-400 animate-pulse">Doğru!</div>
                ` : gameOver ? `
                     <div class="text-3xl font-bold text-red-400">Kaybettin! Doğru kelime: <span class="font-mono">${this.word}</span></div>
                ` : `
                    <div class="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                        ${alphabet.split('').map(letter => `
                            <button 
                                onclick="document.getElementById('game-container').__hangman.handleGuess('${letter}')"
                                class="w-12 h-14 rounded-lg text-xl font-bold transition-all duration-150 ${this.guessedLetters.has(letter) ? 'bg-slate-700 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-white'}"
                                ${this.guessedLetters.has(letter) ? 'disabled' : ''}
                            >${letter}</button>
                        `).join('')}
                    </div>
                `}

                <div class="mt-8 text-lg text-slate-400">Hata: ${this.mistakes} / 6</div>
            </div>
        `;
        
        // Sınıf örneğini sakla
        this.container.__hangman = this;
    }
}
