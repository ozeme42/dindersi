'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Volume2, VolumeX, Maximize2, Home, RefreshCw } from "lucide-react";
import { getClimbingDuelQuestions } from '../actions';
import { cn } from "@/lib/utils";

// --- TİPLER ---
export interface Question {
    id: string;
    text: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış';
    options?: string[];
    correctAnswer: string;
    isTrue?: boolean;
}

// --- CSS STYLES (GÜNCELLENDİ) ---
const GAME_STYLES = `
  /* --- GENEL AYARLAR --- */
  #sp11_container {
    font-family: 'Segoe UI', 'Roboto', 'Helvetica', sans-serif;
    width: 100%;
    height: 95vh;
    max-height: 900px; /* Yükseklik limiti biraz artırıldı */
    min-height: 600px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    color: #333;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    transition: background 1.5s ease;
  }
  
  /* GÖKYÜZÜ RENKLERİ */
  .sky_morning { background: linear-gradient(to bottom, #81d4fa 0%, #e1f5fe 100%); }
  .sky_noon    { background: linear-gradient(to bottom, #29b6f6 0%, #b3e5fc 100%); }
  .sky_afternoon{ background: linear-gradient(to bottom, #ffb74d 0%, #fff9c4 100%); }
  .sky_sunset  { background: linear-gradient(to bottom, #ff7043 0%, #3e2723 100%); }

  /* --- GÜNEŞ YÖRÜNGESİ --- */
  #sun_pivot {
      position: absolute; bottom: -20%; left: 50%; width: 10px; height: 110%;
      transform-origin: bottom center; transition: transform 1s cubic-bezier(0.25, 1, 0.5, 1);
      z-index: 1; pointer-events: none;
  }
  .sp11_sun {
    position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%);
    width: 90px; height: 90px;
    background: radial-gradient(circle, #fff 20%, #ffeb3b 100%);
    border-radius: 50%;
    box-shadow: 0 0 40px #ff9800, 0 0 80px #ff5722;
    transition: all 0.5s;
  }      
  .sun_hot { background: radial-gradient(circle, #fff 20%, #ffca28 100%); box-shadow: 0 0 50px #ff6f00; }
  .sun_setting { background: radial-gradient(circle, #fff 10%, #ff5722 100%); box-shadow: 0 0 30px #bf360c; transform: translate(-50%, -50%) scale(0.9); }

  /* Kuşlar & Efektler */
  .sp11_bird {
    position: absolute; width: 30px; height: 15px;
    border-top: 3px solid #333; border-right: 3px solid #333;
    border-radius: 50% 50% 0 0; transform: rotate(45deg); z-index: 2; opacity: 0.6;
  }
  .bird1 { top: 15%; left: -10%; animation: fly 25s linear infinite; }
  .bird2 { top: 25%; left: -10%; animation: fly 30s linear infinite 5s; width: 20px; height: 10px; }
  @keyframes fly {
    0% { left: -10%; transform: rotate(45deg) translateY(0); }
    50% { transform: rotate(45deg) translateY(-30px); }
    100% { left: 110%; transform: rotate(45deg) translateY(0); }
  }

  .sp11_sea {
    position: absolute; bottom: 0; width: 100%; height: 15%;
    background: rgba(0, 50, 90, 0.5); z-index: 2; overflow: hidden;
    border-top: 1px solid rgba(255,255,255,0.3);
  }
  .wave {
    position: absolute; bottom: 0; width: 200%; height: 100%;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg"><path d="M0,60 C300,100 600,0 1200,60 L1200,120 L0,120 Z" fill="rgba(255,255,255,0.2)"/></svg>') repeat-x;
    background-size: 50% 100%; animation: wave_move 12s linear infinite;
  }
  .wave:nth-child(2) { bottom: 10px; opacity: 0.6; animation: wave_move 8s linear infinite reverse; }
  @keyframes wave_move { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

  .sp11_cloud {
    position: absolute; background: rgba(255,255,255,0.6); border-radius: 50%;
    animation: sp11_float 80s linear infinite; z-index: 1; filter: blur(3px);
  }
  @keyframes sp11_float { from { transform: translateX(-200px); } to { transform: translateX(120vw); } }

  /* --- EKRANLAR --- */
  .sp11_screen {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 100;
    background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(3px);
    overflow-y: auto; padding: 10px;
    animation: sp11_zoom 0.3s ease-out;
  }
  @keyframes sp11_zoom { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  .home_layout {
    display: flex; flex-direction: row; background: rgba(255,255,255,0.95); border-radius: 20px;
    box-shadow: 0 15px 40px rgba(0,0,0,0.3); padding: 25px;
    max-width: 900px; width: 98%; align-items: center; gap: 20px; border: 1px solid #ddd;
  }
  .result_card {
      background: white; padding: 20px; border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3); text-align: center;
      width: 95%; max-width: 500px;
  }

  /* --- OYUN ALANI (DÜZENLEME BURADA) --- */
  #sp11_play_area { display: flex; width: 100%; height: 100%; align-items: center; z-index: 10; overflow: hidden; }
  
  /* Yan sütunları genişlettik (flex: 1 -> flex: 1.4) */
  .sp11_col { flex: 1.4; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; z-index: 20; height:100%; }
  
  /* Kontrollerin genişlik limitini artırdık */
  .sp11_ctrl { width: 95%; max-width: 650px; display: flex; flex-direction: column; height: 95%; justify-content: center; }
  
  /* Soru Alanı: Yüksekliği artırdık */
  .head_p1 { background: linear-gradient(135deg, rgba(38, 198, 218, 0.95), rgba(0, 151, 167, 0.95)); color:white; padding: 20px; border-radius:15px; min-height: 150px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 100%; border: 2px solid rgba(255,255,255,0.5); }
  .head_p2 { background: linear-gradient(135deg, rgba(239, 83, 80, 0.95), rgba(198, 40, 40, 0.95)); color:white; padding: 20px; border-radius:15px; min-height: 150px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 100%; border: 2px solid rgba(255,255,255,0.5); }
  
  /* Soru Yazı Boyutu: Büyüttük */
  .sp11_q { font-size: 1.4rem; font-weight: 600; line-height: 1.3; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); text-align: center; }
  
  .sp11_options { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; margin-top: 20px; }
  
  /* Butonlar: Esnek yükseklik verdik */
  .option_btn {
      background: rgba(255,255,255,0.9); backdrop-filter: blur(5px);
      border: 2px solid rgba(255,255,255,0.6); border-radius: 12px; 
      width: 100%; 
      height: auto; 
      min-height: 85px; /* Minimum yükseklik artırıldı */
      font-size: 1.1rem; /* Seçenek yazısı büyütüldü */
      font-weight: bold; color: #2c3e50;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
      padding: 10px; box-shadow: 0 4px 0 rgba(0,0,0,0.1);
      white-space: normal; /* Yazı taşmasını önlemek için */
      line-height: 1.2;
      text-align: center;
  }
  .option_btn:active { transform: translateY(4px); box-shadow: none; }
  .option_btn:hover { background: #fff; transform: scale(1.02); }

  /* Orta Alan: Biraz daralttık (flex: 0.8 -> flex: 0.6) */
  #sp11_stage { flex: 0.6; height: 100%; display: flex; justify-content: center; align-items: flex-end; padding-top: 60px; }
  .sp11_lane { position: relative; width: 80px; height: 100%; margin: 0 5px; display: flex; justify-content: center; }
  .sp11_rope {
      width: 12px; height: 100%;
      background: repeating-linear-gradient(45deg, #8d6e63, #8d6e63 6px, #5d4037 6px, #5d4037 12px);
      z-index: 5; box-shadow: 2px 0 5px rgba(0,0,0,0.5); position: relative;
  }
  .sp11_flag { position: absolute; top: -40px; font-size: 30px; z-index: 1; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3)); transition: opacity 0.3s; }
  
  /* Karakter */
  .sp11_char { width: 60px; height: 80px; position: absolute; transition: bottom 0.5s cubic-bezier(0.25, 1, 0.5, 1), left 0.5s ease-in-out; z-index: 20; }
  .sp11_char svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 5px 5px rgba(0,0,0,0.3)); }
  .sp11_char.winner { z-index: 100; animation: char_celebrate 0.6s ease-in-out infinite alternate; }
  .sp11_char.winner::after {
      content: '🚩'; font-size: 40px; position: absolute; top: -25px; right: -20px;
      transform-origin: bottom left; animation: flag_wave 0.4s ease-in-out infinite alternate; filter: drop-shadow(0 0 10px gold);
  }
  @keyframes char_celebrate { from { transform: translateX(-50%) rotate(-5deg); } to { transform: translateX(-50%) rotate(5deg); } }
  @keyframes flag_wave { from { transform: rotate(-10deg); } to { transform: rotate(20deg); } }
  
  .confetti { position: absolute; width: 10px; height: 10px; animation: fall linear forwards; }
  @keyframes fall { to { transform: translateY(100vh) rotate(720deg); } }

  /* Responsive: Mobilde eski düzeni koru */
  @media (max-width: 900px) {
      .home_layout { flex-direction: column; }
      #sp11_play_area { flex-direction: row; }
      .sp11_col { padding: 2px; flex: 1.2; }
      #sp11_stage { flex: 0.6; padding-top: 40px; }
      .sp11_q { font-size: 0.85rem; }
      .head_p1, .head_p2 { min-height: 70px; padding: 5px; }
      .sp11_options { gap: 6px; margin-top: 10px; }
      .option_btn { height: 50px; min-height: 50px; font-size: 0.8rem; padding: 2px; }
      .sp11_lane { width: 40px; margin: 0; }
      .sp11_char { width: 35px; height: 50px; }
      .sp11_flag { font-size: 20px; top: -30px; }
  }
`;

