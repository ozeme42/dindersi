// oyunlar.js - 2 HAKLI KAVRAM YARIŞMASI

window.GameEngine = {};

// Oyun Durumu
window.GameEngine.state = {
    score: 0,
    timer: null,
    timeLeft: 20,
    
    // Değişkenler
    allItems: [], // Tüm kavram havuzu
    currentItem: null, // Şu an sorulan
    currentOptions: [], // Şıklar
    mistakes: 0, // O anki sorudaki hata sayısı
    
    isRoundOver: false,
    
    // Diğer oyunlar için
    lockBoard: false, firstCard: null, secondCard: null, matchesFound: 0, totalMatches: 0,
    currentWord: "", currentSlot: 0, guessed: [], qIndex: 0, questions: []
};

// --- ORTAK ---
window.GameEngine.updateScoreUI = function() {
    const el = document.getElementById('game-score');
    if (el) el.textContent = "PUAN: " + window.GameEngine.state.score;
};

// Ara Ekran (Sonuç)
window.GameEngine.showResult = function(type, title, message, onNext) {
    const stage = document.getElementById('game-stage');
    
    const bgClass = type === 'success' ? 'bg-emerald-900/95' : 'bg-red-900/95';
    const icon = type === 'success' ? '⭐' : '❌';

    const resultHTML = `
        <div id="result-overlay" class="absolute inset-0 ${bgClass} z-50 flex flex-col items-center justify-center p-6 fade-in backdrop-blur-md">
            <div class="text-8xl mb-4 pop-in">${icon}</div>
            <h2 class="text-4xl font-black text-white mb-2 text-center">${title}</h2>
            <p class="text-xl text-white/90 mb-8 text-center font-medium px-4">${message}</p>
            
            <button id="next-btn" class="px-10 py-4 bg-white text-slate-900 rounded-2xl text-xl font-bold shadow-xl transform hover:scale-105 transition flex items-center gap-2">
                DEVAM ET ➜
            </button>
        </div>
    `;

    stage.insertAdjacentHTML('beforeend', resultHTML);

    const btn = document.getElementById('next-btn');
    btn.focus();
    btn.onclick = function() {
        const overlay = document.getElementById('result-overlay');
        if(overlay) overlay.remove();
        onNext();
    };
    
    document.onkeydown = function(e) {
        if(e.key === "Enter") {
            document.onkeydown = null;
            btn.click();
        }
    }
};

window.GameEngine.showWinScreen = function() {
    const stage = document.getElementById('game-stage');
    if(window.GameEngine.state.timer) clearInterval(window.GameEngine.state.timer);

    stage.innerHTML = `
        <div class="text-center fade-in h-full flex flex-col items-center justify-center">
            <div class="text-9xl mb-6 animate-bounce">🎓</div>
            <h2 class="text-5xl font-black text-white mb-4">TEBRİKLER!</h2>
            <p class="text-xl text-slate-300 mb-6">Tüm kavramları başarıyla tamamladın.</p>
            <div class="text-5xl font-bold text-yellow-400 mt-2 bg-slate-800 px-8 py-4 rounded-3xl border border-yellow-500/30">
                TOPLAM PUAN: ${window.GameEngine.state.score}
            </div>
            <button onclick="closeGameModal()" class="mt-12 px-10 py-4 bg-slate-700 text-white rounded-2xl text-xl font-bold hover:bg-red-600 shadow-xl transition">
                ANA MENÜYE DÖN
            </button>
        </div>`;
};

// ==========================================
// 4. KAVRAM YARIŞMASI (2 HAKLI)
// ==========================================
window.GameEngine.startQuiz = function(definitions) {
    const stage = document.getElementById('game-stage');
    
    if (!definitions || definitions.length < 4) {
        stage.innerHTML = '<div class="text-center text-slate-400 p-10"><div class="text-6xl mb-4">⚠️</div><p>Yarışma için en az 4 kavram gerekli.</p></div>';
        return;
    }

    // Listeyi hazırla
    const allItems = definitions.map((def, index) => ({
        id: index,
        term: def.term || def.concept,
        definition: def.definition,
        level: 0 // 3 olunca tamamlanır
    }));

    const state = window.GameEngine.state;
    state.score = 0;
    state.allItems = allItems;
    
    window.GameEngine.loadQuizLevel();
};

