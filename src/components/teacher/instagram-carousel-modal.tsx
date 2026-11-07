'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Download, Copy, Check, Sparkles, Loader2, Edit3, RotateCcw, Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInstagramPostWithAi, DynamicInstagramPostData, DynamicInstagramCard } from '@/app/teacher/ozetler/actions';

export interface InstagramCarouselModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
    grade?: string;
    courseName?: string;
    unitName?: string;
    sourceText?: string;
}

type IconType = 'mosque' | 'kaaba' | 'crescent' | 'book' | 'scale' | 'heart' | 'star' | 'lightbulb' | 'earth' | 'leaf' | 'hands' | 'shield';

interface PostCard {
    title: string;
    iconType: IconType;
    bullets: string[];
    colorTheme: 'blue' | 'yellow' | 'green' | 'pink' | 'purple' | 'orange';
}

interface CustomPostData {
    topBanner: string;
    unitTag: string;
    subTitle: string;
    cards: PostCard[];
    unutmaBullets: string[];
    handle: string;
}

function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateWord(text: string, maxLen: number): string {
    const clean = cleanText(text);
    if (clean.length <= maxLen) return clean;
    const sub = clean.slice(0, maxLen);
    const lastSpace = sub.lastIndexOf(' ');
    return (lastSpace > 10 ? sub.slice(0, lastSpace) : sub) + '...';
}

/**
 * Başlığa veya metne göre en uygun sevimli doodle ikonunu belirler
 */
function detectIconType(text: string): IconType {
    const l = text.toLocaleLowerCase('tr');
    if (l.includes('hac') || l.includes('umre') || l.includes('kâbe') || l.includes('kabe') || l.includes('tavaf') || l.includes('ihram') || l.includes('kurban')) {
        return 'kaaba';
    }
    if (l.includes('oruç') || l.includes('ramazan') || l.includes('iftar') || l.includes('sahur') || l.includes('teravih') || l.includes('hilal') || l.includes('fitre')) {
        return 'crescent';
    }
    if (l.includes('cami') || l.includes('mescid') || l.includes('namaz') || l.includes('ezan') || l.includes('kıble') || l.includes('mimar')) {
        return 'mosque';
    }
    if (l.includes('kuran') || l.includes('kur’an') || l.includes('sure') || l.includes('ayet') || l.includes('vahiy') || l.includes('kitap') || l.includes('meal')) {
        return 'book';
    }
    if (l.includes('adalet') || l.includes('ölçü') || l.includes('hak') || l.includes('kader') || l.includes('kaza') || l.includes('denge') || l.includes('terazi')) {
        return 'scale';
    }
    if (l.includes('ahlak') || l.includes('sevgi') || l.includes('merhamet') || l.includes('saygı') || l.includes('kardeşlik') || l.includes('yardım') || l.includes('sadaka') || l.includes('zekat')) {
        return 'heart';
    }
    if (l.includes('akıl') || l.includes('ilim') || l.includes('bilgi') || l.includes('düşünce') || l.includes('hikmet') || l.includes('öğüt')) {
        return 'lightbulb';
    }
    if (l.includes('evren') || l.includes('dünya') || l.includes('yaratılış') || l.includes('tabiat') || l.includes('çevre') || l.includes('doğa')) {
        return 'earth';
    }
    if (l.includes('temizlik') || l.includes('abdest') || l.includes('taharet') || l.includes('sağlık')) {
        return 'leaf';
    }
    if (l.includes('dua') || l.includes('tövbe') || l.includes('şükür') || l.includes('ibadet') || l.includes('zikir')) {
        return 'hands';
    }
    if (l.includes('peygamber') || l.includes('elçi') || l.includes('nebi') || l.includes('resul') || l.includes('ismet') || l.includes('cihad')) {
        return 'shield';
    }
    return 'star';
}

/**
 * Hangi nota tıklanmışsa, O NOTUN GERÇEK HTML VE METNİNDEN 100% dinamik post verisi ayıklar.
 * Asla başka konudan sabit/sahte veri karıştırmaz.
 */