// Test için Mock Veri
const MOCK_QUESTIONS: Question[] = [
    { id: "1", text: "İstanbul kaç yılında fethedilmiştir?", type: "Çoktan Seçmeli", options: ["1453", "1071", "1923", "1299"], correctAnswer: "1453" },
    { id: "2", text: "Türkiye'nin başkenti Ankara'dır.", type: "Doğru/Yanlış", correctAnswer: "Doğru", isTrue: true },
    { id: "3", text: "Su 100 derecede kaynar.", type: "Doğru/Yanlış", correctAnswer: "Doğru", isTrue: true },
    { id: "4", text: "En büyük gezegen hangisidir?", type: "Çoktan Seçmeli", options: ["Mars", "Jüpiter", "Dünya", "Venüs"], correctAnswer: "Jüpiter" },
    { id: "5", text: "Hangi hayvan uçabilir?", type: "Çoktan Seçmeli", options: ["Kedi", "Yarasa", "Köpek", "Fil"], correctAnswer: "Yarasa" },
];

function ClimbingDuelGameContent() {
    const searchParams = useSearchParams();
    
    // --- STATE ---
    const [gameState, setGameState] = useState<'loading' | 'home' | 'playing' | 'win'>('loading');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string|null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Oyun Mantığı
    const [scores, setScores] = useState({ p1: 0, p2: 0 });
    const [p1Question, setP1Question] = useState<Question | null>(null);
    const [p2Question, setP2Question] = useState<Question | null>(null);
    const [winnerText, setWinnerText] = useState('');
    const [soundOn, setSoundOn] = useState(true);

    // Görseller
    const [sunRotation, setSunRotation] = useState(-90);
    const [containerClass, setContainerClass] = useState('sky_morning');
    const [sunClass, setSunClass] = useState('');
    const [confetti, setConfetti] = useState<{id: number, left: number, bg: string, dur: number}[]>([]);
    
    // Ses
    const audioCtxRef = useRef<AudioContext | null>(null);

    // --- SES FONKSİYONLARI ---
    const initAudio = () => {
        if (!audioCtxRef.current && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if (!soundOn || !audioCtxRef.current) return;
        try {
            const osc = audioCtxRef.current.createOscillator();
            const gain = audioCtxRef.current.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(audioCtxRef.current.destination);
            osc.start();
            gain.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
            osc.stop(audioCtxRef.current.currentTime + duration);
        } catch (e) { console.error("Audio Play Error", e); }
    };

    const sfxCorrect = () => { if(soundOn) { playTone(600, 'sine', 0.6, 0.2); setTimeout(() => playTone(900, 'sine', 0.8, 0.1), 100); }};
    const sfxWrong = () => { if(soundOn) playTone(150, 'triangle', 0.3, 0.2); };
    const sfxWin = () => { 
        if(soundOn) { 
            let notes = [523, 659, 783, 1046]; 
            notes.forEach((n, i) => setTimeout(() => playTone(n, 'sine', 0.4, 0.2), i * 150)); 
        }
    };

    // --- DATA FETCHING ---
    const fetchGameData = useCallback(async () => {
        setIsLoading(true);
        try {
            const FETCH_MOCK = false; // Backend yoksa true yapın

            let resultQuestions: Question[] = [];

            if (FETCH_MOCK) {
                 resultQuestions = MOCK_QUESTIONS;
                 await new Promise(r => setTimeout(r, 800));
            } else {
                const params = {
                    courseId: searchParams.get('courseId') || undefined,
                    unitId: searchParams.get('unitId') || undefined,
                    topicId: searchParams.get('topicId') || undefined,
                    questionCount: 50,
                    questionTypes: ['Çoktan Seçmeli', 'Doğru/Yanlış']
                };
                const result = await getClimbingDuelQuestions(params);
                if (result.error) throw new Error(result.error);
                resultQuestions = result.questions || [];
            }

            if (resultQuestions.length < 5) {
                setError("Bu oyun için en az 5 soru gerekli.");
                setGameState('loading');
            } else {
                setQuestions(resultQuestions);
                setGameState('home');
            }
        } catch (err: any) {
            setError(err.message || "Veri yüklenemedi.");
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    // --- OYUN MANTIK ---
    const askQuestion = (player: 1 | 2) => {
        if (questions.length === 0) return;
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        
        const shuffledOptions = randomQ.type === 'Çoktan Seçmeli' && randomQ.options 
            ? [...randomQ.options].sort(() => 0.5 - Math.random()) 
            : randomQ.options;

        const questionWithOptions = {
            ...randomQ,
            options: shuffledOptions
        };

        if (player === 1) setP1Question(questionWithOptions);
        else setP2Question(questionWithOptions);
    };

    const startGame = useCallback(() => {
        if (questions.length < 1) return;
        setScores({ p1: 0, p2: 0 });
        setConfetti([]);
        setGameState('playing');
        initAudio();
        askQuestion(1);
        askQuestion(2);
        updateSun(0);
    }, [questions]);

    const checkAnswer = (player: 1 | 2, choice: string) => {
        const question = player === 1 ? p1Question : p2Question;
        if (!question) return;

        let isCorrect = false;
        if (question.type === 'Doğru/Yanlış') {
            isCorrect = (choice === "Doğru" && (question.isTrue === true || question.correctAnswer === "Doğru")) ||
                        (choice === "Yanlış" && (question.isTrue === false || question.correctAnswer === "Yanlış"));
        } else {
            isCorrect = choice === question.correctAnswer;
        }

        let newScores = { ...scores };

        if (isCorrect) {
            sfxCorrect();
            const newScore = Math.min(100, scores[player === 1 ? 'p1' : 'p2'] + 10);
            newScores = { ...scores, [player === 1 ? 'p1' : 'p2']: newScore };
            
            setScores(newScores);
            updateSun(Math.max(newScores.p1, newScores.p2));

            if (newScore >= 100) {
                celebrateWin(player);
            } else {
                setTimeout(() => askQuestion(player), 400);
            }
        } else {
            sfxWrong();
            const newScore = Math.max(0, scores[player === 1 ? 'p1' : 'p2'] - 10);
            newScores = { ...scores, [player === 1 ? 'p1' : 'p2']: newScore };
            setScores(newScores);
            updateSun(Math.max(newScores.p1, newScores.p2));
        }
    };

    const updateSun = (maxScore: number) => {
        const rotation = (maxScore * 1.8) - 90;
        setSunRotation(rotation);

        if (maxScore < 30) { setContainerClass('sky_morning'); setSunClass(''); }
        else if (maxScore < 70) { setContainerClass('sky_noon'); setSunClass('sun_hot'); }
        else if (maxScore < 90) { setContainerClass('sky_afternoon'); setSunClass('sun_hot'); }
        else { setContainerClass('sky_sunset'); setSunClass('sun_setting'); }
    };

    const celebrateWin = (player: 1 | 2) => {
        sfxWin();
        triggerConfetti();
        setWinnerText(player === 1 ? "Mavi Takım" : "Kırmızı Takım");
        setTimeout(() => setGameState('win'), 3000);
    };

    const triggerConfetti = () => {
        const colors = ['#f44336','#2196F3','#FFEB3B','#4CAF50','#FF9800','#9C27B0'];
        const newConfetti = Array.from({ length: 80 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            bg: colors[Math.floor(Math.random() * colors.length)],
            dur: Math.random() * 2 + 2
        }));
        setConfetti(newConfetti);
    };

    const toggleFS = () => {
        const elem = document.getElementById('sp11_container');
        if (!elem) return;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const renderOptions = (player: 1 | 2) => {
        const question = player === 1 ? p1Question : p2Question;
        if (!question) return <div className="text-white">Soru Yükleniyor...</div>;
        
        const options = question.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : question.options;
        
        return options?.map((opt, idx) => (
            <button 
                key={`${player}-${idx}`} 
                className="option_btn hover:bg-white active:translate-y-1" 
                onClick={() => checkAnswer(player, opt)}
            >
                {opt}
            </button>
        ));
    };

    if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white flex-col gap-4"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /><span>Oyun Yükleniyor...</span></div>;
    if (error) return <div className="h-screen w-full flex items-center justify-center p-8 bg-red-950 text-red-200 text-center text-xl flex-col gap-4"><div>{error}</div><Button onClick={() => window.location.reload()} variant="outline" className="text-black"><RefreshCw className="mr-2 h-4 w-4"/> Yenile</Button></div>;

    return (
        <div id="sp11_wrapper" className="w-full max-w-[1400px] mx-auto"> {/* Wrapper genişletildi */}
            <style jsx global>{GAME_STYLES}</style>
            
            <div id="sp11_container" className={containerClass}>
                
                {/* ÜST BUTONLAR */}
                <div className="absolute top-3 right-3 z-50 flex gap-2">
                    <button className="bg-white/80 border border-gray-400 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white transition" onClick={() => { setSoundOn(!soundOn); initAudio(); }}>
                        {soundOn ? <Volume2 size={14}/> : <VolumeX size={14}/>} {soundOn ? "Ses: Açık" : "Ses: Kapalı"}
                    </button>
                    <button className="bg-white/80 border border-gray-400 rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 hover:bg-white transition" onClick={toggleFS}>
                        <Maximize2 size={14}/> Tam Ekran
                    </button>
                </div>

                {/* CONFETTI */}
                {confetti.map((c) => (
                    <div key={c.id} className="confetti" style={{ left: `${c.left}%`, background: c.bg, animationDuration: `${c.dur}s`, top: '-10px' }} />
                ))}

                {/* GÜNEŞ SİSTEMİ */}
                <div id="sun_pivot" style={{ transform: `rotate(${sunRotation}deg)` }}>
                    <div id="theSun" className={cn("sp11_sun", sunClass)}></div>
                </div>

                {/* ARKAPLAN EFEKTLERİ */}
                <div className="sp11_bird bird1"></div>
                <div className="sp11_bird bird2"></div>
                <div className="sp11_cloud" style={{width:'80px', height:'80px', top:'10%', left:'-10%', borderRadius:'50%'}}></div>
                <div className="sp11_cloud" style={{width:'100px', height:'60px', top:'20%', left:'-20%', animationDuration:'45s', borderRadius:'40%'}}></div>
                <div className="sp11_sea"><div className="wave"></div><div className="wave"></div></div>

                {/* EKRAN: GİRİŞ */}
                {gameState === 'home' && (
                    <div id="p_home" className="sp11_screen">
                        <div className="home_layout">
                            <div className="flex-1 text-center p-4">
                                <h1 className="text-4xl font-bold text-teal-600 mb-2">Tırmanma Yarışı</h1>
                                <div className="text-5xl mb-6">🕌 Düello 🤲</div>
                                <div className="text-left bg-teal-50 p-6 rounded-lg border-l-8 border-teal-600 text-lg text-gray-800 mb-6">
                                    <ul className="space-y-3">
                                        <li><strong>Kurallar:</strong></li>
                                        <li>• Mavi ve Kırmızı takım yarışır.</li>
                                        <li>• Doğru cevap tırmandırır, yanlış cevap düşürür!</li>
                                        <li>• Zirveye ilk ulaşan bayrağı kapar.</li>
                                    </ul>
                                </div>
                                <button className="sp11_btn bg-orange-500 hover:bg-orange-600 text-white w-full py-5 rounded-xl text-2xl font-bold shadow-lg transform active:scale-95 transition" onClick={startGame}>
                                    YARIŞA BAŞLA
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EKRAN: OYUN */}
                {gameState === 'playing' && (
                    <div id="p_game" className="sp11_screen !justify-end !p-0 !overflow-hidden !block">
                        <div id="sp11_play_area">
                            
                            {/* SOL OYUNCU */}
                            <div className="sp11_col">
                                <div className="sp11_ctrl">
                                    <div className="head_p1">
                                        <div className="sp11_q px-2">{p1Question?.text}</div>
                                    </div>
                                    <div className="sp11_options">{renderOptions(1)}</div>
                                </div>
                            </div>

                            {/* ORTA SAHNE */}
                            <div id="sp11_stage">
                                {/* Kulvar 1 */}
                                <div className="sp11_lane">
                                    <div className={cn("sp11_flag", scores.p1 >= 100 ? "opacity-0" : "opacity-100")}>🚩</div>
                                    <div className="sp11_rope"></div>
                                    <div id="c1" className={cn("sp11_char", scores.p1 >= 100 && "winner")} 
                                         style={{ 
                                             bottom: `${Math.min(scores.p1, 95) * 0.9}%`, 
                                             left: scores.p1 > 0 ? '50%' : '-60px',
                                             transform: scores.p1 > 0 ? 'translateX(-50%)' : 'translateX(0)' 
                                         }}>
                                        <svg viewBox="0 0 100 130">
                                            <g display={scores.p1 > 0 && scores.p1 < 100 ? "block" : "none"}>
                                                <path d="M30 50 L 50 20" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M70 50 L 50 30" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M35 100 L 45 115" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M65 100 L 55 115" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <rect x="25" y="45" width="50" height="55" rx="8" fill="#0097a7" />
                                                <rect x="25" y="90" width="50" height="15" fill="#37474f" />
                                                <circle cx="50" cy="25" r="20" fill="#ffcc80" />
                                                <circle cx="50" cy="22" r="20" fill="#3e2723" />
                                            </g>
                                            <g display={scores.p1 === 0 || scores.p1 >= 100 ? "block" : "none"}>
                                                <path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <rect x="25" y="45" width="50" height="55" rx="8" fill="#0097a7" />
                                                <rect x="25" y="90" width="50" height="15" fill="#37474f" />
                                                <circle cx="50" cy="25" r="20" fill="#ffcc80" />
                                                <circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/>
                                                <path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/>
                                            </g>
                                        </svg>
                                    </div>
                                </div>

                                {/* Kulvar 2 */}
                                <div className="sp11_lane">
                                    <div className={cn("sp11_flag", scores.p2 >= 100 ? "opacity-0" : "opacity-100")}>🚩</div>
                                    <div className="sp11_rope"></div>
                                    <div id="c2" className={cn("sp11_char", scores.p2 >= 100 && "winner")} 
                                         style={{ 
                                             bottom: `${Math.min(scores.p2, 95) * 0.9}%`, 
                                             left: scores.p2 > 0 ? '50%' : '140px',
                                             transform: scores.p2 > 0 ? 'translateX(-50%)' : 'translateX(0)' 
                                         }}>
                                        <svg viewBox="0 0 100 130">
                                             <g display={scores.p2 > 0 && scores.p2 < 100 ? "block" : "none"}>
                                                <path d="M30 50 L 50 20" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M70 50 L 50 30" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M35 100 L 45 115" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M65 100 L 55 115" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <rect x="25" y="45" width="50" height="55" rx="8" fill="#e53935" />
                                                <rect x="25" y="90" width="50" height="15" fill="#37474f" />
                                                <circle cx="50" cy="25" r="20" fill="#ffcc80" />
                                                <circle cx="50" cy="22" r="20" fill="#3e2723" />
                                            </g>
                                            <g display={scores.p2 === 0 || scores.p2 >= 100 ? "block" : "none"}>
                                                <path d="M10 55 L 30 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M90 55 L 70 45" stroke="#ffcc80" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M35 100 L 35 125" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <path d="M65 100 L 65 125" stroke="#333" strokeWidth="10" strokeLinecap="round" />
                                                <rect x="25" y="45" width="50" height="55" rx="8" fill="#e53935" />
                                                <rect x="25" y="90" width="50" height="15" fill="#37474f" />
                                                <circle cx="50" cy="25" r="20" fill="#ffcc80" />
                                                <circle cx="42" cy="25" r="2" fill="#333"/> <circle cx="58" cy="25" r="2" fill="#333"/>
                                                <path d="M45 35 Q 50 40 55 35" stroke="#333" strokeWidth="2" fill="none"/>
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* SAĞ OYUNCU */}
                            <div className="sp11_col">
                                <div className="sp11_ctrl">
                                    <div className="head_p2">
                                        <div className="sp11_q px-2">{p2Question?.text}</div>
                                    </div>
                                    <div className="sp11_options">{renderOptions(2)}</div>
                                </div>
                            </div>

                        </div>
                        
                        <Button variant="secondary" onClick={() => { setGameState('home'); setSunRotation(-90); setContainerClass('sky_morning'); }} className="absolute bottom-4 left-4 z-50 gap-2">
                           <Home size={16}/> Menü
                        </Button>
                    </div>
                )}

                {/* EKRAN: SONUÇ */}
                {gameState === 'win' && (
                    <div id="p_win" className="sp11_screen">
                        <div className="result_card">
                            <h2 className="text-orange-500 text-3xl font-bold m-0">YARIŞ BİTTİ</h2>
                            <h3 className="text-gray-800 text-xl my-4">{winnerText}</h3>
                            <div className="text-6xl mb-6">🏆</div>
                            <Button className="bg-teal-600 hover:bg-teal-700 text-white w-48 text-lg" onClick={() => {setGameState('home'); setSunRotation(-90); setContainerClass('sky_morning');}}>
                                Tekrar Oyna
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function SmartboardClimbingDuelPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <ClimbingDuelGameContent />
        </Suspense>
    );
}