window.GameEngine.loadQuizLevel = function() {
    const state = window.GameEngine.state;
    
    // Tamamlanmamışları bul
    const pendingItems = state.allItems.filter(item => item.level < 3);

    if (pendingItems.length === 0) {
        window.GameEngine.showWinScreen();
        return;
    }

    // Rastgele soru seç
    const currentItem = pendingItems[Math.floor(Math.random() * pendingItems.length)];
    state.currentItem = currentItem;

    // Şıkları oluştur (1 Doğru + 7 Yanlış)
    const otherItems = state.allItems.filter(i => i.id !== currentItem.id);
    const distractors = otherItems.sort(() => 0.5 - Math.random()).slice(0, 7);
    const options = [currentItem, ...distractors].sort(() => 0.5 - Math.random());
    state.currentOptions = options;

    state.isRoundOver = false;
    state.timeLeft = 20; 
    state.mistakes = 0; // Hata sayacını sıfırla

    if(state.timer) clearInterval(state.timer);
    
    window.GameEngine.renderQuiz();

    // Zamanlayıcı
    state.timer = setInterval(() => {
        if (state.isRoundOver) return;
        state.timeLeft--;
        
        const bar = document.getElementById('timer-bar');
        if(bar) bar.style.width = `${(state.timeLeft / 20) * 100}%`;

        if (state.timeLeft <= 0) {
            clearInterval(state.timer);
            window.GameEngine.handleQuizAnswer(null, null, true); // Süre bitti
        }
    }, 1000);
};

window.GameEngine.renderQuiz = function() {
    const state = window.GameEngine.state;
    const currentItem = state.currentItem;
    const stage = document.getElementById('game-stage');

    // İlerleme ve Hak Göstergesi
    const completedCount = state.allItems.filter(i => i.level >= 3).length;
    const livesLeft = 2 - state.mistakes; // 2 Hak - Hatalar
    
    let hearts = '';
    for(let i=0; i<2; i++) {
        hearts += i < livesLeft ? '❤️' : '🖤';
    }

    stage.innerHTML = `
        <div class="w-full max-w-6xl flex flex-col h-full fade-in pb-4">
            
            <div class="flex justify-between items-center px-6 py-3 bg-slate-800/50 rounded-xl border border-white/5 mb-4">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col">
                        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">İLERLEME</span>
                        <span class="text-green-400 font-bold text-lg">${completedCount} / ${state.allItems.length}</span>
                    </div>
                    <div class="w-px h-8 bg-white/10"></div>
                    <div class="flex flex-col">
                        <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">HAKKIN</span>
                        <div class="text-xl flex gap-1">${hearts}</div>
                    </div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">BU KAVRAM</span>
                    <span class="text-yellow-400 font-bold text-lg">Seviye ${currentItem.level}/3</span>
                </div>
            </div>

            <div class="flex-grow flex flex-col items-center justify-center relative gap-6 mb-6">
                
                <div id="quiz-warning" class="absolute -top-12 bg-red-500 text-white px-6 py-2 rounded-full font-bold shadow-lg opacity-0 transition-all duration-300 transform translate-y-4">
                    ⚠️ Yanlış! 1 Hakkın Kaldı
                </div>

                <div class="w-full max-w-2xl h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div id="timer-bar" class="h-full bg-yellow-400 transition-all duration-1000 linear" style="width: 100%"></div>
                </div>

                <div class="w-full max-w-3xl bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl text-center relative overflow-hidden group">
                    <div class="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
                    <h3 class="text-xl md:text-3xl font-bold text-white leading-relaxed select-none">
                        "${currentItem.definition}"
                    </h3>
                    <p class="text-slate-500 text-xs mt-4 font-bold tracking-widest uppercase">BU TANIM HANGİ KAVRAMA AİT?</p>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                ${state.currentOptions.map(opt => `
                    <button onclick="window.GameEngine.handleQuizAnswer(this, '${opt.term}')" 
                        class="quiz-opt relative overflow-hidden bg-slate-800 hover:bg-slate-700 border-2 border-white/10 text-white py-4 rounded-xl text-sm md:text-lg font-bold transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 shadow-lg h-20 md:h-24 flex items-center justify-center px-2">
                        ${opt.term}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
};

