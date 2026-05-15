'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    KeyRound, HelpCircle, CheckCircle2, RotateCcw, 
    Trophy, Maximize, Minimize, Delete, Sparkles, PartyPopper
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

// --- İÇERİKLER (Ayet, Hadis, Özlü Sözler) ---
const PHRASES = [
    { text: "TEMİZLİK İMANIN YARISIDIR", category: "Hadis-i Şerif" },
    { text: "KOLAYLAŞTIRIN ZORLAŞTIRMAYIN", category: "Hadis-i Şerif" },
    { text: "İSLAM GÜZEL AHLAKTIR", category: "Hadis-i Şerif" },
    { text: "CENNET ANNELERİN AYAKLARI ALTINDADIR", category: "Hadis-i Şerif" },
    { text: "SİZİN EN HAYIRLINIZ KURANI ÖĞRENEN VE ÖĞRETENİNİZDİR", category: "Hadis-i Şerif" },
    { text: "BİLMEYENLER BİLENLERE SORSUN", category: "Ayet-i Kerime" },
    { text: "SABIR İMANIN YARISIDIR", category: "Özlü Söz" },
    { text: "NAMAZ DİNİN DİREĞİDİR", category: "Hadis-i Şerif" },
    { text: "HAYRA VESİLE OLAN HAYRI YAPAN GİBİDİR", category: "Hadis-i Şerif" }
];

const TURKISH_ALPHABET = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".split('');

const KEYBOARD_ROWS = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç']
];

