'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

// --- TYPEWRITER METİN EFEKTİ (Tıklayınca Hızlı Tamamlama + HTML Varlık Koruması) ---
export const TypewriterText = ({ 
    content, 
    onComplete, 
    speed = 40, 
    className 
}: { 
    content: string; 
    onComplete?: () => void; 
    speed?: number; 
    className?: string; 
}) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const currentIndexRef = useRef(0);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
      
    useEffect(() => {
        setDisplayedContent('');
        setIsCompleted(false);
        currentIndexRef.current = 0;
    }, [content]);

    useEffect(() => {
        if (isCompleted) return;

        const intervalId = setInterval(() => {
            if (currentIndexRef.current >= content.length) {
                clearInterval(intervalId);
                setIsCompleted(true);
                if (onCompleteRef.current) onCompleteRef.current();
                return;
            }
            
            const char = content.charAt(currentIndexRef.current);
            if (char === '<') {
                const closingIndex = content.indexOf('>', currentIndexRef.current);
                currentIndexRef.current = closingIndex !== -1 ? closingIndex + 1 : currentIndexRef.current + 1;
            } else if (char === '&') {
                const semiIndex = content.indexOf(';', currentIndexRef.current);
                if (semiIndex !== -1 && semiIndex - currentIndexRef.current <= 8) {
                    currentIndexRef.current = semiIndex + 1;
                } else {
                    currentIndexRef.current++;
                }
            } else {
                currentIndexRef.current++;
            }
            
            setDisplayedContent(content.substring(0, currentIndexRef.current));
        }, speed);

        return () => clearInterval(intervalId);
    }, [content, speed, isCompleted]); 

    const finishImmediately = () => {
        if (!isCompleted) {
            currentIndexRef.current = content.length;
            setDisplayedContent(content);
            setIsCompleted(true);
            onCompleteRef.current?.();
        }
    };

    if (isCompleted) {
        return <div className={cn("highlight-text", className)} dangerouslySetInnerHTML={{ __html: content }} />;
    }
    return (
        <div
            onClick={finishImmediately}
            title="Tamamını hemen göstermek için dokunun"
            className={cn("highlight-text cursor-pointer", className)}
            dangerouslySetInnerHTML={{ __html: displayedContent }}
        />
    );
};

// --- TÜRKÇE SES VE DİL KURALLARI YARDIMCILARI ---
export const TURKISH_ABBREVIATIONS: Record<string, string> = {
    'hz.': 'Hazreti',
    'hz': 'Hazreti',
    '(s.a.v.)': 'sallallahu aleyhi ve sellem',
    's.a.v.': 'sallallahu aleyhi ve sellem',
    '(sav)': 'sallallahu aleyhi ve sellem',
    '(s.a.s.)': 'sallallahu aleyhi ve sellem',
    's.a.s.': 'sallallahu aleyhi ve sellem',
    '(a.s.)': 'aleyhisselam',
    'a.s.': 'aleyhisselam',
    '(as)': 'aleyhisselam',
    '(r.a.)': 'radıyallahu anh',
    'r.a.': 'radıyallahu anh',
    '(ra)': 'radıyallahu anh',
    '(c.c.)': 'celle celâluhu',
    'c.c.': 'celle celâluhu',
    '(cc)': 'celle celâluhu',
    'vb.': 've benzeri',
    'vs.': 've saire',
    'ör.': 'örneğin',
    'dk.': 'dakika',
    'm.ö.': 'Milattan Önce',
    'm.s.': 'Milattan Sonra',
    'yy.': 'yüzyıl',
    'bkz.': 'bakınız',
};

export const TURKISH_TOKEN_REGEX = /(\((?:s\.a\.v\.|s\.a\.s\.|sav|a\.s\.|as|r\.a\.|ra|c\.c\.|cc)\)|(?:s\.a\.v\.|s\.a\.s\.|c\.c\.|a\.s\.|r\.a\.|Hz\.|hz\.|M\.Ö\.|M\.S\.|vb\.|vs\.|ör\.|dk\.|yy\.|bkz\.)|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*)/giu;