window.GameEngine.handleQuizAnswer = function(btn, answer, isTimeUp = false) {
    const state = window.GameEngine.state;
    if (state.isRoundOver) return;

    const currentItem = state.currentItem;
    const isCorrect = !isTimeUp && (answer === currentItem.term);

    // --- DOĞRU CEVAP ---
    if (isCorrect) {
        clearInterval(state.timer);
        state.isRoundOver = true;

        // Butonları kilitle ve renklendir
        const buttons = document.querySelectorAll('.quiz-opt');
        buttons.forEach(b => {
            b.disabled = true;
            if (b.innerText.trim() === currentItem.term) {
                b.classList.remove('bg-slate-800', 'border-white/10');
                b.classList.add('bg-green-600', 'border-green-400', 'opacity-100', 'scale-105', 'z-10');
            } else {
                b.classList.add('opacity-30');
            }
        });

        // Puan ve Seviye
        currentItem.level++;
        let points = 20;
        if (state.mistakes > 0) points = 10; // Hata yaptıysa az puan
        state.score += points;

        let msgTitle = "DOĞRU!";
        let msgSub = `${currentItem.level}/3 Tamamlandı`;
        
        if (currentItem.level >= 3) {
            msgTitle = "KAVRAM TAMAMLANDI! ⭐";
            state.score += 50; 
        }
        
        window.GameEngine.updateScoreUI();
        
        setTimeout(() => {
            window.GameEngine.showResult('success', msgTitle, msgSub, () => {
                window.GameEngine.loadQuizLevel();
            });
        }, 800);

    } 
    // --- YANLIŞ CEVAP ---
    else {
        state.mistakes++;
        
        // Butonu kırmızı yap ve kilitle
        if(btn) {
            btn.disabled = true;
            btn.classList.remove('bg-slate-800', 'border-white/10');
            btn.classList.add('bg-red-600', 'border-red-500', 'opacity-50', 'shake');
        }

        if(navigator.vibrate) navigator.vibrate(200);

        // HAK KONTROLÜ
        if (state.mistakes < 2 && !isTimeUp) {
            // Hâlâ hak var -> Uyarı göster, oyunu durdurma
            const warning = document.getElementById('quiz-warning');
            if(warning) {
                warning.style.opacity = '1';
                warning.style.transform = 'translateY(0)';
                // Canları güncelle (Kalp simgesini değiştir)
                window.GameEngine.updateLivesUI();
            }
            
            setTimeout(() => {
                if(warning) {
                    warning.style.opacity = '0';
                    warning.style.transform = 'translateY(16px)';
                }
            }, 1500);

        } else {
            // Hak Bitti veya Süre Bitti -> Turu Bitir
            clearInterval(state.timer);
            state.isRoundOver = true;

            // Doğruyu Göster
            const buttons = document.querySelectorAll('.quiz-opt');
            buttons.forEach(b => {
                b.disabled = true;
                if (b.innerText.trim() === currentItem.term) {
                    b.classList.remove('bg-slate-800', 'border-white/10');
                    b.classList.add('bg-green-600', 'border-green-400', 'opacity-100', 'animate-pulse');
                } else {
                    b.classList.add('opacity-30');
                }
            });

            // Sonuç Ekranı
            setTimeout(() => {
                window.GameEngine.showResult('error', isTimeUp ? 'SÜRE BİTTİ' : 'BİLEMEDİN', `Doğru Cevap: ${currentItem.term}`, () => {
                    window.GameEngine.loadQuizLevel();
                });
            }, 1000);
        }
    }
};