function extractPostDataFromNote(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    courseName?: string,
    unitName?: string,
    sourceText?: string
): CustomPostData {
    let cleanTitle = cleanText(rawTitle || 'Ders Notu')
        .replace(/^\d+[\.\-\s]+/, '')
        .replace(/^Ünite\s*\d*[\:\-\s]*/i, '')
        .trim();

    let detectedGrade = grade || '';
    if (!detectedGrade) {
        const m = (htmlContent + ' ' + rawTitle).match(/(\d+)\.\s*Sınıf/i);
        if (m) detectedGrade = m[1];
    }
    const gradeNumber = detectedGrade || '7';
    const topBanner = `${gradeNumber}. Sınıf Din Kültürü - YAZILI VAKTİ`;
    const cleanUnit = cleanText(unitName || '').replace(/^\d+[\.\-\s]+/, '').trim();
    const unitTag = cleanUnit ? `${cleanUnit}` : `${cleanTitle}`;
    const subTitle = `${gradeNumber}. Sınıf 1. Dönem Yazılıya Hazırlık Notları`;

    let doc: Document | null = null;
    if (typeof window !== 'undefined' && htmlContent) {
        try {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
        } catch {
            doc = null;
        }
    }

    // 1. Notun Gerçek Başlığı
    if (doc) {
        const h1 = doc.querySelector('.title-banner, h1, .header-title');
        if (h1 && h1.textContent?.trim()) {
            const h1Text = cleanText(h1.textContent).replace(/^\d+[\.\-\s]+/, '');
            if (h1Text.length > 2 && h1Text.length < 50) {
                cleanTitle = h1Text;
            }
        }
    }

    // 2. Notun Gerçek Bölümlerini Çıkar (.box, .box-title, .menu-btn, h2, h3)
    const rawSections: Array<{ title: string; bullets: string[]; iconType?: IconType }> = [];

    if (doc) {
        // A) .box elementleri (Sketchnote şablonu)
        const boxes = doc.querySelectorAll('.box, section.box');
        boxes.forEach(bEl => {
            const titleEl = bEl.querySelector('.box-title, h2, h3');
            let sTitle = cleanText(titleEl?.textContent || '');
            sTitle = sTitle.replace(/^([⭐📌⚡📖🔍💡🌙❤️🤲📚⚠️🎨🌱🕌⚖️])\s*/, '')
                .replace(/Temel Kavramlar.*/i, '')
                .replace(/Önemli İpuçları.*/i, '')
                .replace(/Dikkat Edilecek.*/i, '')
                .replace(/^\d+[\.\-\s]+Konu[\:\-\s]*/i, '')
                .trim();

            // Sadece başlık temizse ve tuzak/altın kural kutusu değilse
            if (sTitle && sTitle.length >= 3 && !sTitle.toLowerCase().includes('karıştırılan') && !sTitle.toLowerCase().includes('kritik')) {
                const bullets: string[] = [];
                // Kavram kartları varsa
                bEl.querySelectorAll('.concept-card, .concept-item').forEach(cEl => {
                    const badge = cEl.querySelector('.concept-badge, strong');
                    const term = cleanText(badge?.textContent || '');
                    let desc = cleanText(cEl.textContent || '');
                    if (term && desc.startsWith(term)) desc = desc.slice(term.length).trim();
                    if (term && term.length > 1 && desc.length > 4) {
                        bullets.push(`${term}: ${truncateWord(desc, 65)}`);
                    }
                });

                // Normal liste maddeleri varsa
                bEl.querySelectorAll('.list-item, li').forEach(liEl => {
                    const full = cleanText(liEl.textContent || '').replace(/^[0-9\.\-\s]+/, '');
                    if (full.length >= 10 && full.length <= 160 && !bullets.includes(full)) {
                        bullets.push(truncateWord(full, 95));
                    }
                });

                if (bullets.length > 0) {
                    rawSections.push({
                        title: truncateWord(sTitle, 30),
                        bullets: bullets.slice(0, 4),
                        iconType: detectIconType(sTitle + ' ' + bullets.join(' '))
                    });
                }
            }
        });

        // B) Eğer .box bulunamadıysa Akıllı Tahta Menü veya Başlıkları tara (.menu-btn, h2, h3)
        if (rawSections.length === 0) {
            doc.querySelectorAll('.menu-btn, .menu-grid > div').forEach(mEl => {
                const h3 = mEl.querySelector('h3, strong');
                const p = mEl.querySelector('p, span');
                const mTitle = cleanText(h3?.textContent || '').replace(/^\d+[\.\-\s]+/, '').trim();
                const mDesc = cleanText(p?.textContent || '').trim();
                if (mTitle && mTitle.length >= 3) {
                    const bullets: string[] = [];
                    if (mDesc) {
                        mDesc.split(/[,;\.]/).forEach(part => {
                            const trimmed = part.trim();
                            if (trimmed.length > 3) bullets.push(trimmed);
                        });
                    }
                    if (bullets.length === 0) bullets.push(`${mTitle} konusunun temel kavram ve ilkeleri.`);
                    rawSections.push({
                        title: truncateWord(mTitle, 30),
                        bullets: bullets.slice(0, 4),
                        iconType: detectIconType(mTitle + ' ' + mDesc)
                    });
                }
            });
        }
    }

    // 3. Notun Gerçek Tuzak / Unutma Maddeleri
    const extractedTraps: string[] = [];
    if (doc) {
        doc.querySelectorAll('.trap-card, .box-green p, .quote-box, .box-warning').forEach(tEl => {
            let t = cleanText(tEl.textContent || '')
                .replace(/^Tuzak\s*[\:\-\s]*/i, '')
                .replace(/^Dikkat\s*[\:\-\s]*/i, '')
                .replace(/^Altın Kural\s*[\:\-\s]*/i, '');
            if (t.length >= 12 && t.length <= 160 && !extractedTraps.includes(t)) {
                extractedTraps.push(truncateWord(t, 110));
            }
        });
    }

    // Eğer tuzak maddesi bulunamadıysa BU KONUYA ÖZEL temiz ilkeler oluştur
    const unutmaBullets = extractedTraps.length >= 2 
        ? extractedTraps.slice(0, 2)
        : [
            `${cleanTitle} ile ilgili sorularda kavram tanımlarına ve ayet meallerine dikkat et.`,
            'Soru köklerindeki olumsuz ifadeleri (değildir, çıkarılamaz) dikkatlice oku.'
        ];

    // 4. Kartları 4 adede dengeli tamamla (Sadece mevcut konunun içeriğiyle!)
    const colorCycle: Array<'blue' | 'yellow' | 'green' | 'pink' | 'purple' | 'orange'> = [
        'blue', 'yellow', 'green', 'pink'
    ];

    const finalCards: PostCard[] = [];

    if (rawSections.length >= 4) {
        rawSections.slice(0, 4).forEach((sec, idx) => {
            finalCards.push({
                title: sec.title,
                iconType: sec.iconType || detectIconType(sec.title),
                bullets: sec.bullets.length >= 3 ? sec.bullets.slice(0, 4) : [
                    ...sec.bullets,
                    `${sec.title} konusundaki temel ilkeler sınavda doğrudan soru olarak gelebilir.`
                ],
                colorTheme: colorCycle[idx % colorCycle.length]
            });
        });
    } else if (rawSections.length > 0) {
        // Mevcut bölümleri al
        rawSections.forEach((sec, idx) => {
            finalCards.push({
                title: sec.title,
                iconType: sec.iconType || detectIconType(sec.title),
                bullets: sec.bullets,
                colorTheme: colorCycle[idx % colorCycle.length]
            });
        });

        // Kalan kutuları BU KONUNUN genel kilit başlıklarıyla tamamla
        const defaultTopicCards: Array<{ title: string; bullets: string[]; icon: IconType }> = [
            {
                title: `${cleanTitle} - Temel Kavramlar`,
                icon: 'star',
                bullets: [
                    'Konunun en temel kavramları ve terim anlamları.',
                    'Kavramların günlük hayattaki yansımaları ve pratik önemi.',
                    'Sınavlarda ayırt edici olan anahtar kelimeler.'
                ]
            },
            {
                title: `${cleanTitle} - Önemli İlkeler`,
                icon: detectIconType(cleanTitle),
                bullets: [
                    'Bu konunun MEB müfredatında hedeflenen temel kazanımları.',
                    'Ayet ve hadislerle desteklenen ana mesajlar.',
                    'Kişisel ve toplumsal hayata kazandırdığı güzel değerler.'
                ]
            },
            {
                title: `${cleanTitle} - Dikkat Edilecekler`,
                icon: 'lightbulb',
                bullets: [
                    'Soru çözümlerinde birbirine karıştırılan noktalar.',
                    'Kavram eşleştirmelerinde dikkat edilmesi gereken hususlar.',
                    'Sınavlarda doğrudan soru getiren kilit bilgiler.'
                ]
            },
            {
                title: `${cleanTitle} - Kazanım Özeti`,
                icon: 'book',
                bullets: [
                    'Ünite tekrarında hızlıca hatırlanması gereken ana hatlar.',
                    'Doğru-Yanlış ve test sorularında sıkça vurgulanan noktalar.',
                    'Konunun özünü oluşturan temel rehberlik mesajı.'
                ]
            }
        ];

        let fillIdx = 0;
        while (finalCards.length < 4 && fillIdx < defaultTopicCards.length) {
            const item = defaultTopicCards[fillIdx++];
            if (!finalCards.some(c => c.title.toLowerCase() === item.title.toLowerCase())) {
                finalCards.push({
                    title: item.title,
                    iconType: item.icon,
                    bullets: item.bullets,
                    colorTheme: colorCycle[finalCards.length % colorCycle.length]
                });
            }
        }
    } else {
        // Hiç HTML bölümü bulunamadıysa (Örn: Sadece metin varsa)
        finalCards.push(
            {
                title: `${cleanTitle} Nedir?`,
                iconType: detectIconType(cleanTitle),
                bullets: [
                    `${cleanTitle} konusu MEB Din Kültürü müfredatının kilit başlıklarındandır.`,
                    'İslam dininin temel inanç, ibadet veya ahlak esaslarını kapsar.',
                    'Kişinin manevi gelişimine ve doğru bilgiye ulaşmasına rehberlik eder.'
                ],
                colorTheme: 'blue'
            },
            {
                title: `${cleanTitle} - Temel Kavramlar`,
                iconType: 'star',
                bullets: [
                    'Konuda geçen terimlerin sözlük ve dini anlamları iyi öğrenilmelidir.',
                    'Kavramlar arasındaki benzerlik ve farklar soru çözümlerinde kolaylık sağlar.',
                    'Günlük ibadet ve ahlak hayatıyla ilişkisi dikkate alınmalıdır.'
                ],
                colorTheme: 'yellow'
            },
            {
                title: 'Ayet ve Hadislerdeki Mesajlar',
                iconType: 'book',
                bullets: [
                    'Konuyla ilgili Kur\'an-ı Kerim ayetlerinin ana fikrine odaklanılmalıdır.',
                    'Peygamberimizin (s.a.v.) sünneti ve örnek uygulamaları temel rehberdir.',
                    'Yazılılarda ayet ve hadis yorumlama soruları sıkça yer alır.'
                ],
                colorTheme: 'green'
            },
            {
                title: 'Kişisel ve Toplumsal Faydalar',
                iconType: 'heart',
                bullets: [
                    'Bireyin ahlaki olgunluğa ulaşmasına ve iç huzuruna katkı sağlar.',
                    'Toplumda birlik, beraberlik, adalet ve dayanışmayı güçlendirir.',
                    'Güzel davranışların yaygınlaşmasında önemli rol oynar.'
                ],
                colorTheme: 'pink'
            }
        );
    }

    return {
        topBanner,
        unitTag,
        subTitle,
        cards: finalCards.slice(0, 4),
        unutmaBullets,
        handle: '@yazilivakti'
    };
}