export function splitHtmlIntoSentences(rawHtml: string): string[] {
    if (!rawHtml || typeof rawHtml !== 'string') return [];

    // DOM varsa güvenli liste/paragraf parçalama, yoksa regex fallback
    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
        try {
            const doc = new DOMParser().parseFromString(`<div>${rawHtml}</div>`, 'text/html');
            const listItems = doc.querySelectorAll('li');
            if (listItems.length > 0) {
                return Array.from(listItems).map(li => li.innerHTML.trim()).filter(Boolean);
            }
        } catch {
            // fallback below
        }
    } else {
        const liMatches = Array.from(rawHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
            .map(m => m[1]?.trim())
            .filter(Boolean);
        if (liMatches.length > 0) return liMatches;
    }

    // Düz metinde Türkçe kısaltmaları ve sıra numaralarını (1., Hz., s.a.v., c.c. vb.) koruyarak cümlelere ayır
    const plain = rawHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plain) return [];

    // Kısaltma noktalarını geçici işaretle (cümle sonu sanılmasın)
    const protectedText = plain
        .replace(/\b(Hz|Dr|Prof|Doç|Av|St|vb|vs|ör|dk|yy|bkz|M\.Ö|M\.S|s\.a\.v|s\.a\.s|a\.s|r\.a|c\.c)\./gi, '$1__DOT__')
        .replace(/(^|\s)(\d+)\.(?=\s)/g, '$1$2__DOT__');

    const rawSentences = protectedText.match(/[^.!?]+(?:[.!?]+|$)/g) || [protectedText];
    return rawSentences
        .map(s => s.replace(/__DOT__/g, '.').trim())
        .filter(Boolean);
}

function decodeBasicEntities(input: string): string {
    return input
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
        .replace(/&ldquo;|&rdquo;/gi, '"')
        .replace(/&ndash;/gi, ', ')
        .replace(/&mdash;/gi, ', ');
}

export function prepareTurkishSpeech(rawHtmlOrText: string) {
    const cleanText = decodeBasicEntities(
        rawHtmlOrText
            .replace(/<br\s*\/?>/gi, ', ')
            .replace(/<[^>]+>/g, ' ')
    )
        .replace(/[\u2013\u2014]/g, ', ')
        .replace(/[“”„«»]/g, '"')
        .trim();

    const tokens = cleanText.split(TURKISH_TOKEN_REGEX);

    let spokenText = '';
    const spokenWordRanges: { start: number; end: number; visualIndex: number }[] = [];
    let visualWordIndex = 0;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token) continue;

        const isActualWord = /^(\((?:s\.a\.v\.|s\.a\.s\.|sav|a\.s\.|as|r\.a\.|ra|c\.c\.|cc)\)|(?:s\.a\.v\.|s\.a\.s\.|c\.c\.|a\.s\.|r\.a\.|Hz\.|hz\.|M\.Ö\.|M\.S\.|vb\.|vs\.|ör\.|dk\.|yy\.|bkz\.)|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*)$/iu.test(token);

        if (!isActualWord) {
            spokenText += token;
            continue;
        }

        const currentVisualIdx = visualWordIndex++;
        const lowerToken = token.toLowerCase();
        
        const expansion = TURKISH_ABBREVIATIONS[lowerToken];
        const speechRepresentation = expansion || token;

        const subWords = speechRepresentation.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [speechRepresentation];
        for (let j = 0; j < subWords.length; j++) {
            const subWord = subWords[j];
            const start = spokenText.length;
            spokenText += subWord;
            const end = spokenText.length;
            spokenWordRanges.push({ start, end, visualIndex: currentVisualIdx });
            if (j < subWords.length - 1) {
                spokenText += ' ';
            }
        }
    }

    return { spokenText, spokenWordRanges, totalVisualWords: visualWordIndex };
}