// Yardımcı: Sadece canları güncelle (Ekranı titretmemek için)
window.GameEngine.updateLivesUI = function() {
    const container = document.querySelector('.text-xl.flex.gap-1');
    if(container) {
        // İlk kalbi söndür
        const hearts = container.children;
        if(hearts.length > 0) {
            hearts[0].textContent = '🖤';
            hearts[0].classList.remove('text-red-500', 'animate-pulse');
            hearts[0].classList.add('text-slate-700');
        }
    }
};


// ==========================================
// 1. KELİME BULMACA (ANAGRAM)
// ==========================================
window.GameEngine.startAnagram = function(definitions) {
    const stage = document.getElementById('game-stage');
    if (!definitions || definitions.length === 0) { stage.innerHTML = '<div class="text-center text-slate-400 p-10">Veri yok.</div>'; return; }
    window.GameEngine.state.score = 0;
    window.GameEngine.state.qIndex = 0;
    window.GameEngine.state.questions = [...definitions].sort(() => 0.5 - Math.random());
    window.GameEngine.loadAnagramLevel();
};

window.GameEngine.loadAnagramLevel = function() {
    const state = window.GameEngine.state;
    const stage = document.getElementById('game-stage');
    if (state.qIndex >= state.questions.length) { window.GameEngine.showWinScreen(); return; }
    const q = state.questions[state.qIndex];
    const targetWord = (q.term || q.concept).toLocaleUpperCase('tr-TR').replace(/\s/g, ''); 
    state.currentWord = targetWord;
    state.currentSlot = 0;
    const letters = targetWord.split('').sort(() => 0.5 - Math.random());

    stage.innerHTML = `
        <div class="w-full max-w-4xl flex flex-col items-center gap-8 fade-in relative">
            <div id="feedback-msg" class="absolute -top-16 bg-red-500 text-white px-6 py-2 rounded-full font-bold shadow-lg opacity-0 transition-opacity duration-300">⚠️ Yanlış Harf!</div>
            <div class="w-full bg-slate-800/80 p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                <span class="text-cyan-400 font-bold text-xs mb-2 block">SORU ${state.qIndex + 1} / ${state.questions.length}</span>
                <p class="text-xl md:text-3xl text-white font-medium leading-relaxed">"${q.definition}"</p>
            </div>
            <div id="slots-container" class="flex flex-wrap justify-center gap-2 md:gap-3 my-2">
                ${Array(targetWord.length).fill(0).map(() => '<div class="game-slot"></div>').join('')}
            </div>
            <div id="letters-container" class="flex flex-wrap justify-center gap-3 md:gap-4">
                ${letters.map((char, i) => `<div class="letter-btn c-${(i % 5) + 1} pop-in" onclick="window.GameEngine.handleAnagramClick(this, '${char}')" style="animation-delay: ${i * 50}ms">${char}</div>`).join('')}
            </div>
        </div>
    `;
};