/**
 * Sevimli Doodle İkonu Çizer (SVG)
 */
function renderDoodleIcon(type: IconType) {
    switch (type) {
        case 'kaaba':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <rect x="6" y="8" width="20" height="20" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="6" y1="13" x2="26" y2="13" stroke="#facc15" strokeWidth="2.5" />
                    <rect x="18" y="15" width="4" height="9" fill="#ca8a04" stroke="#0f172a" strokeWidth="1" />
                    <circle cx="20" cy="19" r="0.8" fill="#ffffff" />
                </svg>
            );
        case 'crescent':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M22 6 A11 11 0 1 0 26 24 A9.5 9.5 0 1 1 22 6 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                    <polygon points="24,10 25,13 28,14 26,16 27,19 24,17 21,19 22,16 20,14 23,13" fill="#facc15" stroke="#0f172a" strokeWidth="0.8" />
                </svg>
            );
        case 'mosque':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <rect x="9" y="16" width="14" height="12" fill="#fef08a" stroke="#0f172a" strokeWidth="1.2" />
                    <path d="M10 16 A6 6 0 0 1 22 16 Z" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.2" />
                    <rect x="5" y="10" width="3" height="18" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                    <polygon points="6.5,5 4,10 9,10" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                    <rect x="24" y="10" width="3" height="18" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
                    <polygon points="25.5,5 23,10 28,10" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                    <path d="M14 28 V21 A2 2 0 0 1 18 21 V28 Z" fill="#0284c7" />
                </svg>
            );
        case 'book':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M4 23 Q16 20 16 10 Q16 20 28 23 L26 7 Q16 5 16 9 Q16 5 6 7 Z" fill="#fef9c3" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="16" y1="9" x2="16" y2="21" stroke="#0f172a" strokeWidth="1.5" />
                    <path d="M2 24 Q16 21 16 11 Q16 21 30 24" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </svg>
            );
        case 'scale':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <line x1="16" y1="4" x2="16" y2="26" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="6" y1="8" x2="26" y2="8" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="6" y1="8" x2="4" y2="17" stroke="#ca8a04" strokeWidth="1" />
                    <line x1="6" y1="8" x2="8" y2="17" stroke="#ca8a04" strokeWidth="1" />
                    <path d="M2 17 Q6 21 10 17 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                    <line x1="26" y1="8" x2="24" y2="17" stroke="#ca8a04" strokeWidth="1" />
                    <line x1="26" y1="8" x2="28" y2="17" stroke="#ca8a04" strokeWidth="1" />
                    <path d="M22 17 Q26 21 30 17 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                    <rect x="11" y="24" width="10" height="3" rx="1" fill="#0f172a" />
                </svg>
            );
        case 'heart':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M16 27 C8 20 3 15 3 9.5 A6.5 6.5 0 0 1 14.5 5.5 L16 7 L17.5 5.5 A6.5 6.5 0 0 1 29 9.5 C29 15 24 20 16 27 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
            );
        case 'lightbulb':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M11 19 A7 7 0 1 1 21 19 C20 21 19 23 19 25 L13 25 C13 23 12 21 11 19 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="13" y1="28" x2="19" y2="28" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="16" cy="13" r="1.5" fill="#ca8a04" />
                </svg>
            );
        case 'earth':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <circle cx="16" cy="16" r="13" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                    <path d="M7 16 Q11 9 17 11 Q19 17 13 21 Z" fill="#4ade80" stroke="#0f172a" strokeWidth="1" />
                    <path d="M19 19 Q25 17 27 23 Q21 28 17 25 Z" fill="#4ade80" stroke="#0f172a" strokeWidth="1" />
                </svg>
            );
        case 'leaf':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M6 26 C12 16 20 8 28 4 C20 12 16 20 6 26 Z" fill="#4ade80" stroke="#0f172a" strokeWidth="1.5" />
                    <line x1="6" y1="26" x2="20" y2="12" stroke="#16a34a" strokeWidth="1.2" />
                </svg>
            );
        case 'hands':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M8 24 Q6 14 10 10 Q14 14 14 24" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M24 24 Q26 14 22 10 Q18 14 18 24" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 24 Q16 27 20 24" stroke="#0f172a" strokeWidth="1.5" fill="none" />
                </svg>
            );
        case 'shield':
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <path d="M16 4 L26 8 V16 C26 22 21 26 16 28 C11 26 6 22 6 16 V8 Z" fill="#bae6fd" stroke="#0f172a" strokeWidth="1.5" />
                    <circle cx="16" cy="15" r="4" fill="#0284c7" />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                    <polygon points="16,3 19,12 29,12 21,18 24,28 16,22 8,28 11,18 3,12 13,12" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                </svg>
            );
    }
}