// --- TÜRKÇE SES SEÇİCİ VE YARDIMCILARI ---
export interface TurkishVoiceOption {
    name: string;
    displayName: string;
    isNatural: boolean;
    gender: 'female' | 'male' | 'unknown';
}

export const getTurkishVoices = (): TurkishVoiceOption[] => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return [];

    const trVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        return lang.startsWith('tr') || lang.includes('tur');
    });

    return trVoices.map(v => {
        const nameLower = v.name.toLowerCase();
        const isEmel = nameLower.includes('emel');
        const isAhmet = nameLower.includes('ahmet');
        const isDilara = nameLower.includes('dilara');
        const isTolga = nameLower.includes('tolga');
        const isGoogle = nameLower.includes('google');
        const isApple = nameLower.includes('yelda') || nameLower.includes('cem');
        const isNatural = (isEmel || isAhmet || isDilara || nameLower.includes('natural') || nameLower.includes('doğal') || nameLower.includes('neural') || isGoogle || isApple) && !nameLower.includes('desktop');

        let gender: 'female' | 'male' | 'unknown' = 'unknown';
        if (isEmel || isDilara || nameLower.includes('yelda') || nameLower.includes('female')) gender = 'female';
        else if (isAhmet || isTolga || nameLower.includes('cem') || nameLower.includes('male')) gender = 'male';

        let displayName = v.name;
        if (isEmel) displayName = 'Microsoft Emel (Doğal İnsan Sesi - Kadın) ✨';
        else if (isAhmet) displayName = 'Microsoft Ahmet (Doğal İnsan Sesi - Erkek) ✨';
        else if (isDilara) displayName = 'Microsoft Dilara (Doğal İnsan Sesi) ✨';
        else if (isGoogle) displayName = 'Google Türkçe (Doğal Ses) ✨';
        else if (isApple) displayName = `${v.name} (Apple Gelişmiş Ses) ✨`;
        else if (isTolga) displayName = 'Microsoft Tolga (Windows Mekanik Ses) ⚠️';

        return {
            name: v.name,
            displayName,
            isNatural,
            gender
        };
    });
};

// En doğal insan sesini seçen yardımcı (Edge/Windows Natural Neural, Google ve Apple sesleri)
export const getBestTurkishVoice = (preferredVoiceName?: string | null): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const trVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase().replace('_', '-');
        return lang.startsWith('tr') || lang.includes('tur');
    });

    if (trVoices.length === 0) return null;

    // 0. Tercih edilen ses (Parametre veya localStorage'dan)
    const pref = preferredVoiceName || (typeof window !== 'undefined' ? localStorage.getItem('preferred_turkish_voice') : null);
    if (pref && pref !== 'auto') {
        const matched = trVoices.find(v => v.name.toLowerCase() === pref.toLowerCase() || v.name.toLowerCase().includes(pref.toLowerCase()));
        if (matched) return matched;
    }

    // 1. Doğal İnsan Sesi (Natural / Neural) - Microsoft Emel / Ahmet (Edge veya Windows 11 Doğal)
    const emel = trVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('emel') && !name.includes('desktop');
    });
    if (emel) return emel;

    const ahmet = trVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('ahmet') && !name.includes('desktop');
    });
    if (ahmet) return ahmet;

    const naturalVoice = trVoices.find(v => {
        const name = v.name.toLowerCase();
        return (name.includes('natural') || name.includes('doğal') || name.includes('neural')) && !name.includes('desktop');
    });
    if (naturalVoice) return naturalVoice;

    // 2. Google Doğal Türkçe Sesi
    const googleVoice = trVoices.find(v => v.name.toLowerCase().includes('google'));
    if (googleVoice) return googleVoice;

    // 3. Apple Gelişmiş Türkçe Sesleri (Yelda / Cem Enhanced)
    const appleEnhanced = trVoices.find(v => {
        const name = v.name.toLowerCase();
        return (name.includes('yelda') || name.includes('cem')) && name.includes('enhanced');
    });
    if (appleEnhanced) return appleEnhanced;

    const appleVoice = trVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('yelda') || name.includes('cem');
    });
    if (appleVoice) return appleVoice;

    // 4. Online veya bulut tabanlı yüksek kaliteli Türkçe ses
    const onlineVoice = trVoices.find(v => v.name.toLowerCase().includes('online') && !v.name.toLowerCase().includes('desktop'));
    if (onlineVoice) return onlineVoice;

    // 5. Varsayılan Türkçe ses
    const defaultVoice = trVoices.find(v => v.default);
    return defaultVoice || trVoices[0];
};