window.GameEngine.handleAnagramClick = function(btn, char) {
    if (btn.classList.contains('used')) return;
    const state = window.GameEngine.state;
    const slots = document.querySelectorAll('.game-slot');
    if (char === state.currentWord[state.currentSlot]) {
        const targetSlot = slots[state.currentSlot];
        btn.classList.add('used');
        targetSlot.textContent = char;
        targetSlot.classList.add('filled', 'pop-in');
        state.currentSlot++;
        if (state.currentSlot === state.currentWord.length) {
            state.score += 100;
            window.GameEngine.updateScoreUI();
            setTimeout(() => {
                window.GameEngine.showResult('success', 'TEBRİKLER!', 'Doğru Bildiniz', () => {
                    state.qIndex++; window.GameEngine.loadAnagramLevel();
                });
            }, 500);
        }
    } else {
        btn.classList.add('shake');
        const msg = document.getElementById('feedback-msg');
        if(msg) { msg.style.opacity = '1'; msg.classList.add('shake'); }
        if(navigator.vibrate) navigator.vibrate(200);
        setTimeout(() => { btn.classList.remove('shake'); if(msg) { msg.style.opacity = '0'; msg.classList.remove('shake'); } }, 800);
    }
};

// ==========================================
// 2. EŞLEŞTİRME OYUNU
// ==========================================
window.GameEngine.startMatching = function(definitions) {
    const stage = document.getElementById('game-stage');
    if (!definitions || definitions.length < 2) { stage.innerHTML = '<div class="text-center text-slate-400 p-10">En az 2 kavram gerekli.</div>'; return; }
    const state = window.GameEngine.state;
    state.score = 0; state.selectedLeft = null; state.selectedRight = null; state.matchesFound = 0;
    let leftList = []; let rightList = [];
    const subset = definitions.slice(0, 6); 
    state.totalMatches = subset.length;
    subset.forEach((item, index) => {
        leftList.push({ id: index, text: item.term || item.concept });
        rightList.push({ id: index, text: item.definition });
    });
    leftList.sort(() => 0.5 - Math.random());
    rightList.sort(() => 0.5 - Math.random());

    stage.innerHTML = `
        <div class="w-full max-w-6xl fade-in">
            <h3 class="text-center text-slate-400 mb-4 text-sm uppercase tracking-widest">Kavramı Tanımıyla Eşleştir</h3>
            <div class="match-container">
                <div class="match-col" id="col-left">
                    ${leftList.map(item => `<div class="match-item pop-in" onclick="window.GameEngine.handleMatchClick(this, '${item.id}', 'left')" data-id="${item.id}">${item.text}</div>`).join('')}
                </div>
                <div class="match-col" id="col-right">
                    ${rightList.map(item => `<div class="match-item pop-in" onclick="window.GameEngine.handleMatchClick(this, '${item.id}', 'right')" data-id="${item.id}"><span class="text-xs md:text-sm line-clamp-3">${item.text}</span></div>`).join('')}
                </div>
            </div>
        </div>
    `;
};

window.GameEngine.handleMatchClick = function(elem, id, side) {
    const state = window.GameEngine.state;
    if (elem.classList.contains('matched')) return;
    if (side === 'left') {
        if (state.selectedLeft) state.selectedLeft.classList.remove('selected');
        state.selectedLeft = elem; elem.classList.add('selected');
    } else {
        if (state.selectedRight) state.selectedRight.classList.remove('selected');
        state.selectedRight = elem; elem.classList.add('selected');
    }
    if (state.selectedLeft && state.selectedRight) {
        const leftId = state.selectedLeft.getAttribute('data-id');
        const rightId = state.selectedRight.getAttribute('data-id');
        if (leftId === rightId) {
            const colorClass = `m-color-${state.matchesFound % 6}`;
            state.selectedLeft.classList.remove('selected'); state.selectedRight.classList.remove('selected');
            state.selectedLeft.classList.add('matched', colorClass); state.selectedRight.classList.add('matched', colorClass);
            state.matchesFound++; state.score += 50; window.GameEngine.updateScoreUI();
            state.selectedLeft = null; state.selectedRight = null;
            if (state.matchesFound === state.totalMatches) setTimeout(() => window.GameEngine.showWinScreen(), 500);
        } else {
            state.selectedLeft.classList.add('shake'); state.selectedRight.classList.add('shake');
            if(navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => {
                if(state.selectedLeft) state.selectedLeft.classList.remove('shake', 'selected');
                if(state.selectedRight) state.selectedRight.classList.remove('shake', 'selected');
                state.selectedLeft = null; state.selectedRight = null;
            }, 500);
        }
    }
};