const themeStyles = {
    blue: {
        border: 'border-[#38bdf8]',
        bg: 'bg-[#f0f9ff]',
        headerBg: 'bg-[#e0f2fe]',
        headerText: 'text-[#0369a1]',
        headerBorder: 'border-[#0284c7]',
        bulletColor: '#0284c7'
    },
    yellow: {
        border: 'border-[#facc15]',
        bg: 'bg-[#fefce8]',
        headerBg: 'bg-[#fef08a]',
        headerText: 'text-[#854d0e]',
        headerBorder: 'border-[#ca8a04]',
        bulletColor: '#ca8a04'
    },
    green: {
        border: 'border-[#4ade80]',
        bg: 'bg-[#f0fdf4]',
        headerBg: 'bg-[#bbf7d0]',
        headerText: 'text-[#15803d]',
        headerBorder: 'border-[#16a34a]',
        bulletColor: '#16a34a'
    },
    pink: {
        border: 'border-[#f472b6]',
        bg: 'bg-[#fdf2f8]',
        headerBg: 'bg-[#fbcfe8]',
        headerText: 'text-[#9d174d]',
        headerBorder: 'border-[#db2777]',
        bulletColor: '#db2777'
    },
    purple: {
        border: 'border-[#c084fc]',
        bg: 'bg-[#faf5ff]',
        headerBg: 'bg-[#e9d5ff]',
        headerText: 'text-[#7e22ce]',
        headerBorder: 'border-[#9333ea]',
        bulletColor: '#9333ea'
    },
    orange: {
        border: 'border-[#fb923c]',
        bg: 'bg-[#fff7ed]',
        headerBg: 'bg-[#fed7aa]',
        headerText: 'text-[#c2410c]',
        headerBorder: 'border-[#ea580c]',
        bulletColor: '#ea580c'
    }
};