export const getTurkishSpeechParams = (voice: SpeechSynthesisVoice | null): { rate: number; pitch: number } => {
    if (!voice) return { rate: 0.83, pitch: 1.0 };
    const nameLower = voice.name.toLowerCase();
    const isTolga = nameLower.includes('tolga') || nameLower.includes('desktop');
    
    if (isTolga) {
        // Tolga mekanik ve bas tonludur; pitch 1.06 yapınca metalik boğukluğu azalır, rate 0.86 ile daha anlaşılır ve canlı olur
        return { rate: 0.86, pitch: 1.06 };
    }
    
    // Doğal stüdyo sesleri (Emel, Ahmet, Google, Apple) için akıcı ve berrak insan konuşma hızı
    return { rate: 0.83, pitch: 1.0 };
};

// --- YÜKSEK PERFORMANSLI KARAOKE VURGULAMA BİLEŞENİ ---
// HTML her kelimede tekrar tekrar parse EDİLMEZ; tek seferde parse edilip memoize edilir.
interface AstToken {
    text: string;
    isWord: boolean;
    wordIndex?: number;
}

interface AstNode {
    type: 'text' | 'element';
    tagName?: string;
    className?: string;
    tokens?: AstToken[];
    children?: AstNode[];
}

export interface HighlightedSentenceProps {
    htmlContent: string;
    activeWordIndex: number | null;
    isLightBoard?: boolean;
    className?: string;
    isModal?: boolean;
}

