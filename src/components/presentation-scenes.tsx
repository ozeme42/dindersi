'use client';

import React from 'react';

export interface SceneConfig {
    id: string;
    name: string;
    realmTitle: string;
    bgGradient: string;
    ambientGlow: string;
    accentColor: string;
    borderColor: string;
    themeKey: 'sapphire' | 'amber' | 'emerald' | 'amethyst' | 'ruby' | 'gold';
    motifIcon: string;
}

export const PRESENTATION_SCENES: SceneConfig[] = [
    // 0: Hilal Meydanı (Mavi/Safir)
    {
        id: 'hilal-meydani',
        name: 'Hilal Meydanı',
        realmTitle: '1. Sahne: Hilal Meydanı & Cami-i Kebir',
        bgGradient: 'radial-gradient(ellipse 120% 90% at 50% -10%, #1e40af 0%, #0f172a 55%, #020617 100%)',
        ambientGlow: 'rgba(56, 189, 248, 0.35)',
        accentColor: '#38bdf8',
        borderColor: '#0284c7',
        themeKey: 'sapphire',
        motifIcon: '🌙',
    },
    // 1: Altın Kütüphane (Amber/Altın)
    {
        id: 'altin-kutuphane',
        name: 'Altın Meclis',
        realmTitle: '2. Sahne: Altın İlim Meclisi & Kütüphane',
        bgGradient: 'radial-gradient(ellipse 120% 90% at 50% -10%, #b45309 0%, #451a03 55%, #180600 100%)',
        ambientGlow: 'rgba(245, 158, 11, 0.4)',
        accentColor: '#f59e0b',
        borderColor: '#d97706',
        themeKey: 'amber',
        motifIcon: '📜',
    },
    // 2: Zümrüt Vaha (Yeşil/Zümrüt)
    {
        id: 'zumrut-vaha',
        name: 'Zümrüt Vaha',
        realmTitle: '3. Sahne: Zümrüt Vaha & Hayat Pınarı',
        bgGradient: 'radial-gradient(ellipse 120% 90% at 50% -10%, #047857 0%, #064e3b 55%, #022c22 100%)',
        ambientGlow: 'rgba(16, 185, 129, 0.4)',
        accentColor: '#10b981',
        borderColor: '#059669',
        themeKey: 'emerald',
        motifIcon: '🌴',
    },
    // 3: Gök Kubbe (Mor/Ametist)
    {
        id: 'gok-kubbe',
        name: 'Gök Kubbe',
        realmTitle: '4. Sahne: Gök Kubbe & Tefekkür Rasathanesi',
        bgGradient: 'radial-gradient(ellipse 120% 90% at 50% -10%, #6d28d9 0%, #3b0764 55%, #160228 100%)',
        ambientGlow: 'rgba(192, 132, 252, 0.4)',
        accentColor: '#c084fc',
        borderColor: '#9333ea',
        themeKey: 'amethyst',
        motifIcon: '✨',
    },
    // 4: Şafak Sarayı (Kırmızı/Yakut)
    {
        id: 'hikmet-sarayi',
        name: 'Hikmet Sarayı',
        realmTitle: '5. Sahne: Şafak Vakti & Hikmet Sarayı',
        bgGradient: 'radial-gradient(ellipse 120% 90% at 50% -10%, #be123c 0%, #4c0519 55%, #200109 100%)',
        ambientGlow: 'rgba(251, 113, 133, 0.4)',
        accentColor: '#fb7185',
        borderColor: '#e11d48',
        themeKey: 'ruby',
        motifIcon: '🌅',
    },
    // 5: Hazine Odası (Altın/Topaz)
    {
        id: 'hazine-odasi',
        name: 'Hazine Odası',
        realmTitle: '6. Sahne: Salih Ameller Hazine Sandığı',
        bgGradient: 'radial-gradient(ellipse 120% 90% at 50% -10%, #d97706 0%, #1e1b4b 55%, #09051c 100%)',
        ambientGlow: 'rgba(251, 191, 36, 0.45)',
        accentColor: '#fbbf24',
        borderColor: '#f59e0b',
        themeKey: 'gold',
        motifIcon: '🏆',
    },
];

export function getSceneForStep(stepIndex: number): SceneConfig {
    return PRESENTATION_SCENES[stepIndex % PRESENTATION_SCENES.length];
}