export function CryptoGame() {
    const [currentPhrase, setCurrentPhrase] = useState(PHRASES[0]);
    const [cipher, setCipher] = useState<Map<string, number>>(new Map());
    const [guesses, setGuesses] = useState<Map<number, string>>(new Map());
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    
    const [hintsRemaining, setHintsRemaining] = useState(3);
    const [errorCount, setErrorCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const initGame = useCallback(() => {
        const randomPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
        setCurrentPhrase(randomPhrase);

        const uniqueLetters = new Set<string>();
        for (const char of randomPhrase.text) {
            if (TURKISH_ALPHABET.includes(char)) {
                uniqueLetters.add(char);
            }
        }

        const numbers = Array.from({ length: 40 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        const newCipher = new Map<string, number>();
        let i = 0;
        uniqueLetters.forEach(letter => {
            newCipher.set(letter, numbers[i]);
            i++;
        });

        setCipher(newCipher);
        setGuesses(new Map());
        setSelectedNumber(null);
        setIsFinished(false);
        setHintsRemaining(3);
        setErrorCount(0);
    }, []);

    useEffect(() => {
        initGame();
    }, [initGame]);

    const handleKeyPress = (letter: string) => {
        if (selectedNumber === null || isFinished) return;

        setGuesses(prev => {
            const next = new Map(prev);
            if (letter === 'BACKSPACE') {
                next.delete(selectedNumber);
            } else {
                next.set(selectedNumber, letter);
            }
            return next;
        });

        if (letter !== 'BACKSPACE') {
            findNextEmptyNumber(selectedNumber);
        }
    };

    const findNextEmptyNumber = (currentNum: number) => {
        const textNumbers: number[] = [];
        for (const char of currentPhrase.text) {
            if (TURKISH_ALPHABET.includes(char)) {
                const num = cipher.get(char);
                if (num && !textNumbers.includes(num)) {
                    textNumbers.push(num);
                }
            }
        }

        const currentIndex = textNumbers.indexOf(currentNum);
        for (let i = 1; i < textNumbers.length; i++) {
            const nextIndex = (currentIndex + i) % textNumbers.length;
            const nextNum = textNumbers[nextIndex];
            if (!guesses.has(nextNum)) {
                setSelectedNumber(nextNum);
                break;
            }
        }
    };

    const takeHint = () => {
        if (hintsRemaining <= 0 || isFinished) return;

        const wrongNumbers: number[] = [];
        cipher.forEach((num, letter) => {
            if (guesses.get(num) !== letter) {
                wrongNumbers.push(num);
            }
        });

        if (wrongNumbers.length > 0) {
            const randomNum = wrongNumbers[Math.floor(Math.random() * wrongNumbers.length)];
            let correctLetter = '';
            cipher.forEach((num, letter) => { if (num === randomNum) correctLetter = letter; });

            setGuesses(prev => {
                const next = new Map(prev);
                next.set(randomNum, correctLetter);
                return next;
            });
            
            setHintsRemaining(prev => prev - 1);
        }
    };

    const checkSolution = () => {
        let isComplete = true;
        let isCorrect = true;

        cipher.forEach((num, letter) => {
            const guess = guesses.get(num);
            if (!guess) {
                isComplete = false;
            } else if (guess !== letter) {
                isCorrect = false;
            }
        });

        if (!isComplete) {
            alert("Lütfen tüm sayıların harf karşılığını bulunuz.");
            return;
        }

        if (isCorrect) {
            setIsFinished(true);
            setSelectedNumber(null);
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
        } else {
            setErrorCount(prev => prev + 1);
            alert("Bazı harfler yanlış eşleştirilmiş. Hatalı olanları kontrol edin!");
        }
    };

    const words = currentPhrase.text.split(' ');

    return (
        <div className={cn(
            "animate-in fade-in duration-700 transition-all",
            isFullscreen ? "fixed inset-0 z-50 bg-slate-900 overflow-y-auto p-4 md:p-8 flex items-center justify-center" : "w-full max-w-6xl mx-auto"
        )}>
            <Card className={cn(
                "bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col transition-all",
                isFullscreen ? "w-full max-w-[1600px] min-h-[90vh]" : "w-full"
            )}>
                <CardHeader className="bg-emerald-600 p-4 md:p-6 text-white relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    <div className="flex justify-between items-center relative z-10">
                        <div>
                            <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <KeyRound className="h-6 w-6" /> Şifreli Söz
                            </CardTitle>
                            <CardDescription className="text-emerald-100 font-medium text-sm">
                                Sayıların gizlediği {currentPhrase.category.toLowerCase()}i bul!
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge className="bg-black/20 hover:bg-black/30 text-white border-none text-xs px-3 py-1.5 font-bold uppercase tracking-widest hidden md:flex items-center gap-2 rounded-xl">
                                {currentPhrase.category}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20 rounded-xl">
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-8 flex-grow flex flex-col justify-between space-y-8 bg-slate-50/50">
                    
                    <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
                        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Kalan İpucu</span>
                            <div className="flex gap-1">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className={cn("h-2.5 w-8 rounded-full", i < hintsRemaining ? "bg-emerald-500" : "bg-slate-200")} />
                                ))}
                            </div>
                        </div>
                        <Button 
                            onClick={takeHint} 
                            disabled={hintsRemaining <= 0 || isFinished}
                            className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs uppercase tracking-widest h-10 rounded-xl shadow-lg shadow-amber-500/20"
                        >
                            <HelpCircle className="w-4 h-4 mr-2" /> İpucu Al
                        </Button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="flex flex-wrap justify-center gap-x-8 gap-y-6 max-w-5xl">
                            {words.map((word, wordIdx) => (
                                <div key={wordIdx} className="flex gap-1.5">
                                    {word.split('').map((char, charIdx) => {
                                        const isLetter = TURKISH_ALPHABET.includes(char);
                                        const number = isLetter ? cipher.get(char) : null;
                                        const userGuess = isLetter ? guesses.get(number!) : char;
                                        const isSelected = selectedNumber === number;

                                        if (!isLetter) {
                                            return <div key={charIdx} className="w-8 md:w-12 text-3xl font-black text-slate-400 flex items-end justify-center pb-2">{char}</div>;
                                        }

                                        return (
                                            <button
                                                key={charIdx}
                                                onClick={() => !isFinished && setSelectedNumber(number!)}
                                                className={cn(
                                                    "w-10 h-14 md:w-14 md:h-20 rounded-xl md:rounded-2xl flex flex-col items-center justify-between p-1 transition-all group overflow-hidden border-2 shadow-sm",
                                                    isSelected 
                                                        ? "bg-emerald-50 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] -translate-y-1" 
                                                        : userGuess
                                                            ? "bg-white border-slate-300 hover:border-emerald-300"
                                                            : "bg-white/50 border-slate-200 hover:bg-white",
                                                    isFinished && userGuess === char ? "bg-emerald-500 border-emerald-400 text-white" : ""
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex-1 flex items-center justify-center text-xl md:text-3xl font-black uppercase transition-colors",
                                                    isFinished && userGuess === char ? "text-white" : isSelected ? "text-emerald-600" : "text-slate-800"
                                                )}>
                                                    {userGuess || ''}
                                                </div>
                                                <div className={cn(
                                                    "w-full py-0.5 text-[10px] md:text-xs font-black text-center border-t border-slate-100",
                                                    isFinished && userGuess === char ? "bg-emerald-600/50 text-white" : isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {number}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={cn("max-w-4xl mx-auto w-full transition-opacity duration-500", isFinished ? "opacity-30 pointer-events-none" : "opacity-100")}>
                        <div className="bg-slate-900/5 backdrop-blur-sm p-4 md:p-6 rounded-[2rem] border border-slate-200 shadow-inner flex flex-col gap-2 md:gap-3">
                            {KEYBOARD_ROWS.map((row, rowIdx) => (
                                <div key={rowIdx} className="flex justify-center gap-1.5 md:gap-2">
                                    {row.map(key => {
                                        const isUsed = Array.from(guesses.values()).includes(key);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => handleKeyPress(key)}
                                                className={cn(
                                                    "w-9 h-12 md:w-14 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center text-sm md:text-xl font-black transition-all shadow-sm active:scale-95",
                                                    isUsed 
                                                        ? "bg-slate-200 text-slate-400 border-b-2 border-slate-300" 
                                                        : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 border-b-4 border-slate-300 hover:border-emerald-200"
                                                )}
                                            >
                                                {key}
                                            </button>
                                        );
                                    })}
                                    {rowIdx === 2 && (
                                        <button
                                            onClick={() => handleKeyPress('BACKSPACE')}
                                            className="w-16 h-12 md:w-24 md:h-16 rounded-lg md:rounded-xl bg-slate-300 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-all border-b-4 border-slate-400 shadow-sm active:scale-95 ml-2"
                                        >
                                            <Delete className="w-5 h-5 md:w-6 md:h-6" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </CardContent>

                <CardFooter className="bg-white p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 flex-shrink-0">
                    <div className="flex gap-4 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            onClick={initGame}
                            className="h-14 md:h-16 flex-1 md:flex-none px-6 text-slate-500 hover:text-emerald-600 font-bold rounded-2xl border-slate-200 hover:bg-emerald-50"
                        >
                            <RotateCcw className="w-5 h-5 mr-2" /> Yeni Soru
                        </Button>
                        <Button 
                            onClick={checkSolution}
                            disabled={isFinished}
                            className="h-14 md:h-16 flex-1 md:flex-none px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base md:text-lg uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/30"
                        >
                            <CheckCircle2 className="w-6 h-6 mr-3" /> Kontrol Et
                        </Button>
                    </div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-emerald-500" /> Hata Sayısı: <span className="text-slate-800 text-lg">{errorCount}</span>
                     </p>
                </CardFooter>
            </Card>

            {isFinished && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
                    <Card className="max-w-lg w-full bg-white border-none shadow-[0_0_80px_rgba(16,185,129,0.4)] rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-10 text-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                             <PartyPopper className="w-20 h-20 text-white mx-auto mb-4 animate-bounce relative z-10 drop-shadow-lg" />
                             <CardTitle className="text-4xl font-black text-white uppercase relative z-10 tracking-tight">ŞİFRE ÇÖZÜLDÜ!</CardTitle>
                        </div>
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                                <p className="text-emerald-800 font-black text-xl md:text-2xl leading-tight">
                                    "{currentPhrase.text}"
                                </p>
                                <Badge className="mt-4 bg-emerald-200 text-emerald-800 hover:bg-emerald-200 border-none">{currentPhrase.category}</Badge>
                            </div>
                            <p className="text-slate-500 font-medium text-lg">Sırrı çözmeyi başardın. Yeni bir hikmet arayışına hazır mısın?</p>
                        </CardContent>
                        <CardFooter className="p-8 pt-0">
                            <Button onClick={initGame} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                                <Sparkles className="w-6 h-6 mr-2" /> YENİ ŞİFRE GETİR
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}