export const HighlightedSentence = ({ 
    htmlContent, 
    activeWordIndex, 
    isLightBoard = false, 
    className,
    isModal = false
}: HighlightedSentenceProps) => {
    const isHighlightingActive = activeWordIndex !== null && activeWordIndex !== undefined;

    // HTML yapısını yalnızca vurgulama aktifken ve içerik değiştiğinde parse et (Hook sırası korunur)
    const astRoot = useMemo<AstNode | null>(() => {
        if (!isHighlightingActive || typeof window === 'undefined') return null;
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
            const root = doc.body.firstElementChild;
            if (!root) return null;

            let wordCounter = 0;

            const buildAst = (node: Node): AstNode | null => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.nodeValue || '';
                    if (!text) return null;

                    const rawTokens = text.split(TURKISH_TOKEN_REGEX);
                    const tokens: AstToken[] = [];

                    for (const raw of rawTokens) {
                        if (!raw) continue;
                        const isWord = /^(\((?:s\.a\.v\.|s\.a\.s\.|sav|a\.s\.|as|r\.a\.|ra|c\.c\.|cc)\)|(?:s\.a\.v\.|s\.a\.s\.|c\.c\.|a\.s\.|r\.a\.|Hz\.|hz\.|M\.Ö\.|M\.S\.|vb\.|vs\.|ör\.|dk\.|yy\.|bkz\.)|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*)$/iu.test(raw);
                        if (isWord) {
                            tokens.push({ text: raw, isWord: true, wordIndex: wordCounter++ });
                        } else {
                            tokens.push({ text: raw, isWord: false });
                        }
                    }

                    return { type: 'text', tokens };
                }

                if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as HTMLElement;
                    const tagName = el.tagName.toLowerCase();
                    const children: AstNode[] = [];
                    for (const child of Array.from(el.childNodes)) {
                        const childAst = buildAst(child);
                        if (childAst) children.push(childAst);
                    }
                    return { type: 'element', tagName, className: el.className || undefined, children };
                }

                return null;
            };

            return buildAst(root);
        } catch {
            return null;
        }
    }, [htmlContent, isHighlightingActive]);

    // Okuma aktif değilse veya AST oluşmadıysa doğrudan orijinal HTML'i bas
    if (!isHighlightingActive || !astRoot) {
        return <div className={cn("highlight-text", className)} dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }

    const renderAstNode = (node: AstNode, key: string): React.ReactNode => {
        if (node.type === 'text' && node.tokens) {
            return node.tokens.map((token, idx) => {
                if (!token.isWord || token.wordIndex === undefined) {
                    return <span key={`${key}-${idx}`}>{token.text}</span>;
                }

                const isCurrent = token.wordIndex === activeWordIndex;
                const isPast = token.wordIndex < activeWordIndex;

                if (isCurrent) {
                    return (
                        <mark
                            key={`${key}-${idx}`}
                            className={cn(
                                "inline-block font-black rounded-lg transition-all duration-150 transform scale-105 select-none",
                                isModal 
                                    ? "px-2 sm:px-4 py-0.5 sm:py-1 mx-1 sm:mx-1.5 rounded-xl sm:rounded-2xl ring-4 ring-amber-300 shadow-2xl" 
                                    : "px-1.5 py-0.5 mx-0.5",
                                isLightBoard
                                    ? "bg-amber-300 text-slate-950 ring-2 ring-amber-500/80 shadow-md shadow-amber-400/40"
                                    : "bg-amber-400 text-slate-950 ring-2 ring-amber-300/90 shadow-lg shadow-amber-400/60"
                            )}
                        >
                            {token.text}
                        </mark>
                    );
                }

                if (isPast) {
                    return (
                        <span 
                            key={`${key}-${idx}`}
                            className={cn(
                                "transition-colors duration-150 font-bold",
                                isLightBoard 
                                    ? "text-amber-800/85 underline decoration-amber-400/70 decoration-2 underline-offset-2" 
                                    : "text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                            )}
                        >
                            {token.text}
                        </span>
                    );
                }

                return <span key={`${key}-${idx}`}>{token.text}</span>;
            });
        }

        if (node.type === 'element' && node.tagName) {
            if (node.tagName === 'br') return <br key={key} />;
            const children = (node.children || []).map((ch, i) => renderAstNode(ch, `${key}-${i}`));
            switch (node.tagName) {
                case 'strong':
                case 'b':
                    return <strong key={key} className={node.className}>{children}</strong>;
                case 'em':
                case 'i':
                    return <em key={key} className={node.className}>{children}</em>;
                case 'u':
                    return <u key={key} className={node.className}>{children}</u>;
                case 'mark':
                    return <mark key={key} className={node.className}>{children}</mark>;
                case 'sub':
                    return <sub key={key} className={node.className}>{children}</sub>;
                case 'sup':
                    return <sup key={key} className={node.className}>{children}</sup>;
                case 'ul':
                    return <ul key={key} className={node.className}>{children}</ul>;
                case 'ol':
                    return <ol key={key} className={node.className}>{children}</ol>;
                case 'li':
                    return <li key={key} className={node.className}>{children}</li>;
                case 'span':
                    return <span key={key} className={node.className}>{children}</span>;
                case 'p':
                    return <p key={key} className={node.className}>{children}</p>;
                default:
                    return <span key={key} className={node.className}>{children}</span>;
            }
        }

        return null;
    };

    return (
        <div className={cn("highlight-text", className)}>
            {renderAstNode(astRoot, 'hl-root')}
        </div>
    );
};