export function InstagramCarouselModal({
    isOpen,
    onClose,
    title,
    htmlContent,
    grade,
    courseName,
    unitName,
    sourceText
}: InstagramCarouselModalProps) {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingData, setIsEditingData] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);

    // Başlangıç verisini O AN AÇIK OLAN NOTUN HTML'inden dinamik ayıkla
    const initialData = useMemo(() => {
        return extractPostDataFromNote(htmlContent, title, grade, courseName, unitName, sourceText);
    }, [htmlContent, title, grade, courseName, unitName, sourceText]);

    const [postData, setPostData] = useState<CustomPostData>(initialData);

    useEffect(() => {
        setPostData(initialData);
    }, [initialData]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        return `📌 ${postData.unitTag} | Yazılıya Hazırlık Çalışma Notu 📖✨\n\n` +
            `Sınavlar ve yazılılar öncesi ${postData.unitTag} konusunun tüm kilit noktalarını ve önemli yerlerini tek görselde topladık! 💡\n\n` +
            `💾 Sınav haftasında hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da faydalanmasını sağlayabilirsin. 🚀\n\n` +
            `📲 Bu konunun interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${title.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '').toLowerCase()} #yazılıyahazırlık #çalışmanotu #lgs #ortaokul #dindersiatolyesi #yazilivakti #meb #öğretmen #öğrenci`;
    }, [postData, title]);

    const handleCopyCaption = useCallback(() => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(captionText);
            setIsCopied(true);
            toast({
                title: 'Açıklama Kopyalandı! 📋',
                description: 'Instagram gönderi metni ve etiketler panoya kopyalandı.',
            });
            setTimeout(() => setIsCopied(false), 2500);
        }
    }, [captionText, toast]);

    // 🤖 Yapay Zeka ile Bu Nota Özel Post Oluştur
    const handleGenerateAiCustomPost = async () => {
        setIsGeneratingAi(true);
        try {
            toast({
                title: 'Yapay Zeka İnceliyor... ✨',
                description: `"${title}" konusunun ders içeriği taranıyor ve bu nota özel 4 kartlı görsel post hazırlanıyor...`
            });

            const res = await generateInstagramPostWithAi({
                title,
                htmlContent,
                sourceText,
                grade,
                unitTitle: unitName || title,
                courseTitle: courseName
            });

            if (res.success && res.data) {
                const colorCycle: Array<'blue' | 'yellow' | 'green' | 'pink'> = ['blue', 'yellow', 'green', 'pink'];
                const formattedCards: PostCard[] = (res.data.cards || []).slice(0, 4).map((c, idx) => ({
                    title: c.title,
                    iconType: (c.iconType as IconType) || detectIconType(c.title),
                    bullets: c.bullets,
                    colorTheme: colorCycle[idx % colorCycle.length]
                }));

                setPostData({
                    topBanner: res.data.topBanner || postData.topBanner,
                    unitTag: res.data.unitTag || postData.unitTag,
                    subTitle: res.data.subTitle || postData.subTitle,
                    cards: formattedCards,
                    unutmaBullets: res.data.unutmaBullets || postData.unutmaBullets,
                    handle: '@yazilivakti'
                });

                toast({
                    title: 'Bu Nota Özel Post Hazır! 🌟',
                    description: `"${title}" içeriğine %100 sadık 4 kartlı infografik post oluşturuldu.`
                });
            } else {
                toast({
                    title: 'Hata',
                    description: res.error || 'Yapay zeka yanıt vermedi.',
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            console.error('AI post generation error:', error);
            toast({
                title: 'Hata',
                description: error.message || 'Post oluşturulurken bir hata oluştu.',
                variant: 'destructive'
            });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Görseli İndir (PNG - Ultra HD 1080px genişlik)
    const handleDownload = async () => {
        if (!captureRef.current) return;
        setIsExporting(true);

        let tempStyle: HTMLStyleElement | null = null;
        if (typeof document !== 'undefined') {
            tempStyle = document.createElement('style');
            tempStyle.id = 'html2canvas-font-metrics-fix';
            tempStyle.innerHTML = 'img { display: inline-block !important; }';
            document.head.appendChild(tempStyle);
        }

        try {
            if (typeof document !== 'undefined' && document.fonts) {
                await document.fonts.ready;
            }
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(captureRef.current, {
                scale: 2.0, // 540px * 2 = 1080px genişlik net baskı çözünürlüğü
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    const cloneStyle = clonedDoc.createElement('style');
                    cloneStyle.innerHTML = 'img { display: inline-block !important; }';
                    clonedDoc.head.appendChild(cloneStyle);
                }
            });

            const link = document.createElement('a');
            const fileName = `${postData.unitTag.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_')}_Instagram_Post.png`;
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Çalışma Notu İndirildi! 🎉',
                description: 'Ultra net 1080px çözünürlükte Instagram postu başarıyla kaydedildi.',
            });
        } catch (error) {
            console.error('İndirme hatası:', error);
            toast({
                title: 'Hata',
                description: 'Görsel kaydedilirken bir sorun oluştu.',
                variant: 'destructive',
            });
        } finally {
            if (tempStyle && tempStyle.parentNode) {
                tempStyle.remove();
            }
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-[98vw] bg-slate-950 border border-slate-800 text-white rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
                {/* Popüler Yuvarlak ve El Çizimi Fontları */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800;900&family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />

                {/* MODAL ÜST BARI */}
                <DialogHeader className="pb-2.5 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 flex-shrink-0 text-xl font-black">
                            🎨
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>{postData.unitTag} • Instagram Çalışma Notu</span>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] hidden sm:inline-flex">
                                    %100 Bu Nota Özel
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                Yalnızca seçili notun içeriğini yansıtan 4 kartlı pastel doodle çalışma kağıdı
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 🤖 Bu Nota Özel AI ile Yenile */}
                        <Button
                            size="sm"
                            disabled={isGeneratingAi}
                            onClick={handleGenerateAiCustomPost}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs h-9 px-3.5 shadow-md shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer"
                            title="Bu notun kaynak metnini yapay zeka ile tara ve en vurucu 4 kartı oluştur"
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
                            <span className="hidden sm:inline">{isGeneratingAi ? 'Taranıyor...' : 'AI ile Özel Post Üret'}</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingData(prev => !prev)}
                            className={`border rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer ${
                                isEditingData 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                            title="Kelimeleri ve başlıkları düzenle"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isEditingData ? 'Önizleme' : 'Metinleri Düzenle'}</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleCopyCaption}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer"
                            title="Hazır Instagram Açıklama ve Etiketlerini Kopyala"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                            <span className="hidden sm:inline">{isCopied ? 'Kopyalandı' : 'Açıklama'}</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleDownload}
                            disabled={isExporting}
                            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-black rounded-xl text-xs h-9 px-4 shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
                            title="Görseli ultra net 1080px çözünürlükte indir"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Hazırlanıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Görseli İndir (PNG)</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                {/* ANA ÇALIŞMA ALANI */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-4 py-2 overflow-hidden">
                    
                    {/* SOL: DİKEY İNSTAGRAM POST TUVALİ (540 x 720 px -> 1080 x 1440 px Ultra HD) */}
                    <div className="flex flex-col items-center justify-center h-full max-h-full">
                        <div className="relative p-1.5 rounded-[1.5rem] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                            
                            <div
                                ref={captureRef}
                                className="w-[540px] h-[720px] bg-[#ffffff] rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none p-3 border-[3px] border-[#6ee7b7]"
                                style={{
                                    fontFamily: "'Fredoka', 'Nunito', sans-serif",
                                    boxSizing: 'border-box',
                                    color: '#0f172a'
                                }}
                            >
                                {/* ══ 1. ÜST BAŞLIK ALANI ══ */}
                                <div className="flex flex-col items-center relative flex-shrink-0 pt-0.5">
                                    {/* Üst Ana Banner (Yeşil Arkaplan, Siyah Çerçeve, Sevimli Kalem İllüstrasyonu) */}
                                    <div className="relative w-full flex items-center justify-center">
                                        <div className="bg-[#a7f3d0] border-[2.5px] border-[#0f172a] rounded-2xl py-1.5 px-6 shadow-xs w-full max-w-[430px] text-center">
                                            <h1 className="text-[19px] font-black text-[#0f172a] tracking-tight m-0 truncate">
                                                {postData.topBanner}
                                            </h1>
                                        </div>

                                        {/* Sağ Üst Kalem Doodle */}
                                        <div className="absolute -top-2 right-4 w-9 h-9 select-none transform rotate-12">
                                            <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
                                                <polygon points="12,32 8,36 10,30" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                                                <polygon points="8,36 7,37 9,35" fill="#0f172a" />
                                                <rect x="10" y="8" width="10" height="24" rx="2" transform="rotate(45 10 8)" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" />
                                                <rect x="25" y="2" width="10" height="6" rx="2" transform="rotate(45 25 2)" fill="#f472b6" stroke="#0f172a" strokeWidth="1.5" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Banner Altı Süslemeler & Alt Başlıklar */}
                                    <div className="w-full flex items-center justify-between px-2 mt-1 relative">
                                        {/* Sol: Cami Doodle */}
                                        <div className="w-12 h-10 select-none flex-shrink-0">
                                            <svg viewBox="0 0 60 50" className="w-12 h-10" fill="none">
                                                <rect x="15" y="24" width="30" height="22" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.5" />
                                                <path d="M20 24 A10 10 0 0 1 40 24 Z" fill="#f472b6" stroke="#0f172a" strokeWidth="1.5" />
                                                <path d="M26 46 V34 A4 4 0 0 1 34 34 V46 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                                                <rect x="8" y="12" width="5" height="34" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
                                                <polygon points="10.5,5 7,12 14,12" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
                                                <rect x="47" y="12" width="5" height="34" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
                                                <polygon points="49.5,5 46,12 53,12" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
                                                <circle cx="30" cy="9" r="2" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                                            </svg>
                                        </div>

                                        {/* Orta Sol: Gülen Hilal & Yıldız Doodle */}
                                        <div className="w-8 h-8 select-none flex-shrink-0">
                                            <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                                                <path d="M26 8 A14 14 0 1 0 32 30 A12 12 0 1 1 26 8 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                                                <circle cx="17" cy="20" r="1.5" fill="#0f172a" />
                                                <path d="M15 25 Q18 28 21 25" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                <polygon points="30,12 32,16 36,17 33,20 34,24 30,22 26,24 27,20 24,17 28,16" fill="#facc15" stroke="#0f172a" strokeWidth="1" />
                                            </svg>
                                        </div>

                                        {/* Orta: Ünite ve Yazılı Başlık Hapları */}
                                        <div className="flex flex-col items-center gap-1 flex-1 px-1">
                                            <div className="bg-[#e0f2fe] border-[1.5px] border-[#0284c7] text-[#0369a1] text-[11.5px] font-black px-4 py-0.5 rounded-full shadow-xs max-w-[280px] truncate text-center">
                                                {postData.unitTag}
                                            </div>
                                            <div className="bg-[#fee2e2] border-[1.5px] border-[#f43f5e] text-[#be123c] text-[9.5px] font-black px-4 py-0.5 rounded-full">
                                                {postData.subTitle}
                                            </div>
                                        </div>

                                        {/* Sağ: Açık Kitap Doodle */}
                                        <div className="w-12 h-10 select-none flex-shrink-0">
                                            <svg viewBox="0 0 60 50" className="w-12 h-10" fill="none">
                                                <path d="M8 36 Q30 32 30 18 Q30 32 52 36 L48 12 Q30 8 30 14 Q30 8 12 12 Z" fill="#fef9c3" stroke="#0f172a" strokeWidth="1.5" />
                                                <path d="M30 16 V34" stroke="#0f172a" strokeWidth="1.5" />
                                                <path d="M4 38 Q30 34 30 20 Q30 34 56 38" stroke="#4ade80" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                <path d="M30 34 L28 44 L32 40 L36 44 L34 34 Z" fill="#f43f5e" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* ══ 2. GÖVDE: BU NOTUN GERÇEK 4 BÖLÜMÜ (2x2 GRID DÜZENİ) ══ */}
                                <div className="grid grid-cols-2 gap-2.5 flex-1 my-1">
                                    {postData.cards.map((card, idx) => {
                                        const theme = themeStyles[card.colorTheme] || themeStyles.blue;
                                        return (
                                            <div 
                                                key={idx}
                                                className={`border-[2.5px] ${theme.border} ${theme.bg} rounded-2xl p-2.5 flex flex-col justify-between shadow-xs relative`}
                                            >
                                                {/* Kart Başlığı ve Tematik Doodle Simgesi */}
                                                <div className="flex items-center justify-between gap-1 border-b pb-1 mb-1 border-slate-300/60">
                                                    <div className={`font-black ${theme.headerText} text-[11.5px] leading-tight truncate flex-1`}>
                                                        {card.title}
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        {renderDoodleIcon(card.iconType)}
                                                    </div>
                                                </div>

                                                {/* Kartın Gerçek Maddeleri */}
                                                <div className="space-y-1.5 flex-1 mt-0.5">
                                                    {card.bullets.map((bullet, bIdx) => (
                                                        <div key={bIdx} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                            <span className="font-black text-xs flex-shrink-0" style={{ color: theme.bulletColor }}>•</span>
                                                            <span>{bullet}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ══ 3. ALT ŞERİT: UNUTMA! KUTUSU & INSTAGRAM İMZASI ══ */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e2e8f0]">
                                    {/* Sol: Kesikli Çerçeveli Unutma! Kutusu */}
                                    <div className="border-[2px] border-dashed border-[#0f172a] bg-[#f8fafc] rounded-xl p-1.5 flex items-center gap-2 flex-1">
                                        <div className="bg-[#fde047] border-[1.5px] border-[#0f172a] rounded-lg px-2 py-0.5 transform -rotate-2 select-none flex-shrink-0">
                                            <span className="text-[11px] font-black text-[#0f172a]">Unutma!</span>
                                        </div>
                                        <div className="space-y-0.5 flex-1">
                                            {postData.unutmaBullets.map((b, i) => (
                                                <div key={i} className="text-[9px] font-bold text-[#1e293b] leading-[1.2] flex items-start gap-1">
                                                    <span className="text-emerald-600 font-black text-xs flex-shrink-0">☑</span>
                                                    <span>{b}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sağ: Instagram Sosyal Medya Rozeti */}
                                    <div className="bg-[#0f172a] text-[#ffffff] border-[1.5px] border-[#0f172a] rounded-xl px-2.5 py-1.5 flex items-center gap-1 shadow-xs flex-shrink-0">
                                        <span className="text-[10px] font-black tracking-wide">{postData.handle}</span>
                                        <span className="text-amber-400 text-xs">✨</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ: Metin Düzenleme Paneli veya Hazır Açıklama */}
                    <div className="flex-1 min-w-0 h-full flex flex-col gap-3 justify-between">
                        {isEditingData ? (
                            /* ── METİN DÜZENLEME PANELİ ── */
                            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[580px] text-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5 text-sm">
                                        <Edit3 className="w-4 h-4" />
                                        <span>Görseldeki Metinleri Düzenle</span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setPostData(initialData)}
                                        className="h-7 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Orijinal içeriğe geri dön"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Sıfırla
                                    </Button>
                                </div>

                                {/* Üst Başlıklar */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Ana Üst Başlık:</label>
                                    <input 
                                        type="text"
                                        value={postData.topBanner}
                                        onChange={e => setPostData(prev => ({ ...prev, topBanner: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Ünite / Konu Başlığı:</label>
                                    <input 
                                        type="text"
                                        value={postData.unitTag}
                                        onChange={e => setPostData(prev => ({ ...prev, unitTag: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                {/* 4 Kartın Başlık & Maddeleri */}
                                {postData.cards.map((card, cIdx) => (
                                    <div key={cIdx} className="space-y-1.5 pt-2 border-t border-slate-800">
                                        <label className="font-bold text-cyan-300 block">
                                            {cIdx + 1}. Kart Başlığı:
                                        </label>
                                        <input 
                                            type="text"
                                            value={card.title}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setPostData(prev => {
                                                    const next = [...prev.cards];
                                                    next[cIdx] = { ...next[cIdx], title: val };
                                                    return { ...prev, cards: next };
                                                });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                        />
                                        {card.bullets.map((b, bIdx) => (
                                            <input 
                                                key={bIdx}
                                                type="text"
                                                value={b}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setPostData(prev => {
                                                        const nextCards = [...prev.cards];
                                                        const nextBullets = [...nextCards[cIdx].bullets];
                                                        nextBullets[bIdx] = val;
                                                        nextCards[cIdx] = { ...nextCards[cIdx], bullets: nextBullets };
                                                        return { ...prev, cards: nextCards };
                                                    });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] mb-1"
                                            />
                                        ))}
                                    </div>
                                ))}

                                {/* Unutma Maddeleri */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-amber-300 block">Alt "Unutma!" Maddeleri:</label>
                                    {postData.unutmaBullets.map((b, uIdx) => (
                                        <input 
                                            key={uIdx}
                                            type="text"
                                            value={b}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setPostData(prev => {
                                                    const next = [...prev.unutmaBullets];
                                                    next[uIdx] = val;
                                                    return { ...prev, unutmaBullets: next };
                                                });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] mb-1"
                                        />
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsEditingData(false)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-8 cursor-pointer"
                                    >
                                        Değişiklikleri Uygula ✨
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* ── AÇIKLAMA METNİ & İPUÇLARI ── */
                            <>
                                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Instagram Açıklama Metni (Caption)</span>
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCopyCaption}
                                            className="h-6 px-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                        >
                                            {isCopied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {isCopied ? 'Kopyalandı' : 'Metni Kopyala'}
                                        </Button>
                                    </div>
                                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 max-h-52 overflow-y-auto text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                                        {captionText}
                                    </div>
                                </div>

                                {/* Bilgi Kartı */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs text-emerald-200 space-y-1.5">
                                    <div className="font-extrabold flex items-center gap-1.5 text-emerald-300">
                                        <Wand2 className="w-4 h-4 text-emerald-400" />
                                        <span>%100 Bu Nota Özel Dinamik İçerik</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-emerald-100/90">
                                        Görseldeki 4 kutu ve maddeler yalnızca seçili olan <strong>{title}</strong> ders notundan çekilmiştir. Başka ünitelerin sabit bilgileri asla karışmaz.
                                    </p>
                                    <div className="pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleGenerateAiCustomPost}
                                            disabled={isGeneratingAi}
                                            className="w-full h-7 text-xs bg-emerald-950/60 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Sparkles className="w-3 h-3 text-amber-300" />
                                            <span>{isGeneratingAi ? 'Yapay Zeka Taranıyor...' : 'Yapay Zeka ile Bu Notu Yeniden Şekillendir'}</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
                                    <span>Çözünürlük: <strong className="text-white">1080 x 1440 px (3:4 / 4:5 Post)</strong></span>
                                    <span>Format: <strong className="text-white">PNG Ultra HD</strong></span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