export function PresentationSceneBackground({
    stepIndex,
}: {
    stepIndex: number;
}) {
    const scene = getSceneForStep(stepIndex);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700 z-0">
            {/* 1. Temel Sahne Radyal Renk Geçişi */}
            <div
                className="absolute inset-0 transition-all duration-700"
                style={{
                    background: scene.bgGradient,
                }}
            />

            {/* 2. Tepe Işık Spotu */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] max-w-[1700px] h-[55vh] pointer-events-none transition-all duration-700 blur-[80px]"
                style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${scene.ambientGlow}, transparent 75%)`,
                }}
            />

            {/* 3. İslami Geometrik Motif Ağı (Arabesque Subtle Grid) */}
            <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 1px, transparent 1px),
                        linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.15) 75%),
                        linear-gradient(-45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.15) 75%)
                    `,
                    backgroundSize: '36px 36px, 36px 36px, 36px 36px',
                }}
            />

            {/* 4. Sahneye Özel Görsel Motif Öğeleri */}
            {scene.themeKey === 'sapphire' && (
                <>
                    {/* Parıldayan Hilal */}
                    <div className="absolute right-12 top-10 text-6xl opacity-80 filter drop-shadow-[0_0_25px_#38bdf8]">
                        🌙
                    </div>
                    {/* Cami Kubbeleri ve Minare Silüeti */}
                    <div className="absolute bottom-16 left-0 right-0 h-32 flex justify-around items-end opacity-20">
                        <div className="w-6 h-40 bg-sky-950 rounded-t-full shadow-2xl" />
                        <div className="w-36 h-28 bg-sky-950 rounded-t-full" />
                        <div className="w-56 h-36 bg-sky-950 rounded-t-full" />
                        <div className="w-36 h-28 bg-sky-950 rounded-t-full" />
                        <div className="w-6 h-40 bg-sky-950 rounded-t-full shadow-2xl" />
                    </div>
                </>
            )}

            {scene.themeKey === 'amber' && (
                <>
                    {/* Kandil Fenerleri */}
                    <div className="absolute left-10 top-8 text-5xl opacity-85 filter drop-shadow-[0_0_20px_#f59e0b] animate-bounce duration-1000">
                        🏮
                    </div>
                    <div className="absolute right-12 top-8 text-5xl opacity-85 filter drop-shadow-[0_0_20px_#f59e0b] animate-bounce duration-1000 delay-300">
                        🏮
                    </div>
                </>
            )}

            {scene.themeKey === 'emerald' && (
                <>
                    {/* Vaha Hurma Ağaçları ve Yeşillik */}
                    <div className="absolute left-6 bottom-16 text-6xl opacity-25 filter drop-shadow">
                        🌴
                    </div>
                    <div className="absolute right-8 bottom-16 text-6xl opacity-25 filter drop-shadow">
                        🌴
                    </div>
                </>
            )}

            {scene.themeKey === 'amethyst' && (
                <>
                    {/* Kozmik Galaksi Yıldızları */}
                    <div className="absolute right-16 top-12 text-5xl opacity-75 filter drop-shadow-[0_0_30px_#c084fc] animate-spin duration-1000">
                        ⭐
                    </div>
                    <div className="absolute left-16 top-24 text-4xl opacity-70 filter drop-shadow-[0_0_20px_#c084fc]">
                        ✨
                    </div>
                </>
            )}

            {scene.themeKey === 'ruby' && (
                <>
                    {/* Şafak Işığı */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-6xl opacity-80 filter drop-shadow-[0_0_35px_#fb7185]">
                        🌅
                    </div>
                </>
            )}

            {scene.themeKey === 'gold' && (
                <>
                    {/* Hazine ve Ödül Işıltısı */}
                    <div className="absolute right-14 top-10 text-5xl opacity-85 filter drop-shadow-[0_0_30px_#fbbf24]">
                        💎
                    </div>
                    <div className="absolute left-14 top-10 text-5xl opacity-85 filter drop-shadow-[0_0_30px_#fbbf24]">
                        🏆
                    </div>
                </>
            )}

            {/* 5. Uçuşan Parıltılı Yıldızlar */}
            {[
                { left: '10%', top: '20%', size: '3px', delay: '0s' },
                { left: '20%', top: '35%', size: '4px', delay: '1.2s' },
                { left: '35%', top: '15%', size: '3px', delay: '0.6s' },
                { left: '50%', top: '25%', size: '4px', delay: '1.8s' },
                { left: '68%', top: '18%', size: '3px', delay: '0.9s' },
                { left: '82%', top: '30%', size: '4px', delay: '2.1s' },
                { left: '90%', top: '15%', size: '3px', delay: '0.3s' },
            ].map((p, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-white opacity-80"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        animation: `twinkle 2.5s infinite ease-in-out ${p.delay}`,
                        boxShadow: `0 0 8px 2px ${scene.accentColor}`,
                    }}
                />
            ))}
        </div>
    );
}