// ==========================================
// 3. ADAM ASMACA
// ==========================================
window.GameEngine.startHangman = function(definitions) {
    const stage = document.getElementById('game-stage');
    if (!definitions || definitions.length === 0) { stage.innerHTML = '<div class="text-center text-slate-400">Veri yok.</div>'; return; }
    const state = window.GameEngine.state;
    state.score = 0; state.qIndex = 0;
    state.questions = [...definitions].sort(() => 0.5 - Math.random());
    window.GameEngine.loadHangmanLevel();
};

window.GameEngine.loadHangmanLevel = function() {
    const state = window.GameEngine.state;
    if (state.qIndex >= state.questions.length) { window.GameEngine.showWinScreen(); return; }
    state.isRoundOver = false;
    const q = state.questions[state.qIndex];
    state.currentWord = (q.term || q.concept).toLocaleUpperCase('tr-TR').replace(/\s/g, '-');
    state.mistakes = 0; state.guessed = [];
    window.GameEngine.renderHangman();
};

window.GameEngine.renderHangman = function() {
    const state = window.GameEngine.state;
    const stage = document.getElementById('game-stage');
    const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split("");
    const maxMistakes = 6;
    const displayWordHTML = state.currentWord.split('').map(char => {
        if(char === '-') return '<span class="mx-2 text-slate-500">-</span>';
        const isGuessed = state.guessed.includes(char);
        return isGuessed 
            ? `<span class="mx-1 text-cyan-400 font-black pop-in inline-block">${char}</span>` 
            : `<span class="mx-1 text-slate-600 border-b-4 border-slate-600/50 min-w-[0.8em] inline-block text-center rounded">&nbsp;</span>`;
    }).join('');
    
    const isWin = !displayWordHTML.includes('&nbsp;');
    const isLose = state.mistakes >= maxMistakes;
    const keyboard = alphabet.map(char => {
        let statusClass = 'bg-slate-700/80 hover:bg-slate-600 border border-white/10';
        let disabled = '';
        if (state.guessed.includes(char)) {
            disabled = 'disabled';
            statusClass = state.currentWord.includes(char) ? 'bg-green-600/80 border-green-500 text-green-100' : 'bg-red-600/80 border-red-500 text-red-100 opacity-50';
        }
        if(state.isRoundOver) disabled = 'disabled';
        return `<button class="w-10 h-12 md:w-12 md:h-14 rounded-lg font-bold text-lg md:text-xl text-white ${statusClass} transition-all duration-200 shadow-lg" onclick="window.GameEngine.handleHangmanClick('${char}')" ${disabled}>${char}</button>`;
    }).join('');

    stage.innerHTML = `
        <div class="w-full max-w-6xl fade-in flex flex-col gap-6">
            <div class="flex justify-between w-full px-4 text-slate-400 font-mono text-sm bg-slate-800/50 p-2 rounded-lg">
                <span>SORU: <span class="text-white">${state.qIndex+1}</span> / ${state.questions.length}</span>
                <span>HATA: <span class="text-red-400 text-lg font-bold">${state.mistakes}</span> / ${maxMistakes}</span>
            </div>
            <div class="flex flex-col md:flex-row gap-8 md:gap-12 items-start items-stretch">
                <div class="flex flex-col items-center md:w-2/5 shrink-0 gap-6 bg-slate-800/30 p-6 rounded-3xl border border-white/5">
                    <div class="w-40 h-40 md:w-64 md:h-64 border-b-4 border-slate-500 relative opacity-90 flex-shrink-0">
                        <div class="absolute bottom-0 left-4 md:left-8 w-2 md:w-3 h-40 md:h-64 bg-slate-500"></div>
                        <div class="absolute top-0 left-4 md:left-8 w-24 md:w-36 h-2 md:h-3 bg-slate-500"></div>
                        <div class="absolute top-0 left-28 md:left-44 w-2 md:w-3 h-6 md:h-8 bg-slate-400"></div>
                        ${state.mistakes > 0 ? '<div class="absolute top-6 md:top-8 left-[100px] md:left-[158px] w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] pop-in"></div>' : ''} 
                        ${state.mistakes > 1 ? '<div class="absolute top-[70px] md:top-[88px] left-[122px] md:left-[188px] w-2 md:w-3 h-16 md:h-24 bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)] pop-in"></div>' : ''} 
                        ${state.mistakes > 2 ? '<div class="absolute top-[80px] md:top-[100px] left-[100px] md:left-[158px] w-6 md:w-8 h-2 md:h-3 bg-white rotate-[-45deg] shadow-[0_0_15px_rgba(255,255,255,0.3)] pop-in"></div>' : ''} 
                        ${state.mistakes > 3 ? '<div class="absolute top-[80px] md:top-[100px] left-[140px] md:left-[210px] w-6 md:w-8 h-2 md:h-3 bg-white rotate-[45deg] shadow-[0_0_15px_rgba(255,255,255,0.3)] pop-in"></div>' : ''} 
                        ${state.mistakes > 4 ? '<div class="absolute top-[130px] md:top-[180px] left-[105px] md:left-[165px] w-6 md:w-8 h-2 md:h-3 bg-white rotate-[-45deg] origin-top-right shadow-[0_0_15px_rgba(255,255,255,0.3)] pop-in"></div>' : ''} 
                        ${state.mistakes > 5 ? '<div class="absolute top-[130px] md:top-[180px] left-[125px] md:left-[190px] w-6 md:w-8 h-2 md:h-3 bg-white rotate-[45deg] origin-top-left shadow-[0_0_15px_rgba(255,255,255,0.3)] pop-in"></div>' : ''} 
                    </div>
                    <div class="bg-slate-800 p-6 rounded-2xl border border-purple-500/30 text-center w-full shadow-lg">
                        <span class="text-xs text-purple-400 font-bold tracking-widest block mb-3 uppercase">İpucu</span>
                        <p class="text-lg md:text-2xl text-white font-medium leading-relaxed">"${state.questions[state.qIndex].definition}"</p>
                    </div>
                </div>
                <div class="flex flex-col grow items-center justify-center gap-10 md:gap-16 md:py-8 bg-slate-800/30 p-6 rounded-3xl border border-white/5">
                    <div class="text-5xl md:text-7xl font-mono tracking-wider flex flex-wrap justify-center items-end min-h-[6rem]">
                        ${displayWordHTML}
                    </div>
                    <div class="flex flex-wrap justify-center gap-2 max-w-2xl p-4 bg-slate-900/50 rounded-2xl border border-white/10">${keyboard}</div>
                </div>
            </div>
        </div>
    `;

    if (isWin || isLose) {
        state.isRoundOver = true;
        let msgTitle = isWin ? 'TEBRİKLER!' : 'MAALESEF...';
        let msgType = isWin ? 'success' : 'error';
        let msgSub = isWin ? 'Kelimeyi Buldun' : `Doğru Cevap: <span class="text-yellow-400">${state.currentWord}</span>`;
        if (isWin) { state.score += 100 - (state.mistakes * 10); window.GameEngine.updateScoreUI(); }
        setTimeout(() => {
            window.GameEngine.showResult(msgType, msgTitle, msgSub, () => {
                state.qIndex++; window.GameEngine.loadHangmanLevel();
            });
        }, 1000);
    }
};

window.GameEngine.handleHangmanClick = function(char) {
    const state = window.GameEngine.state;
    if(state.isRoundOver) return;
    state.guessed.push(char);
    if (!state.currentWord.includes(char)) state.mistakes++;
    window.GameEngine.renderHangman();
};