'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Printer,
    BookOpen,
    Sparkles,
    CheckSquare,
    Square,
    CheckCircle2,
    Layers,
    Settings2,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileText,
    Filter,
    Check,
    RotateCcw,
    Download,
    User,
    CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DIYANET_ELIFBA_STAGES,
    DIYANET_SECTIONS,
    ElifbaStage,
    getStageItemMeta
} from '@/lib/elifba-curriculum';
import {
    ELIFBA_UNITS,
    ElifbaUnit,
    CUZ_LESSONS,
    NAMAZ_DUALARI
} from '@/lib/elifba-data';

export interface QuranWorksheetPrintDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialStepId?: string;
    students?: { uid: string; displayName?: string; studentNo?: string; branch?: string }[];
    currentClass?: { name: string; branch?: string };
    ambianceTheme?: 'dark' | 'light';
}

export function QuranWorksheetPrintDialog({
    isOpen,
    onClose,
    initialStepId = 'cuz1',
    students = [],
    currentClass,
    ambianceTheme = 'dark'
}: QuranWorksheetPrintDialogProps) {
    // 1. Mod Seçimi: 'single' (Tek Adım) veya 'multi' (Çoklu Adımlar)
    const [mode, setMode] = useState<'single' | 'multi'>('single');

    // 2. Tekli Adım Seçimi (cuz1 - cuz30 veya dua1 - dua8)
    const [singleStepId, setSingleStepId] = useState<string>(initialStepId);

    // 3. Çoklu Adım Seçimi (Seçilen Aşama ID Listesi)
    const [selectedStepIds, setSelectedStepIds] = useState<string[]>([initialStepId]);

    // 4. Öğrenci Seçimi (Opsiyonel: Boş / Genel veya Bireysel)
    const [selectedStudentUid, setSelectedStudentUid] = useState<string>('blank');

    // 5. Özelleştirme Ayarları
    const [schoolTitle, setSchoolTitle] = useState<string>('KUR\'AN-I KERİM VE ELİFBA DERSİ');
    const [showPronunciationHints, setShowPronunciationHints] = useState<boolean>(true);
    const [showRepetitionBoxes, setShowRepetitionBoxes] = useState<boolean>(true);
    const [showRuleBox, setShowRuleBox] = useState<boolean>(true);
    const [showEvaluationRubric, setShowEvaluationRubric] = useState<boolean>(true);
    const [pageBreakPerStep, setPageBreakPerStep] = useState<boolean>(true);
    const [customNote, setCustomNote] = useState<string>('');

    // 6. Önizlemede aktif gösterilen sayfa indeksi (çoklu modda sayfa sayfa gezmek için)
    const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);

    // Seçili öğrenci nesnesi
    const currentStudent = useMemo(() => {
        if (selectedStudentUid === 'blank') return null;
        return students.find(s => s.uid === selectedStudentUid) || null;
    }, [selectedStudentUid, students]);

    // Yazdırılacak adımlar listesi
    const targetStages: ElifbaStage[] = useMemo(() => {
        if (mode === 'single') {
            const found = DIYANET_ELIFBA_STAGES.find(s => s.id === singleStepId);
            if (found) return [found];
            // Eğer doğrudan ELIFBA_UNITS içindeyse
            const unit = ELIFBA_UNITS.find(u => u.id === singleStepId);
            if (unit) {
                return [{
                    id: unit.id,
                    stepNumber: unit.number,
                    section: 'section4',
                    sectionTitle: unit.type === 'dua' ? 'Namaz Duaları' : 'Elifba Dersi',
                    title: unit.title,
                    shortTitle: unit.shortTitle,
                    category: unit.category as any,
                    badgeColor: unit.badgeColor,
                    description: unit.description,
                    itemCount: unit.itemCount,
                    imgExt: '',
                    audioExt: '',
                    folder: 'dosyalar',
                    subFolder: '',
                    items: unit.items.map(i => i.alt || String(i.index))
                }];
            }
            return [DIYANET_ELIFBA_STAGES[0]];
        } else {
            // Çoklu modda seçilen adımların sırayla listesi
            return DIYANET_ELIFBA_STAGES.filter(s => selectedStepIds.includes(s.id));
        }
    }, [mode, singleStepId, selectedStepIds]);

    // Çoklu modda bölüm kısayolları
    const handleSelectSection = (sectionId: string) => {
        const section = DIYANET_SECTIONS.find(s => s.id === sectionId);
        if (!section) return;
        const [start, end] = section.stepRange;
        const sectionStages = DIYANET_ELIFBA_STAGES
            .filter(s => s.stepNumber >= start && s.stepNumber <= end)
            .map(s => s.id);
        
        setSelectedStepIds(prev => {
            const set = new Set([...prev, ...sectionStages]);
            return Array.from(set);
        });
    };

    const handleSelectAll = () => {
        setSelectedStepIds(DIYANET_ELIFBA_STAGES.map(s => s.id));
    };

    const handleClearAll = () => {
        setSelectedStepIds([]);
    };

    const toggleStepSelection = (id: string) => {
        setSelectedStepIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // Tekli modda adım gezici (Önceki / Sonraki)
    const handlePrevSingleStep = () => {
        const currentIndex = DIYANET_ELIFBA_STAGES.findIndex(s => s.id === singleStepId);
        if (currentIndex > 0) {
            setSingleStepId(DIYANET_ELIFBA_STAGES[currentIndex - 1].id);
        }
    };

    const handleNextSingleStep = () => {
        const currentIndex = DIYANET_ELIFBA_STAGES.findIndex(s => s.id === singleStepId);
        if (currentIndex < DIYANET_ELIFBA_STAGES.length - 1) {
            setSingleStepId(DIYANET_ELIFBA_STAGES[currentIndex + 1].id);
        }
    };

    // Bir aşamanın öğelerini derleyen yardımcı
    const getStageItems = useCallback((stageId: string) => {
        if (stageId === 'dualar') {
            const dualarUnits = ELIFBA_UNITS.filter(u => u.type === 'dua');
            return dualarUnits.flatMap(u => u.items.map(i => ({
                ...i,
                duaTitle: u.shortTitle || u.title,
                meaning: u.meaning,
                pronunciation: u.pronunciation
            })));
        }
        const unit = ELIFBA_UNITS.find(u => u.id === stageId) || CUZ_LESSONS.find(u => u.id === stageId);
        if (unit && unit.items && unit.items.length > 0) {
            return unit.items;
        }
        // Fallback: 1'den itemCount'a kadar index
        const stage = DIYANET_ELIFBA_STAGES.find(s => s.id === stageId);
        const count = stage?.itemCount || 28;
        return Array.from({ length: count }, (_, idx) => ({
            index: idx + 1,
            audio: `/elifba/dosyalar/${idx + 1}.mp3`,
            img: `/elifba/dosyalar/${idx + 1}.png`,
            alt: `Öğe ${idx + 1}`
        }));
    }, []);

    // YAZDIRMA MOTORU (A4 Kusursuz Baskı Penceresi Oluşturucu)
    const handlePrint = useCallback(() => {
        if (targetStages.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Lütfen tarayıcınızın açılır pencere (pop-up) engelleyicisini kaldırınız.');
            return;
        }

        const origin = window.location.origin;
        const studentName = currentStudent?.displayName || '...................................................';
        const studentClass = currentClass?.name ? `${currentClass.name} ${currentClass.branch || ''}` : '...............';
        const studentNo = currentStudent?.studentNo || '..........';
        const dateStr = new Date().toLocaleDateString('tr-TR');

        // Her sayfa için HTML üretimi
        const pagesHtml = targetStages.map((stage, pageIdx) => {
            const items = getStageItems(stage.id);
            const isDuaStage = stage.id === 'dualar';
            const isCuzStage = stage.id === 'cuz';
            const isLastPage = pageIdx === targetStages.length - 1;

            // Kart Sütun Sayısı
            let colCount = 7;
            if (items.length <= 14) colCount = 4;
            else if (items.length <= 20) colCount = 5;
            else if (items.length <= 28) colCount = 7;
            else colCount = 7;

            // Kural açıklaması
            const unit = ELIFBA_UNITS.find(u => u.id === stage.id);
            const ruleText = unit?.description || stage.description || '';

            // Kartlar HTML
            let cardsHtml = '';
            if (isCuzStage) {
                // 30 Cüz Okuma Çizelgesi Tablosu
                cardsHtml = `
                    <div style="grid-column: 1 / -1; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; border: 1.5px solid #0f172a;">
                            <thead>
                                <tr style="background: #f1f5f9; border-bottom: 1.5px solid #0f172a;">
                                    <th style="padding: 6px; border: 1px solid #cbd5e1; width: 45px; text-align: center;">Cüz</th>
                                    <th style="padding: 6px; border: 1px solid #cbd5e1; text-align: left;">Sûre ve Sayfa Aralığı</th>
                                    <th style="padding: 6px; border: 1px solid #cbd5e1; width: 85px; text-align: center;">1. Okuma</th>
                                    <th style="padding: 6px; border: 1px solid #cbd5e1; width: 85px; text-align: center;">2. Okuma</th>
                                    <th style="padding: 6px; border: 1px solid #cbd5e1; width: 85px; text-align: center;">3. Okuma</th>
                                    <th style="padding: 6px; border: 1px solid #cbd5e1; width: 90px; text-align: center;">Öğretmen İmzası</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Array.from({ length: 30 }, (_, i) => {
                                    const juzNum = i + 1;
                                    const startPage = (juzNum - 1) * 20 + 2;
                                    const endPage = juzNum * 20 + 1;
                                    return `
                                        <tr style="border-bottom: 1px solid #e2e8f0; height: 26px;">
                                            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${juzNum}. Cüz</td>
                                            <td style="padding: 4px 8px; border: 1px solid #cbd5e1;">Sayfa ${startPage} - ${endPage}</td>
                                            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;"><span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span></td>
                                            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;"><span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span></td>
                                            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;"><span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span></td>
                                            <td style="padding: 4px; border: 1px solid #cbd5e1; text-align: center;"></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                cardsHtml = items.map((item, idx) => {
                    const m = getStageItemMeta(stage.id, item.index);
                    const itemName = m?.name || item.alt || `Öğe #${item.index}`;
                    const arabicChar = m?.arabic || '';
                    const imgSrc = item.img ? (item.img.startsWith('http') ? item.img : `${origin}${item.img}`) : '';

                    return `
                        <div class="practice-card">
                            <div class="card-top">
                                <span class="card-num">#${item.index}</span>
                                ${showRepetitionBoxes ? `
                                    <div class="repetition-boxes">
                                        <span class="chk-item">1<i class="chk-sq"></i></span>
                                        <span class="chk-item">2<i class="chk-sq"></i></span>
                                        <span class="chk-item">3<i class="chk-sq"></i></span>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="card-img-container">
                                ${imgSrc ? `
                                    <img src="${imgSrc}" alt="${itemName}" class="card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                                    <div class="card-arabic-fallback" style="display: none;">${arabicChar}</div>
                                ` : `
                                    <div class="card-arabic-fallback">${arabicChar}</div>
                                `}
                            </div>

                            ${showPronunciationHints ? `
                                <div class="card-bottom">
                                    <span class="card-name">${itemName}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            }

            return `
                <div class="worksheet-page ${!isLastPage && pageBreakPerStep ? 'page-break' : ''}">
                    
                    <!-- 1. ÜST BAŞLIK & MEB BİLGİ ALANI -->
                    <div class="header-box">
                        <div class="header-left">
                            <div class="ministry-title">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
                            <div class="lesson-title">${schoolTitle}</div>
                            <div class="sheet-title">KUR'AN-I KERİM &amp; ELİFBA ÇALIŞMA YAPRAĞI</div>
                        </div>
                        <div class="header-right">
                            <div class="step-badge">ADIM ${stage.stepNumber}</div>
                            <div class="step-section">${stage.sectionTitle || 'Elifba & Kur\'an'}</div>
                            <div class="step-category-name">${stage.category.toUpperCase()}</div>
                        </div>
                    </div>

                    <!-- 2. ÖĞRENCİ BİLGİLERİ ŞERİDİ -->
                    <div class="student-info-strip">
                        <div class="info-item">
                            <span class="info-label">Öğrenci Adı Soyadı:</span>
                            <span class="info-value">${studentName}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Sınıf / Şube:</span>
                            <span class="info-value">${studentClass}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">No:</span>
                            <span class="info-value">${studentNo}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Tarih:</span>
                            <span class="info-value">${dateStr}</span>
                        </div>
                    </div>

                    <!-- 3. ADIM BAŞLIĞI VE KURAL / YÖNERGE KUTUSU -->
                    <div class="step-title-box">
                        <div class="step-title-row">
                            <h2 class="step-title-heading">${stage.title}</h2>
                            <span class="step-item-count">${items.length} Çalışma Alıştırması</span>
                        </div>
                        ${showRuleBox && ruleText ? `
                            <div class="instruction-box">
                                <div class="instruction-icon-tag">📖 YÖNERGE &amp; OKUMA KURALI</div>
                                <p class="instruction-desc">${ruleText}</p>
                                <p class="instruction-tip">Aşağıdaki harf ve kelimeleri <b>sağdan sola doğru</b> mahreçlerine dikkat ederek okuyunuz. Her birini 3 kez doğru okuduktan sonra kutucukları işaretleyiniz.</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- 4. HARF & KELİME ÇALIŞMA IZGARASI (SAĞDAN SOLA ARAPÇA DÜZENİ) -->
                    <div class="practice-grid grid-cols-${colCount}">
                        ${cardsHtml}
                    </div>

                    <!-- 5. ÖĞRETMEN DEĞERLENDİRME & İMZA BÖLÜMÜ -->
                    ${showEvaluationRubric ? `
                        <div class="footer-box">
                            <div class="rubric-box">
                                <span class="rubric-title">Öğretmen Değerlendirmesi:</span>
                                <div class="rubric-options">
                                    <span class="rubric-opt"><i class="sq"></i> Pekiyi (100)</span>
                                    <span class="rubric-opt"><i class="sq"></i> İyi (85)</span>
                                    <span class="rubric-opt"><i class="sq"></i> Orta (70)</span>
                                    <span class="rubric-opt"><i class="sq"></i> Tekrar Edilsin</span>
                                </div>
                                <div class="rubric-notes">
                                    <span>Puan: ________ / 100</span>
                                    ${customNote ? `<span style="margin-left: 14px;">Not: ${customNote}</span>` : ''}
                                </div>
                            </div>
                            <div class="signature-box">
                                <div class="sign-item">
                                    <span>Öğretmen İmzası</span>
                                    <div class="sign-line"></div>
                                </div>
                                <div class="sign-item">
                                    <span>Veli İmzası</span>
                                    <div class="sign-line"></div>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                </div>
            `;
        }).join('');

        // Baskı Penceresi İçeriği
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="utf-8" />
                <title>Kur'an-ı Kerim &amp; Elifba Çalışma Yaprakları</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm 10mm 10mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                        color: #0f172a;
                        background: #ffffff;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .page-break {
                        page-break-after: always;
                        break-after: page;
                    }
                    .worksheet-page {
                        min-height: 275mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 2mm 0;
                    }

                    /* 1. ÜST BAŞLIK */
                    .header-box {
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .ministry-title {
                        font-size: 10px;
                        font-weight: 800;
                        letter-spacing: 1.5px;
                        color: #047857;
                    }
                    .lesson-title {
                        font-size: 14px;
                        font-weight: 900;
                        color: #0f172a;
                        margin-top: 1px;
                    }
                    .sheet-title {
                        font-size: 11px;
                        font-weight: 700;
                        color: #475569;
                    }
                    .header-right {
                        text-align: right;
                    }
                    .step-badge {
                        display: inline-block;
                        background: #0f172a;
                        color: #ffffff;
                        font-size: 12px;
                        font-weight: 900;
                        padding: 3px 10px;
                        border-radius: 6px;
                        letter-spacing: 0.5px;
                    }
                    .step-section {
                        font-size: 10px;
                        font-weight: 700;
                        color: #047857;
                        margin-top: 2px;
                    }
                    .step-category-name {
                        font-size: 9px;
                        font-weight: 600;
                        color: #64748b;
                    }

                    /* 2. ÖĞRENCİ BİLGİ ŞERİDİ */
                    .student-info-strip {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        background: #f8fafc;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        padding: 6px 12px;
                        margin-top: 8px;
                        font-size: 11px;
                    }
                    .info-item {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .info-label {
                        font-weight: 700;
                        color: #475569;
                    }
                    .info-value {
                        font-weight: 800;
                        color: #0f172a;
                    }

                    /* 3. ADIM BAŞLIĞI & YÖNERGE KUTUSU */
                    .step-title-box {
                        margin-top: 8px;
                    }
                    .step-title-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .step-title-heading {
                        font-size: 14px;
                        font-weight: 900;
                        margin: 0;
                        color: #0f172a;
                    }
                    .step-item-count {
                        font-size: 10px;
                        font-weight: 700;
                        background: #e2e8f0;
                        padding: 2px 8px;
                        border-radius: 4px;
                        color: #334155;
                    }
                    .instruction-box {
                        background: #f1f5f9;
                        border: 1px solid #cbd5e1;
                        border-left: 4px solid #059669;
                        border-radius: 6px;
                        padding: 6px 10px;
                        margin-top: 6px;
                    }
                    .instruction-icon-tag {
                        font-size: 9px;
                        font-weight: 800;
                        color: #047857;
                        letter-spacing: 0.5px;
                    }
                    .instruction-desc {
                        font-size: 10px;
                        color: #1e293b;
                        margin: 2px 0 0 0;
                        line-height: 1.35;
                    }
                    .instruction-tip {
                        font-size: 9.5px;
                        color: #475569;
                        margin: 2px 0 0 0;
                        font-style: italic;
                    }

                    /* 4. ÇALIŞMA IZGARASI - SAĞDAN SOLA (RTL) ARAPÇA KUTULARI */
                    .practice-grid {
                        display: grid;
                        gap: 6px;
                        margin-top: 8px;
                        direction: rtl; /* Arapça sağdan sola okuma sırası */
                    }
                    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
                    .grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
                    .grid-cols-6 { grid-template-columns: repeat(6, 1fr); }
                    .grid-cols-7 { grid-template-columns: repeat(7, 1fr); }

                    .practice-card {
                        direction: ltr; /* Kart içi elemanlar sol-sağ */
                        border: 1.5px solid #0f172a;
                        border-radius: 8px;
                        background: #ffffff;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 4px;
                        min-height: 48mm;
                        page-break-inside: avoid;
                    }
                    .card-top {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        font-size: 9px;
                        border-bottom: 1px dashed #cbd5e1;
                        padding-bottom: 2px;
                    }
                    .card-num {
                        font-weight: 800;
                        color: #64748b;
                    }
                    .repetition-boxes {
                        display: flex;
                        align-items: center;
                        gap: 3px;
                    }
                    .chk-item {
                        display: inline-flex;
                        align-items: center;
                        gap: 1.5px;
                        font-size: 8.5px;
                        font-weight: 700;
                        color: #475569;
                    }
                    .chk-sq {
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border: 1px solid #0f172a;
                        border-radius: 2px;
                    }
                    .card-img-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 28mm;
                        padding: 2px;
                        overflow: hidden;
                    }
                    .card-img {
                        max-height: 100%;
                        max-width: 100%;
                        object-fit: contain;
                    }
                    .card-arabic-fallback {
                        font-family: 'Amiri', 'Traditional Arabic', serif;
                        font-size: 32px;
                        font-weight: 700;
                        color: #0f172a;
                        line-height: 1;
                        text-align: center;
                    }
                    .card-bottom {
                        border-top: 1px solid #e2e8f0;
                        padding-top: 3px;
                        text-align: center;
                    }
                    .card-name {
                        font-size: 9px;
                        font-weight: 800;
                        color: #0f172a;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: block;
                    }

                    /* 5. ALT DEĞERLENDİRME & İMZA ALANI */
                    .footer-box {
                        border-top: 1.5px solid #0f172a;
                        padding-top: 8px;
                        margin-top: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        font-size: 10.5px;
                    }
                    .rubric-box {
                        flex: 1;
                    }
                    .rubric-title {
                        font-weight: 800;
                        color: #0f172a;
                        display: block;
                        margin-bottom: 3px;
                    }
                    .rubric-options {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 4px;
                    }
                    .rubric-opt {
                        display: flex;
                        align-items: center;
                        gap: 3px;
                        font-weight: 600;
                    }
                    .sq {
                        display: inline-block;
                        width: 11px;
                        height: 11px;
                        border: 1.5px solid #0f172a;
                        border-radius: 2px;
                    }
                    .rubric-notes {
                        font-weight: 700;
                        color: #475569;
                    }
                    .signature-box {
                        display: flex;
                        gap: 24px;
                        text-align: center;
                    }
                    .sign-item span {
                        font-weight: 700;
                        font-size: 10px;
                        color: #475569;
                        display: block;
                    }
                    .sign-line {
                        width: 80px;
                        border-bottom: 1px dotted #0f172a;
                        margin-top: 24px;
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 400);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }, [
        targetStages,
        getStageItems,
        currentStudent,
        currentClass,
        schoolTitle,
        showPronunciationHints,
        showRepetitionBoxes,
        showRuleBox,
        showEvaluationRubric,
        pageBreakPerStep,
        customNote
    ]);

    // Canlı önizleme için seçili aşama
    const previewStage: ElifbaStage = useMemo(() => {
        if (targetStages.length === 0) return DIYANET_ELIFBA_STAGES[0];
        const safeIdx = Math.min(previewPageIndex, targetStages.length - 1);
        return targetStages[safeIdx] || targetStages[0];
    }, [targetStages, previewPageIndex]);

    const previewItems = useMemo(() => {
        return getStageItems(previewStage.id);
    }, [previewStage, getStageItems]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    "max-w-6xl w-[96vw] h-[92vh] max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-3xl border shadow-2xl transition-all",
                    ambianceTheme === 'dark'
                        ? "bg-[#0b1222] border-white/15 text-slate-100"
                        : "bg-white border-slate-200 text-slate-900"
                )}
            >
                {/* ──────────────────────────────────────────────────────────── */}
                {/* ÜST DİYALOG BAŞLIK ŞERİDİ */}
                {/* ──────────────────────────────────────────────────────────── */}
                <DialogHeader className={cn(
                    "px-6 py-4 border-b flex flex-row items-center justify-between gap-4 shrink-0",
                    ambianceTheme === 'dark' ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/80"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-900/40">
                            <Printer className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                                <span>Kur'an &amp; Elifba Adım Çalışma Kağıdı Yazdır</span>
                                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                                    A4 Baskı ve PDF
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 mt-0.5">
                                Öğrencilerin evde ve derste çalışması için tekli veya çoklu adımları çalışma yaprağı olarak yazdırın.
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Sağ: Yazdır Butonu + Kapat */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrint}
                            disabled={targetStages.length === 0}
                            className="h-10 px-5 rounded-2xl font-black text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Yazdır / PDF Olarak Kaydet</span>
                            <Badge className="bg-white/20 text-white font-mono text-[10px] px-1.5 py-0">
                                {targetStages.length} Sayfa
                            </Badge>
                        </Button>
                    </div>
                </DialogHeader>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* İKİLİ PANEEL: SOL AYARLAR & ADIM SEÇİMİ | SAĞ CANLI A4 ÖNİZLEME */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                    
                    {/* SOL PANEL: ADIM SEÇİMİ & ÇALIŞMA KAĞIDI AYARLARI (4/12 veya 5/12) */}
                    <div className={cn(
                        "lg:col-span-5 p-4 sm:p-5 overflow-y-auto custom-scrollbar border-r flex flex-col gap-4 shrink-0",
                        ambianceTheme === 'dark' ? "border-white/10 bg-[#070d18]" : "border-slate-200 bg-slate-50/50"
                    )}>
                        
                        {/* 1. TEK ADIM vs ÇOKLU ADIM MOD SEÇİCİ */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-500" />
                                <span>Yazdırma Kapsamı:</span>
                            </Label>
                            
                            <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
                                <TabsList className="grid grid-cols-2 w-full p-1 rounded-2xl bg-black/20 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                                    <TabsTrigger
                                        value="single"
                                        className="text-xs font-black rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white"
                                    >
                                        📄 Tek Adım Yazdır
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="multi"
                                        className="text-xs font-black rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                                    >
                                        📑 Çoklu Adım / Paket
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* 2. ADIM SEÇİCİ (MODA GÖRE) */}
                        {mode === 'single' ? (
                            <div className="p-3.5 rounded-2xl border space-y-2.5 bg-white/5 dark:bg-white/5 border-slate-300 dark:border-white/10">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300">Yazdırılacak Adım:</span>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handlePrevSingleStep}
                                            disabled={DIYANET_ELIFBA_STAGES.findIndex(s => s.id === singleStepId) <= 0}
                                            className="h-7 w-7 p-0 rounded-lg text-slate-400"
                                            title="Önceki Adım"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleNextSingleStep}
                                            disabled={DIYANET_ELIFBA_STAGES.findIndex(s => s.id === singleStepId) >= DIYANET_ELIFBA_STAGES.length - 1}
                                            className="h-7 w-7 p-0 rounded-lg text-slate-400"
                                            title="Sonraki Adım"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <Select value={singleStepId} onValueChange={setSingleStepId}>
                                    <SelectTrigger className="w-full text-xs font-black h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20">
                                        <SelectValue placeholder="Adım seçiniz" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72 bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20">
                                        {DIYANET_SECTIONS.map(sec => {
                                            const secStages = DIYANET_ELIFBA_STAGES.filter(
                                                s => s.stepNumber >= sec.stepRange[0] && s.stepNumber <= sec.stepRange[1]
                                            );
                                            return (
                                                <div key={sec.id} className="p-1">
                                                    <div className="text-[10px] font-black uppercase text-amber-500 px-2 py-1">
                                                        {sec.title}
                                                    </div>
                                                    {secStages.map(st => (
                                                        <SelectItem key={st.id} value={st.id} className="text-xs font-bold cursor-pointer">
                                                            {st.title} ({st.itemCount} alıştırma)
                                                        </SelectItem>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>

                                <div className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                                    {DIYANET_ELIFBA_STAGES.find(s => s.id === singleStepId)?.description}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-2xl border space-y-2.5 bg-white/5 dark:bg-white/5 border-slate-300 dark:border-white/10">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-300">
                                        Adımları Seçin ({selectedStepIds.length} / {DIYANET_ELIFBA_STAGES.length})
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                                        >
                                            Tümü
                                        </button>
                                        <span className="text-slate-600">•</span>
                                        <button
                                            type="button"
                                            onClick={handleClearAll}
                                            className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                                        >
                                            Temizle
                                        </button>
                                    </div>
                                </div>

                                {/* Bölüm Kısayolları */}
                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    {DIYANET_SECTIONS.map(sec => (
                                        <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => handleSelectSection(sec.id)}
                                            className="p-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white/5 hover:bg-white/10 text-left font-bold truncate cursor-pointer transition-colors"
                                            title={sec.title}
                                        >
                                            + {sec.title.split(':')[0]} ({sec.stepRange[0]}-{sec.stepRange[1]})
                                        </button>
                                    ))}
                                </div>

                                {/* Adım Onay Kutuları Listesi */}
                                <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-1 border-t border-slate-300 dark:border-white/10 pt-2">
                                    {DIYANET_ELIFBA_STAGES.map(st => {
                                        const isChecked = selectedStepIds.includes(st.id);
                                        return (
                                            <div
                                                key={st.id}
                                                onClick={() => toggleStepSelection(st.id)}
                                                className={cn(
                                                    "flex items-center justify-between p-1.5 rounded-xl border text-xs cursor-pointer select-none transition-all",
                                                    isChecked
                                                        ? "bg-amber-500/20 border-amber-500/40 text-amber-200 font-bold"
                                                        : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {isChecked ? (
                                                        <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                    ) : (
                                                        <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                    )}
                                                    <span className="truncate">{st.shortTitle}</span>
                                                </div>
                                                <span className="text-[10px] opacity-70 shrink-0 font-mono">
                                                    {st.itemCount} öğe
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. ÖĞRENCİ SEÇİMİ (İSİM DOLDURMA VEYA BOŞ DAĞITIM) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Öğrenci Bilgisi:</span>
                            </Label>
                            <Select value={selectedStudentUid} onValueChange={setSelectedStudentUid}>
                                <SelectTrigger className="w-full text-xs font-bold h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20">
                                    <SelectValue placeholder="Öğrenci Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20">
                                    <SelectItem value="blank" className="text-xs font-bold">
                                        📝 Boş Dağıtım Kağıdı (Ad / Soyad Çizgili)
                                    </SelectItem>
                                    {students.map(s => (
                                        <SelectItem key={s.uid} value={s.uid} className="text-xs font-semibold">
                                            {s.displayName || 'İsimsiz Öğrenci'} {s.studentNo ? `(#${s.studentNo})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. ÇALIŞMA KAĞIDI ÖZELLEŞTİRME ANAHTARLARI */}
                        <div className="p-3.5 rounded-2xl border space-y-3 bg-white/5 dark:bg-white/5 border-slate-300 dark:border-white/10">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Settings2 className="w-3.5 h-3.5 text-purple-400" />
                                <span>Görünüm ve İçerik Ayarları:</span>
                            </span>

                            {/* Başlık Girişi */}
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-slate-300">Sayfa Üst Başlığı:</Label>
                                <Input
                                    value={schoolTitle}
                                    onChange={(e) => setSchoolTitle(e.target.value)}
                                    placeholder="Okul veya Ders Adı"
                                    className="h-8 text-xs font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-white/20"
                                />
                            </div>

                            {/* Okunuş İpuçları Aç/Kapat */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-slate-200">Okunuş İpuçları (Türkçe)</Label>
                                    <p className="text-[10px] text-slate-400">Harf ve kelime isimlerini kartın altında göster</p>
                                </div>
                                <Switch checked={showPronunciationHints} onCheckedChange={setShowPronunciationHints} />
                            </div>

                            {/* 3x Tekrar Kutuları */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-slate-200">3x Tekrar Kutuları</Label>
                                    <p className="text-[10px] text-slate-400">Her harfe [ 1 ] [ 2 ] [ 3 ] çalışma onay kutusu ekle</p>
                                </div>
                                <Switch checked={showRepetitionBoxes} onCheckedChange={setShowRepetitionBoxes} />
                            </div>

                            {/* Kural & Yönerge Kutusu */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-slate-200">Kural &amp; Yönerge Kutusu</Label>
                                    <p className="text-[10px] text-slate-400">Adımın kural açıklamasını sayfa üstünde göster</p>
                                </div>
                                <Switch checked={showRuleBox} onCheckedChange={setShowRuleBox} />
                            </div>

                            {/* Değerlendirme & İmza */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-slate-200">Öğretmen Değerlendirmesi &amp; İmza</Label>
                                    <p className="text-[10px] text-slate-400">Alt bölüme puan, değerlendirme ve veli imza alanı ekle</p>
                                </div>
                                <Switch checked={showEvaluationRubric} onCheckedChange={setShowEvaluationRubric} />
                            </div>

                            {/* Çoklu modda sayfa sonu */}
                            {mode === 'multi' && (
                                <div className="flex items-center justify-between border-t border-slate-300 dark:border-white/10 pt-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold text-slate-200">Ayrı A4 Sayfaları (Sayfa Sonu)</Label>
                                        <p className="text-[10px] text-slate-400">Her adımı bağımsız temiz bir A4 sayfasında başlat</p>
                                    </div>
                                    <Switch checked={pageBreakPerStep} onCheckedChange={setPageBreakPerStep} />
                                </div>
                            )}
                        </div>

                    </div>

                    {/* SAĞ PANEL: CANLI A4 BASKI ÖNİZLEMESİ (7/12) */}
                    <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-900/60 p-3 sm:p-5 overflow-hidden">
                        
                        {/* Önizleme Üst Kontrol Çubuğu */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-black text-white">Canlı A4 Baskı Önizlemesi</span>
                                <Badge className="bg-white/10 text-slate-300 font-mono text-[10px]">
                                    A4 Dikey (Portrait)
                                </Badge>
                            </div>

                            {/* Çoklu mod sayfa gezici */}
                            {targetStages.length > 1 && (
                                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-xl border border-white/10 text-xs">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setPreviewPageIndex(prev => Math.max(0, prev - 1))}
                                        disabled={previewPageIndex <= 0}
                                        className="h-6 w-6 p-0 rounded text-slate-300"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </Button>
                                    <span className="font-bold text-[11px] text-amber-300">
                                        Sayfa {previewPageIndex + 1} / {targetStages.length}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setPreviewPageIndex(prev => Math.min(targetStages.length - 1, prev + 1))}
                                        disabled={previewPageIndex >= targetStages.length - 1}
                                        className="h-6 w-6 p-0 rounded text-slate-300"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* ÖNİZLEME KAĞIDI ALANI (A4 MOCKUP) */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-4 flex justify-center items-start">
                            <div className="w-full max-w-[620px] bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-300 p-5 sm:p-6 flex flex-col justify-between gap-3 text-left select-none transition-all">
                                
                                {/* 1. ÜST BAŞLIK */}
                                <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-center">
                                    <div>
                                        <div className="text-[9px] font-extrabold text-emerald-700 tracking-wider">
                                            T.C. MİLLÎ EĞİTİM BAKANLIĞI
                                        </div>
                                        <div className="text-xs font-black text-slate-900">
                                            {schoolTitle}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500">
                                            KUR'AN-I KERİM &amp; ELİFBA ÇALIŞMA YAPRAĞI
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-slate-900 text-white font-black text-[10px] px-2 py-0.5 rounded">
                                            ADIM {previewStage.stepNumber}
                                        </span>
                                        <div className="text-[9px] font-bold text-emerald-700 mt-0.5">
                                            {previewStage.sectionTitle.split(':')[0]}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. ÖĞRENCİ BİLGİ ŞERİDİ */}
                                <div className="flex items-center justify-between bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-[10px]">
                                    <div>
                                        <span className="font-bold text-slate-600">Adı Soyadı: </span>
                                        <span className="font-extrabold text-slate-900">
                                            {currentStudent?.displayName || '...........................................'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-600">Sınıf: </span>
                                        <span className="font-extrabold text-slate-900">
                                            {currentClass?.name || '.......'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-600">Tarih: </span>
                                        <span className="font-extrabold text-slate-900">
                                            {new Date().toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                </div>

                                {/* 3. ADIM BAŞLIĞI & YÖNERGE */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-xs text-slate-900">
                                            {previewStage.title}
                                        </h3>
                                        <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                                            {previewItems.length} Alıştırma
                                        </span>
                                    </div>

                                    {showRuleBox && (
                                        <div className="bg-slate-50 border border-slate-300 border-l-4 border-l-emerald-600 rounded p-1.5 text-[9.5px] leading-snug">
                                            <span className="font-extrabold text-emerald-700 block text-[9px]">
                                                📖 YÖNERGE &amp; OKUMA KURALI:
                                            </span>
                                            <p className="text-slate-800 font-medium">
                                                {ELIFBA_UNITS.find(u => u.id === previewStage.id)?.description || previewStage.description}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* 4. KARTLAR IZGARASI (SAĞDAN SOLA ARAPÇA SIRA) */}
                                <div 
                                    className="grid gap-1.5 my-1"
                                    style={{
                                        direction: 'rtl',
                                        gridTemplateColumns: previewItems.length <= 14 
                                            ? 'repeat(4, minmax(0, 1fr))' 
                                            : previewItems.length <= 20 
                                            ? 'repeat(5, minmax(0, 1fr))' 
                                            : 'repeat(7, minmax(0, 1fr))'
                                    }}
                                >
                                    {previewItems.map((item, idx) => {
                                        const m = getStageItemMeta(previewStage.id, item.index);
                                        const itemName = m?.name || item.alt || `Öğe ${item.index}`;
                                        const arabicChar = m?.arabic || '';

                                        return (
                                            <div
                                                key={idx}
                                                style={{ direction: 'ltr' }}
                                                className="border-2 border-slate-900 rounded-md p-1 bg-white flex flex-col justify-between items-center min-h-[52px]"
                                            >
                                                {/* Kart Başı: # ve Tekrar Kutuları */}
                                                <div className="w-full flex items-center justify-between text-[8px] border-b border-slate-200 pb-0.5">
                                                    <span className="font-extrabold text-slate-500">#{item.index}</span>
                                                    {showRepetitionBoxes && (
                                                        <div className="flex items-center gap-1 text-[7.5px]">
                                                            <span>1<i className="inline-block w-2 h-2 border border-slate-900 ml-0.5" /></span>
                                                            <span>2<i className="inline-block w-2 h-2 border border-slate-900 ml-0.5" /></span>
                                                            <span>3<i className="inline-block w-2 h-2 border border-slate-900 ml-0.5" /></span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Resim veya Arapça Karakter */}
                                                <div className="h-9 w-full flex items-center justify-center my-auto p-0.5">
                                                    {item.img ? (
                                                        <img
                                                            src={item.img}
                                                            alt={itemName}
                                                            className="max-h-full max-w-full object-contain pointer-events-none"
                                                        />
                                                    ) : (
                                                        <span className="text-xl font-bold font-serif">{arabicChar}</span>
                                                    )}
                                                </div>

                                                {/* Kart Sonu: Türkçe İsim */}
                                                {showPronunciationHints && (
                                                    <div className="w-full border-t border-slate-200 pt-0.5 text-center">
                                                        <span className="text-[7.5px] font-black text-slate-800 truncate block">
                                                            {itemName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 5. ÖĞRETMEN DEĞERLENDİRME & VELİ İMZASI */}
                                {showEvaluationRubric && (
                                    <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between items-end text-[9px]">
                                        <div className="space-y-0.5">
                                            <span className="font-extrabold text-slate-900 block">
                                                Öğretmen Değerlendirmesi:
                                            </span>
                                            <div className="flex gap-2 text-slate-700">
                                                <span>[ ] Pekiyi (100)</span>
                                                <span>[ ] İyi (85)</span>
                                                <span>[ ] Orta (70)</span>
                                                <span>[ ] Tekrar Edilsin</span>
                                            </div>
                                            <div className="font-bold text-slate-500">
                                                Puan: _____ / 100
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-center">
                                            <div>
                                                <span className="font-bold text-slate-500">Öğretmen İmzası</span>
                                                <div className="w-14 border-b border-dotted border-slate-900 mt-3" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-500">Veli İmzası</span>
                                                <div className="w-14 border-b border-dotted border-slate-900 mt-3" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                    </div>

                </div>

            </DialogContent>
        </Dialog>
    );
}
