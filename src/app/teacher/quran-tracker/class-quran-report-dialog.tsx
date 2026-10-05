'use client';

import React, { useState, useMemo, useRef } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    FileSpreadsheet,
    Printer,
    Share2,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Search,
    Send,
    Copy,
    Check,
    Sparkles,
    LayoutGrid,
    BookOpen,
    Info,
    CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    DIYANET_ELIFBA_STAGES,
    getStageItemMeta,
    mapLegacyStageIdToDiyanet,
    LEGACY_STAGE_ALIASES,
    isDiyanetStageCompleted,
    getDiyanetStepNumber
} from '@/lib/elifba-curriculum';
import type { QuranStudentProgress } from './actions';

interface ClassQuranReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    students: UserProfile[];
    progressMap: { [uid: string]: QuranStudentProgress };
    classId: string;
    className: string;
    branch: string;
    ambianceTheme?: 'dark' | 'light';
    onOpenStudentShare?: (student: UserProfile, stageId: string) => void;
}

export function ClassQuranReportDialog({
    isOpen,
    onClose,
    students,
    progressMap,
    classId,
    className,
    branch,
    ambianceTheme = 'dark',
    onOpenStudentShare
}: ClassQuranReportDialogProps) {
    const { toast } = useToast();
    const tableRef = useRef<HTMLDivElement | null>(null);

    // Sekmeler: 'cards' (Genişletilmiş Detaylı Rapor - Varsayılan) | 'table' (Kompakt Çizelge) | 'whatsapp' (Toplu WhatsApp Bülteni)
    const [activeTab, setActiveTab] = useState<'cards' | 'table' | 'whatsapp'>('cards');

    // Filtreleme & Arama
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [levelFilter, setLevelFilter] = useState<'all' | 'quran' | 'elifba' | 'needs_practice'>('all');
    const [sortBy, setSortBy] = useState<'number' | 'name' | 'stage' | 'score'>('number');

    // WhatsApp mesajı kopyalama durumu
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Her öğrenci için detaylı aşama, geçilen adımlar, başarı ve hata özetini hesapla
    const studentReportList = useMemo(() => {
        return students.map((student, index) => {
            const prog = progressMap[student.uid];
            const cuzPage = prog?.cuzPage;
            const isQuran = Boolean((cuzPage && cuzPage > 0) || isDiyanetStageCompleted(prog?.stages, 'cuz'));

            // Aktif aşama ID'si
            let activeStageId = prog?.currentStageId || 'cuz1';
            activeStageId = mapLegacyStageIdToDiyanet(activeStageId);

            const stageObj = DIYANET_ELIFBA_STAGES.find(s => s.id === activeStageId) || DIYANET_ELIFBA_STAGES[0];
            const stepNum = getDiyanetStepNumber(activeStageId, cuzPage);

            // Harf / Öğe durumları
            const stageData = prog?.stages?.[activeStageId];
            let itemStatuses: Record<number, '+' | 'o' | '-'> = {};

            if (stageData?.itemStatuses) {
                for (const [k, v] of Object.entries(stageData.itemStatuses)) {
                    const num = Number(k);
                    if (!isNaN(num) && (v === '+' || v === 'o' || v === '-')) {
                        itemStatuses[num] = v;
                    }
                }
            } else {
                // Eski alias kontrolü
                for (const [legacyId, mappedId] of Object.entries(LEGACY_STAGE_ALIASES)) {
                    if (mappedId === activeStageId && prog?.stages?.[legacyId]?.itemStatuses) {
                        const saved = prog.stages[legacyId].itemStatuses;
                        if (saved) {
                            for (const [k, v] of Object.entries(saved)) {
                                const num = Number(k);
                                if (!isNaN(num) && (v === '+' || v === 'o' || v === '-')) {
                                    itemStatuses[num] = v;
                                }
                            }
                        }
                        break;
                    }
                }
            }

            const totalItems = stageObj.itemCount;
            const correctCount = Object.values(itemStatuses).filter(s => s === '+').length;
            const helpCount = Object.values(itemStatuses).filter(s => s === 'o').length;
            const wrongCount = Object.values(itemStatuses).filter(s => s === '-').length;
            const evaluatedCount = Object.keys(itemStatuses).length;
            const score = totalItems > 0 ? Math.round(((correctCount + helpCount * 0.5) / totalItems) * 100) : 0;

            // Tekrar edilmesi / çalışılması gereken harfler listesi
            const repeatLetters: Array<{ name: string; arabic?: string; desc?: string; status: '-' | 'o' }> = [];
            for (let i = 1; i <= totalItems; i++) {
                const st = itemStatuses[i];
                if (st === '-' || st === 'o') {
                    const meta = getStageItemMeta(stageObj.id, i);
                    repeatLetters.push({
                        name: meta?.name || `#${i}`,
                        arabic: meta?.arabic,
                        desc: meta?.desc,
                        status: st
                    });
                }
            }

            // Geçtikleri adımlar (Tamamlanan Aşamalar)
            const completedStages: Array<{
                id: string;
                stepNumber: number;
                title: string;
                shortTitle: string;
                score?: number;
            }> = [];

            DIYANET_ELIFBA_STAGES.forEach(s => {
                if (s.id === 'cuz') return;

                const sData = prog?.stages?.[s.id];
                const isExplicitComp = isDiyanetStageCompleted(prog?.stages, s.id) ||
                    (sData?.status === 'completed') ||
                    (sData?.score !== undefined && sData.score >= 70);

                const isPriorStep = (isQuran && s.stepNumber < 30) || (stepNum > s.stepNumber);
                const isCurrentCompleted = (s.id === activeStageId && !isQuran && (sData?.status === 'completed' || score >= 70));

                if (isExplicitComp || isPriorStep || isCurrentCompleted) {
                    completedStages.push({
                        id: s.id,
                        stepNumber: s.stepNumber,
                        title: s.title,
                        shortTitle: s.shortTitle,
                        score: sData?.score
                    });
                }
            });

            // Durum etiketi
            let statusText = 'Başlamadı';
            if (isQuran) {
                statusText = `Kur'an (Sayfa ${cuzPage || 1})`;
            } else if (stageData?.status === 'completed' || score >= 70) {
                statusText = 'Aşamayı Geçti';
            } else if (evaluatedCount > 0) {
                statusText = score >= 50 ? 'Çalışıyor' : 'Tekrar Ediyor';
            }

            return {
                student,
                prog,
                studentNumber: student.studentNumber || (index + 1).toString(),
                studentName: student.displayName || 'İsimsiz Öğrenci',
                isQuran,
                cuzPage,
                stepNumber: stepNum,
                stageId: activeStageId,
                stageTitle: isQuran ? `Kur'an-ı Kerim (${cuzPage ? `${cuzPage}. Sayfa` : 'Cüz'})` : stageObj.title,
                shortTitle: isQuran ? `Kur'an ${cuzPage ? `s.${cuzPage}` : ''}` : stageObj.shortTitle,
                score,
                correctCount,
                helpCount,
                wrongCount,
                evaluatedCount,
                repeatLetters,
                completedStages,
                hasMistakes: repeatLetters.length > 0,
                statusText
            };
        });
    }, [students, progressMap]);

    // Filtrelenmiş ve Sıralanmış Liste
    const filteredList = useMemo(() => {
        let list = [...studentReportList];

        // 1. Arama filtresi
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter(item =>
                item.studentName.toLowerCase().includes(q) ||
                item.studentNumber.toLowerCase().includes(q)
            );
        }

        // 2. Seviye Filtresi
        if (levelFilter === 'quran') {
            list = list.filter(item => item.isQuran);
        } else if (levelFilter === 'elifba') {
            list = list.filter(item => !item.isQuran);
        } else if (levelFilter === 'needs_practice') {
            list = list.filter(item => item.hasMistakes || item.wrongCount > 0);
        }

        // 3. Sıralama
        list.sort((a, b) => {
            if (sortBy === 'number') {
                const numA = parseInt(a.studentNumber, 10);
                const numB = parseInt(b.studentNumber, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.studentNumber.localeCompare(b.studentNumber, 'tr');
            } else if (sortBy === 'name') {
                return a.studentName.localeCompare(b.studentName, 'tr');
            } else if (sortBy === 'stage') {
                return b.stepNumber - a.stepNumber;
            } else if (sortBy === 'score') {
                return b.score - a.score;
            }
            return 0;
        });

        return list;
    }, [studentReportList, searchTerm, levelFilter, sortBy]);

    // Sınıf Genel Özet İstatistikleri
    const summaryStats = useMemo(() => {
        const total = studentReportList.length;
        const quranCount = studentReportList.filter(s => s.isQuran).length;
        const elifbaCount = total - quranCount;
        const withMistakesCount = studentReportList.filter(s => s.hasMistakes).length;

        const evaluatedStudents = studentReportList.filter(s => s.evaluatedCount > 0);
        const avgScore = evaluatedStudents.length > 0
            ? Math.round(evaluatedStudents.reduce((acc, s) => acc + s.score, 0) / evaluatedStudents.length)
            : 0;

        return {
            total,
            quranCount,
            elifbaCount,
            withMistakesCount,
            avgScore,
            quranPercent: total > 0 ? Math.round((quranCount / total) * 100) : 0
        };
    }, [studentReportList]);

    // Toplu WhatsApp Sınıf Bülteni Metni
    const whatsappClassMessage = useMemo(() => {
        const lines: string[] = [];
        const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const classTitle = `${className}${branch && branch !== 'all' ? ` / ${branch}` : ''}`;

        lines.push(`📊 *DİN DERSİ ATÖLYESİ - TOPLU SINIF KUR'AN & ELİFBA TAKİP RAPORU* 📊`);
        lines.push(`📅 *Tarih:* ${dateStr}`);
        lines.push(`🏫 *Sınıf / Şube:* ${classTitle}`);
        lines.push(`👥 *Toplam Öğrenci:* ${summaryStats.total}`);
        lines.push(`📖 *Kur'an-ı Kerim'e Geçen:* ${summaryStats.quranCount} Öğrenci (%${summaryStats.quranPercent})`);
        lines.push(`🌱 *Elifba Aşamalarında:* ${summaryStats.elifbaCount} Öğrenci`);
        lines.push(`📈 *Sınıf Başarı Ortalaması:* %${summaryStats.avgScore}`);

        lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`📋 *ÖĞRENCİ BAZLI DETAYLI GELİŞİM VE TEKRAR LİSTESİ:*`);

        studentReportList.forEach((item, idx) => {
            const noStr = item.student.studentNumber ? `(No: ${item.student.studentNumber})` : '';
            lines.push(`\n${idx + 1}. *${item.studentName}* ${noStr}`);

            if (item.isQuran) {
                lines.push(`   📖 *Seviye:* Kur'an-ı Kerim Okuyor (${item.cuzPage || 1}. Sayfa)`);
                lines.push(`   ✅ *Geçtiği Adımlar:* Elifba'nın 30 Adımı Tamamlandı`);
            } else {
                lines.push(`   📍 *Şu Anki Adım:* ${item.stageTitle} (Başarı: %${item.score})`);
                if (item.completedStages.length > 0) {
                    const passedNames = item.completedStages.map(s => s.shortTitle).join(', ');
                    lines.push(`   ✅ *Geçtiği Adımlar (${item.completedStages.length}):* ${passedNames}`);
                } else {
                    lines.push(`   ✅ *Geçtiği Adımlar:* Henüz tamamlanan adım yok (1. Adımda)`);
                }

                if (item.repeatLetters.length > 0) {
                    const mistakesFormatted = item.repeatLetters.map(r => r.arabic ? `${r.arabic} (${r.name})` : r.name).join(', ');
                    lines.push(`   ⚠️ *Evde Tekrar Edilecek Harfler:* ${mistakesFormatted}`);
                } else if (item.evaluatedCount > 0 && item.wrongCount === 0) {
                    lines.push(`   🎉 *Tebrikler:* Bu aşamayı eksiksiz tamamladı, tekrar harfi yok.`);
                }
            }
        });

        lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`💡 *Öğretmen Tavsiyesi:*`);
        lines.push(`Öğrencilerimizin evde takıldıkları harfleri ve harekeleri düzenli olarak sesli tekrar etmeleri tavsiye edilir. Destek olan tüm velilerimize teşekkür ederiz.`);
        lines.push(`\n✨ *Din Dersi Atölyesi ile Kur'an Eğitimi* ✨`);

        return lines.join('\n');
    }, [className, branch, summaryStats, studentReportList]);

    // Panoya Kopyalama
    const handleCopyWhatsApp = async () => {
        try {
            await navigator.clipboard.writeText(whatsappClassMessage);
            setIsCopied(true);
            toast({
                title: "Kopyalandı! 📋",
                description: "Toplu sınıf WhatsApp bülteni panoya kopyalandı."
            });
            setTimeout(() => setIsCopied(false), 2500);
        } catch {
            toast({
                title: "Kopyalama Başarısız",
                description: "Metni kutudan manuel kopyalayabilirsiniz.",
                variant: "destructive"
            });
        }
    };

    // WhatsApp'ta Aç
    const handleOpenWhatsApp = () => {
        const encoded = encodeURIComponent(whatsappClassMessage);
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };

    // Excel (CSV) Formatında İndir
    const handleDownloadCSV = () => {
        try {
            const BOM = "\uFEFF";
            const headers = [
                "Sıra",
                "Okul No",
                "Öğrenci Adı Soyadı",
                "Sınıf",
                "Şube",
                "Geçtiği Adımlar (Tamamlanan)",
                "Şu Anki Aşama / Konu",
                "Cüz / Kur'an Sayfası",
                "Başarı Puanı (%)",
                "Doğru Sayısı",
                "Yardım Sayısı",
                "Tekrar (Hata) Sayısı",
                "Evde Tekrar Edilecek Harfler",
                "Genel Durum"
            ];

            const rows = studentReportList.map((item, idx) => {
                const mistakeLetters = item.repeatLetters.map(r => r.arabic ? `${r.arabic} (${r.name})` : r.name).join(' - ');
                const passedSteps = item.isQuran
                    ? "Elifba Tamamlandı"
                    : item.completedStages.map(s => s.shortTitle).join(', ');

                return [
                    idx + 1,
                    `"${item.studentNumber}"`,
                    `"${item.studentName}"`,
                    `"${className}"`,
                    `"${branch}"`,
                    `"${passedSteps || "1. Adımda"}"`,
                    `"${item.stageTitle}"`,
                    item.cuzPage || "",
                    item.score,
                    item.correctCount,
                    item.helpCount,
                    item.wrongCount,
                    `"${mistakeLetters || (item.evaluatedCount > 0 ? "Hata Yok" : "Test Edilmedi")}"`,
                    `"${item.statusText}"`
                ];
            });

            const csvContent = BOM + [
                headers.join(';'),
                ...rows.map(r => r.join(';'))
            ].join('\r\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeClass = `${className}_${branch}`.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, '_');
            link.download = `${safeClass}_Kuran_Elifba_Toplu_Takip_Listesi.csv`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);

            toast({
                title: "Excel (CSV) İndirildi! 📊",
                description: "Sınıf takip çizelgesi Excel formatında başarıyla kaydedildi."
            });
        } catch (err: any) {
            console.error("CSV Export failed:", err);
            toast({
                title: "İndirme Hatası",
                description: "Excel listesi oluşturulamadı.",
                variant: "destructive"
            });
        }
    };

    // A4 Formatında Genişletilmiş ve Sayfalarca Olabilen Resmi Raporu Yazdır / PDF İndir
    const handlePrintClassTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
        const classTitle = `${className} Sınıfı ${branch && branch !== 'all' ? `(${branch} Şubesi)` : ''}`;

        const cardsHtml = studentReportList.map((item, idx) => {
            // Geçtiği Adımlar rozetleri
            let passedStepsHtml = '';
            if (item.isQuran) {
                passedStepsHtml = `<span class="badge badge-success">✓ Elifba'nın 30 Adımı Başarıyla Tamamlandı</span>`;
            } else if (item.completedStages.length > 0) {
                passedStepsHtml = item.completedStages.map(s => `<span class="badge badge-step">✓ ${s.shortTitle}</span>`).join(' ');
            } else {
                passedStepsHtml = `<span class="text-muted">Henüz tamamlanan aşama yok (1. Adımda)</span>`;
            }

            // Tekrar Harfleri
            let mistakesHtml = '';
            if (item.repeatLetters.length > 0) {
                const letterBoxes = item.repeatLetters.map(r => `
                    <div class="letter-box ${r.status === '-' ? 'border-wrong' : 'border-help'}">
                        <div class="arabic-letter">${r.arabic || r.name}</div>
                        <div class="letter-name">${r.name}</div>
                        <div class="letter-badge ${r.status === '-' ? 'badge-wrong' : 'badge-help'}">
                            ${r.status === '-' ? '✗ Tekrar' : '◎ Yardımla'}
                        </div>
                        ${r.desc ? `<div class="letter-desc">${r.desc}</div>` : ''}
                    </div>
                `).join('');

                mistakesHtml = `
                    <div class="mistakes-section">
                        <div class="section-subtitle">
                            ⚠️ <strong>Evde Tekrar Edilmesi / Çalışılması Gereken Harfler &amp; Harekeler (${item.repeatLetters.length} Adet):</strong>
                        </div>
                        <div class="letter-grid">
                            ${letterBoxes}
                        </div>
                    </div>
                `;
            } else if (item.evaluatedCount > 0) {
                mistakesHtml = `
                    <div class="success-box">
                        <span style="font-size: 16px;">🎉</span>
                        <div>
                            <strong>Tebrikler!</strong> Bu aşamada tekrar edilmesi gereken eksik harf bulunmamaktadır. Tüm harfler ve harekeler başarıyla kavrandı.
                        </div>
                    </div>
                `;
            } else {
                mistakesHtml = `
                    <div class="info-box">
                        <span style="font-size: 15px;">ℹ️</span>
                        <div>Bu aşama için henüz birebir okuma testi değerlendirmesi girilmemiştir.</div>
                    </div>
                `;
            }

            return `
                <div class="student-card">
                    <!-- ÜST ŞERİT: ÖĞRENCİ KİMLİK & BAŞARI PUANI -->
                    <div class="student-card-header">
                        <div class="student-info">
                            <span class="student-order">#${idx + 1}</span>
                            <span class="student-num">No: ${item.studentNumber}</span>
                            <span class="student-name">${item.studentName}</span>
                            <span class="student-class">${className}${branch && branch !== 'all' ? `/${branch}` : ''}</span>
                        </div>
                        <div class="student-score-badge ${item.isQuran ? 'score-quran' : item.score >= 70 ? 'score-high' : item.score >= 50 ? 'score-mid' : 'score-low'}">
                            ${item.isQuran ? "✓ Kur'an Okuyor" : `%${item.score} Başarı • ${item.statusText}`}
                        </div>
                    </div>

                    <!-- ORTA ŞERİT: GEÇTİĞİ ADIMLAR, ŞU ANKİ ADIM & PUAN DETAYI -->
                    <div class="student-details-grid">
                        <div class="detail-box">
                            <div class="detail-label">✓ GEÇTİĞİ ADIMLAR (${item.isQuran ? '30 Adım' : `${item.completedStages.length} Adım`})</div>
                            <div class="detail-content">
                                ${passedStepsHtml}
                            </div>
                        </div>

                        <div class="detail-box">
                            <div class="detail-label">📍 ŞU ANKİ AŞAMA / KONU</div>
                            <div class="detail-content">
                                <strong style="color: #0f172a; font-size: 13px;">${item.stageTitle}</strong>
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                                    ${item.isQuran ? "Kur'an-ı Kerim Tilaveti ve Tecvid" : `Diyanet Elifba Müfredatı • Adım ${item.stepNumber}/30`}
                                </div>
                            </div>
                        </div>

                        <div class="detail-box">
                            <div class="detail-label">📊 TEST VE BAŞARI DURUMU</div>
                            <div class="detail-content">
                                <div style="font-weight: 800; font-size: 13px; color: ${item.score >= 70 ? '#15803d' : item.score >= 50 ? '#b45309' : '#b91c1c'};">
                                    Başarı Skoru: %${item.score}
                                </div>
                                <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                                    <b>${item.correctCount}</b> Doğru &bull; <b>${item.helpCount}</b> Yardımla &bull; <b>${item.wrongCount}</b> Tekrar
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ALT BÖLÜM: BÜYÜK ARAPÇA HARFLERLE HAREKELİ TEKRAR LİSTESİ -->
                    ${mistakesHtml}
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="utf-8" />
                <title>${classTitle} - Kur'an &amp; Elifba Detaylı Takip ve Gelişim Raporu</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 10mm 10mm 12mm 10mm;
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

                    /* ÜST BAŞLIK */
                    .header-box {
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 12px;
                        margin-bottom: 14px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .header-title {
                        font-size: 11px;
                        font-weight: 800;
                        color: #047857;
                        letter-spacing: 1.5px;
                        text-transform: uppercase;
                    }
                    .header-main {
                        font-size: 18px;
                        font-weight: 900;
                        color: #0f172a;
                        margin: 3px 0 0 0;
                    }
                    .header-right {
                        text-align: right;
                        font-size: 11px;
                        color: #475569;
                        line-height: 1.5;
                    }

                    /* İSTATİSTİK ŞERİDİ */
                    .stats-box {
                        display: flex;
                        justify-content: space-between;
                        gap: 10px;
                        margin-bottom: 16px;
                        padding: 10px 14px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 10px;
                        font-size: 12px;
                        font-weight: 700;
                    }

                    /* ÖĞRENCİ KARTI - ÇOK SAYFALI ÇIKTIYA UYGUN, BÖLÜNMEZ */
                    .student-card {
                        border: 1.5px solid #cbd5e1;
                        border-radius: 12px;
                        margin-bottom: 16px;
                        background: #ffffff;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                        overflow: hidden;
                    }

                    .student-card-header {
                        background: #f1f5f9;
                        border-bottom: 1px solid #e2e8f0;
                        padding: 8px 14px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .student-info {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .student-order {
                        background: #0f172a;
                        color: #ffffff;
                        font-weight: 900;
                        font-size: 11px;
                        padding: 2px 7px;
                        border-radius: 6px;
                    }
                    .student-num {
                        font-family: monospace;
                        font-weight: 800;
                        font-size: 12px;
                        color: #475569;
                        background: #ffffff;
                        border: 1px solid #cbd5e1;
                        padding: 2px 6px;
                        border-radius: 6px;
                    }
                    .student-name {
                        font-weight: 900;
                        font-size: 15px;
                        color: #0f172a;
                    }
                    .student-class {
                        font-size: 11px;
                        font-weight: 700;
                        color: #047857;
                        background: #d1fae5;
                        border: 1px solid #a7f3d0;
                        padding: 2px 7px;
                        border-radius: 6px;
                    }

                    .student-score-badge {
                        font-size: 11px;
                        font-weight: 900;
                        padding: 4px 10px;
                        border-radius: 8px;
                    }
                    .score-quran { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
                    .score-high { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
                    .score-mid { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
                    .score-low { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

                    /* ORTA DETAY IZGARASI */
                    .student-details-grid {
                        display: grid;
                        grid-template-columns: 1.2fr 1fr 1fr;
                        gap: 8px;
                        padding: 10px 14px;
                        background: #fafafa;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .detail-box {
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 6px 10px;
                    }
                    .detail-label {
                        font-size: 10px;
                        font-weight: 900;
                        color: #64748b;
                        letter-spacing: 0.5px;
                        margin-bottom: 4px;
                        text-transform: uppercase;
                    }
                    .badge {
                        display: inline-block;
                        font-size: 10px;
                        font-weight: 700;
                        padding: 2px 6px;
                        border-radius: 5px;
                        margin: 1px;
                    }
                    .badge-step {
                        background: #f1f5f9;
                        color: #334155;
                        border: 1px solid #cbd5e1;
                    }
                    .badge-success {
                        background: #dcfce7;
                        color: #166534;
                        border: 1px solid #bbf7d0;
                    }
                    .text-muted {
                        font-size: 11px;
                        color: #94a3b8;
                        font-style: italic;
                    }

                    /* TEKRAR EDİLECEK HARFLER BÖLÜMÜ */
                    .mistakes-section {
                        padding: 10px 14px 12px 14px;
                    }
                    .section-subtitle {
                        font-size: 12px;
                        color: #991b1b;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    .letter-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
                        gap: 8px;
                    }
                    .letter-box {
                        background: #ffffff;
                        border-radius: 10px;
                        padding: 8px 6px;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    .border-wrong {
                        border: 1.5px solid #fca5a5;
                        background: #fffafa;
                    }
                    .border-help {
                        border: 1.5px solid #fde68a;
                        background: #fffdf5;
                    }

                    /* BÜYÜK ARAPÇA HARF VE HAREKE */
                    .arabic-letter {
                        font-family: 'Amiri', 'Traditional Arabic', serif;
                        font-size: 34px;
                        font-weight: bold;
                        line-height: 1.1;
                        color: #0f172a;
                        margin: 2px 0 4px 0;
                        text-shadow: 0 0 1px rgba(0,0,0,0.1);
                    }
                    .letter-name {
                        font-size: 12px;
                        font-weight: 800;
                        color: #1e293b;
                        line-height: 1.2;
                    }
                    .letter-badge {
                        font-size: 9px;
                        font-weight: 900;
                        padding: 1px 6px;
                        border-radius: 4px;
                        margin-top: 4px;
                        display: inline-block;
                    }
                    .badge-wrong {
                        background: #fee2e2;
                        color: #991b1b;
                        border: 1px solid #fecaca;
                    }
                    .badge-help {
                        background: #fef3c7;
                        color: #92400e;
                        border: 1px solid #fde68a;
                    }
                    .letter-desc {
                        font-size: 9.5px;
                        color: #64748b;
                        margin-top: 3px;
                        line-height: 1.2;
                    }

                    .success-box {
                        margin: 10px 14px;
                        background: #f0fdf4;
                        border: 1px solid #bbf7d0;
                        border-radius: 8px;
                        padding: 8px 12px;
                        color: #15803d;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .info-box {
                        margin: 10px 14px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 8px 12px;
                        color: #64748b;
                        font-size: 12px;
                        font-style: italic;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    /* FOOTER VE İMZA */
                    .report-footer {
                        margin-top: 25px;
                        border-top: 1px solid #cbd5e1;
                        padding-top: 15px;
                        page-break-inside: avoid;
                    }
                    .teacher-guidance {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 10px 14px;
                        font-size: 11px;
                        color: #334155;
                        line-height: 1.5;
                        margin-bottom: 25px;
                    }
                    .signatures-row {
                        display: flex;
                        justify-content: space-around;
                        font-size: 12px;
                        text-align: center;
                    }
                    .signature-slot {
                        width: 200px;
                    }
                    .signature-title {
                        font-weight: 800;
                        color: #334155;
                    }
                    .signature-line {
                        margin-top: 40px;
                        border-top: 1px dashed #94a3b8;
                        font-size: 11px;
                        color: #64748b;
                        padding-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <div class="header-title">T.C. MİLLÎ EĞİTİM BAKANLIĞI / DİN DERSİ ATÖLYESİ</div>
                        <h1 class="header-main">${classTitle} KUR'AN-I KERİM &amp; ELİFBA AYRINTILI GELİŞİM VE TEKRAR RAPORU</h1>
                    </div>
                    <div class="header-right">
                        <div><strong>Rapor Tarihi:</strong> ${dateStr}</div>
                        <div><strong>Müfredat:</strong> Diyanet 30 Adım &amp; Kur'an Takibi</div>
                    </div>
                </div>

                <div class="stats-box">
                    <span>Toplam Öğrenci: <b>${summaryStats.total}</b></span>
                    <span>&bull;</span>
                    <span style="color: #15803d;">Kur'an'a Geçen: <b>${summaryStats.quranCount} (%${summaryStats.quranPercent})</b></span>
                    <span>&bull;</span>
                    <span style="color: #0369a1;">Elifba Aşamalarında: <b>${summaryStats.elifbaCount}</b></span>
                    <span>&bull;</span>
                    <span style="color: #b45309;">Sınıf Başarı Ortalaması: <b>%${summaryStats.avgScore}</b></span>
                </div>

                <div class="cards-container">
                    ${cardsHtml}
                </div>

                <div class="report-footer">
                    <div class="teacher-guidance">
                        <strong>💡 Öğretmen Rehberliği &amp; Veli Tavsiyesi:</strong><br />
                        Öğrencilerimizin evde takıldıkları harfleri ve harekeleri velileri eşliğinde sesli olarak tekrar etmeleri tavsiye edilir. Günlük 10-15 dakikalık düzenli okuma çalışmaları, mahreç kalitesini ve akıcılığı belirgin şekilde artıracaktır. Destek olan tüm velilerimize teşekkür ederiz.
                    </div>

                    <div class="signatures-row">
                        <div class="signature-slot">
                            <div class="signature-title">Ders Öğretmeni</div>
                            <div class="signature-line">İmza / Tarih</div>
                        </div>
                        <div class="signature-slot">
                            <div class="signature-title">Okul Müdürü</div>
                            <div class="signature-line">İmza / Mühür</div>
                        </div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn(
                "max-w-6xl max-h-[94vh] overflow-hidden flex flex-col p-0 rounded-3xl border shadow-2xl",
                ambianceTheme === 'dark'
                    ? "bg-slate-950 border-white/15 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
            )}>
                {/* 1. ÜST BAŞLIK */}
                <div className={cn(
                    "p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-50/70 border-slate-200"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-900/40 shrink-0">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-black tracking-tight">Toplu Sınıf Kur&apos;an Takip Çizelgesi</h2>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                    {className} {branch !== 'all' ? `(${branch})` : ''}
                                </Badge>
                                <Badge variant="outline" className="text-xs font-mono">
                                    {students.length} Öğrenci
                                </Badge>
                            </div>
                            <p className={cn("text-xs mt-0.5", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                Geçilen adımlar, mevcut konular, başarı durumları ve büyük harflerle evde tekrar listesi
                            </p>
                        </div>
                    </div>

                    {/* Hızlı Eylemler (Excel, Çok Sayfalı Yazdır / PDF) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCSV}
                            className={cn(
                                "h-9 rounded-xl font-bold text-xs border cursor-pointer",
                                ambianceTheme === 'dark' ? "bg-white/6 border-white/15 hover:bg-white/12 text-slate-200" : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                            )}
                            title="Tüm sınıfı Excel (CSV) formatında indir"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                            <span>Excel İndir</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handlePrintClassTable}
                            className="h-9 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                            title="A4 Formatında Ayrıntılı Çok Sayfalı Rapor Yazdır / PDF İndir"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>A4 Raporu Yazdır / PDF</span>
                        </Button>
                    </div>
                </div>

                {/* 2. ÖZET İSTATİSTİK ŞERİDİ */}
                <div className={cn(
                    "px-4 py-3 border-b grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/[0.02] border-white/8" : "bg-slate-50 border-slate-200"
                )}>
                    <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] block font-bold text-slate-400 uppercase">Toplam Öğrenci</span>
                        <span className="text-xl font-black text-white">{summaryStats.total}</span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="text-[10px] block font-bold uppercase">Kur&apos;an-ı Kerim&apos;de</span>
                        <span className="text-xl font-black">{summaryStats.quranCount} <span className="text-xs opacity-75">(%{summaryStats.quranPercent})</span></span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                        <span className="text-[10px] block font-bold uppercase">Elifba Aşamalarında</span>
                        <span className="text-xl font-black">{summaryStats.elifbaCount}</span>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <span className="text-[10px] block font-bold uppercase">Sınıf Başarı Ortalaması</span>
                        <span className="text-xl font-black">%{summaryStats.avgScore}</span>
                    </div>
                </div>

                {/* 3. İÇERİK SEKME VE FİLTRE ÇUBUĞU */}
                <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                        {/* 3 Sekme: Detaylı Rapor (Genişletilmiş), Kompakt Çizelge, WhatsApp */}
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                            <TabsList className={cn(
                                "grid grid-cols-3 p-1 rounded-2xl border w-full sm:w-[480px]",
                                ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                            )}>
                                <TabsTrigger value="cards" className="rounded-xl font-bold text-xs py-1.5 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Detaylı Rapor
                                </TabsTrigger>
                                <TabsTrigger value="table" className="rounded-xl font-bold text-xs py-1.5 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Kompakt Çizelge
                                </TabsTrigger>
                                <TabsTrigger value="whatsapp" className="rounded-xl font-bold text-xs py-1.5 flex items-center gap-1.5">
                                    <Share2 className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Bülteni
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Filtre ve Arama (Cards ve Table için aktif) */}
                        {activeTab !== 'whatsapp' && (
                            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                                <div className="relative flex-1 sm:w-48">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        placeholder="İsim veya No Ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={cn(
                                            "h-8 text-xs pl-8 rounded-xl border",
                                            ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300"
                                        )}
                                    />
                                </div>

                                <Select value={levelFilter} onValueChange={(v: any) => setLevelFilter(v)}>
                                    <SelectTrigger className={cn(
                                        "h-8 text-xs font-bold rounded-xl border w-36",
                                        ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                    )}>
                                        <SelectValue placeholder="Filtrele" />
                                    </SelectTrigger>
                                    <SelectContent className={ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200"}>
                                        <SelectItem value="all" className="text-xs">Tüm Öğrenciler</SelectItem>
                                        <SelectItem value="quran" className="text-xs">Kur&apos;an&apos;a Geçenler</SelectItem>
                                        <SelectItem value="elifba" className="text-xs">Elifba&apos;da Olanlar</SelectItem>
                                        <SelectItem value="needs_practice" className="text-xs">Tekrarı Olanlar</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                    <SelectTrigger className={cn(
                                        "h-8 text-xs font-bold rounded-xl border w-32",
                                        ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                    )}>
                                        <SelectValue placeholder="Sırala" />
                                    </SelectTrigger>
                                    <SelectContent className={ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200"}>
                                        <SelectItem value="number" className="text-xs">Okul No</SelectItem>
                                        <SelectItem value="name" className="text-xs">Öğrenci Adı</SelectItem>
                                        <SelectItem value="stage" className="text-xs">Seviye / Aşama</SelectItem>
                                        <SelectItem value="score" className="text-xs">Başarı Puanı</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* SEKME 1: GENİŞLETİLMİŞ VE BÜYÜK HARFLİ DETAYLI RAPOR LİSTESİ */}
                    {activeTab === 'cards' && (
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                            {filteredList.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 font-bold border rounded-2xl">
                                    Arama kriterlerine uygun öğrenci bulunamadı.
                                </div>
                            ) : (
                                filteredList.map((item, idx) => (
                                    <div
                                        key={item.student.uid}
                                        className={cn(
                                            "rounded-2xl border p-4 sm:p-5 transition-all shadow-sm space-y-4",
                                            ambianceTheme === 'dark'
                                                ? "bg-slate-900/80 border-white/10 hover:border-white/20"
                                                : "bg-white border-slate-200 hover:border-slate-300 shadow-slate-100"
                                        )}
                                    >
                                        {/* ÜST ŞERİT: ÖĞRENCİ BAŞLIĞI, SEVİYE & PUAN */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/10">
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                                                            {item.studentName}
                                                        </h3>
                                                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                                                            No: {item.studentNumber}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                                                            {className} {branch !== 'all' ? `(${branch})` : ''}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Badge className={cn(
                                                    "font-bold text-xs py-1 px-3",
                                                    item.isQuran
                                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                                        : item.score >= 70
                                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                                        : item.score >= 50
                                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                                        : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                                                )}>
                                                    {item.isQuran ? "✓ Kur'an-ı Kerim" : `%${item.score} • ${item.statusText}`}
                                                </Badge>

                                                {onOpenStudentShare && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onOpenStudentShare(item.student, item.stageId)}
                                                        className="h-8 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 cursor-pointer text-xs flex items-center gap-1 font-bold"
                                                        title={`${item.studentName} için WhatsApp Raporunu Aç`}
                                                    >
                                                        <Share2 className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Öğrenci Fişi</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ORTA DETAY BİLGİ KUTULARI (3 SÜTUN) */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* 1. GEÇTİĞİ ADIMLAR */}
                                            <div className={cn(
                                                "p-3 rounded-xl border",
                                                ambianceTheme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                                            )}>
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1">
                                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                    Geçtiği Adımlar ({item.isQuran ? '30 Adım' : `${item.completedStages.length} Adım`})
                                                </div>
                                                {item.isQuran ? (
                                                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        Elifba&apos;nın 30 Adımı Tamamlandı
                                                    </div>
                                                ) : item.completedStages.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                                        {item.completedStages.map(s => (
                                                            <span
                                                                key={s.id}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"
                                                            >
                                                                ✓ {s.shortTitle}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-500 italic">
                                                        Henüz tamamlanan aşama yok (1. Adımda)
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. ŞU ANKİ AŞAMA */}
                                            <div className={cn(
                                                "p-3 rounded-xl border",
                                                ambianceTheme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                                            )}>
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                                                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                                                    Şu Anki Aşama &amp; Konu
                                                </div>
                                                <div className="text-sm font-black text-white">
                                                    {item.stageTitle}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    {item.isQuran ? "Kur'an-ı Kerim Tilaveti ve Tecvid" : `Diyanet Elifba • Adım ${item.stepNumber}/30`}
                                                </div>
                                            </div>

                                            {/* 3. BAŞARI DURUMU */}
                                            <div className={cn(
                                                "p-3 rounded-xl border",
                                                ambianceTheme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                                            )}>
                                                <div className="text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                                    Başarı Durumu &amp; Değerlendirme
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-lg font-black",
                                                        item.score >= 70 ? "text-emerald-400" : item.score >= 50 ? "text-amber-400" : "text-rose-400"
                                                    )}>
                                                        %{item.score}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-bold">
                                                        ({item.correctCount} Doğru / {item.wrongCount} Tekrar)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            item.score >= 70 ? "bg-emerald-500" : item.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                        )}
                                                        style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ALT BÖLÜM: BÜYÜK ARAPÇA HARFLERLE HAREKELİ ÇALIŞILMASI GEREKEN HARFLER */}
                                        <div className="pt-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                                    Çalışılması / Tekrar Edilmesi Gereken Harfler &amp; Harekeler:
                                                </div>
                                                {item.repeatLetters.length > 0 && (
                                                    <span className="text-[11px] font-mono text-rose-400 font-bold">
                                                        {item.repeatLetters.length} Harf
                                                    </span>
                                                )}
                                            </div>

                                            {item.repeatLetters.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                                                    {item.repeatLetters.map((r, rIdx) => (
                                                        <div
                                                            key={rIdx}
                                                            className={cn(
                                                                "p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all",
                                                                r.status === '-'
                                                                    ? "bg-rose-950/30 border-rose-500/40 shadow-sm shadow-rose-950/20"
                                                                    : "bg-amber-950/30 border-amber-500/40 shadow-sm shadow-amber-950/20"
                                                            )}
                                                        >
                                                            {/* BÜYÜK ARAPÇA HARF VE HAREKESİ */}
                                                            <div className="font-serif font-black text-3xl sm:text-4xl text-white my-1 leading-none drop-shadow">
                                                                {r.arabic || r.name}
                                                            </div>
                                                            {/* TÜRKÇE OKUNUŞ / AD */}
                                                            <div className="text-xs font-black text-slate-200 mt-1">
                                                                {r.name}
                                                            </div>
                                                            {/* ROZET */}
                                                            <div className={cn(
                                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 border",
                                                                r.status === '-'
                                                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                                                    : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                                            )}>
                                                                {r.status === '-' ? '✗ Tekrar' : '◎ Yardımla'}
                                                            </div>
                                                            {/* MAHREÇ AÇIKLAMASI */}
                                                            {r.desc && (
                                                                <div className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                                                                    {r.desc}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : item.evaluatedCount > 0 ? (
                                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    Tebrikler! Bu aşamada hata bulunmuyor, tüm harfler ve harekeler başarıyla kavrandı.
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 text-xs italic flex items-center gap-2">
                                                    <Info className="w-4 h-4 text-slate-500" />
                                                    Bu aşama için henüz birebir okuma testi değerlendirmesi girilmedi.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* SEKME 2: RESMİ SINIF ÇİZELGESİ TABLOSU */}
                    {activeTab === 'table' && (
                        <div
                            ref={tableRef}
                            className={cn(
                                "flex-1 overflow-auto rounded-2xl border shadow-inner",
                                ambianceTheme === 'dark' ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200"
                            )}
                        >
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className={cn(
                                    "sticky top-0 z-10 font-black uppercase text-[11px] border-b",
                                    ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700"
                                )}>
                                    <tr>
                                        <th className="py-2.5 px-3 text-center w-10">#</th>
                                        <th className="py-2.5 px-3 text-center w-16">No</th>
                                        <th className="py-2.5 px-3 min-w-[150px]">Öğrenci Adı Soyadı</th>
                                        <th className="py-2.5 px-3 min-w-[140px]">Geçtiği Adımlar</th>
                                        <th className="py-2.5 px-3 min-w-[150px]">Mevcut Aşama / Konu</th>
                                        <th className="py-2.5 px-3 text-center w-20">Başarı</th>
                                        <th className="py-2.5 px-3 text-center w-20">D / T</th>
                                        <th className="py-2.5 px-3 min-w-[260px]">Evde Tekrar Edilmesi Gereken Harfler (Büyük)</th>
                                        <th className="py-2.5 px-3 text-center w-14">Fiş</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredList.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                                                Arama kriterlerine uygun öğrenci bulunamadı.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredList.map((item, idx) => (
                                            <tr
                                                key={item.student.uid}
                                                className={cn(
                                                    "transition-colors",
                                                    ambianceTheme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50"
                                                )}
                                            >
                                                <td className="py-3 px-3 text-center font-bold opacity-60">{idx + 1}</td>
                                                <td className="py-3 px-3 text-center font-mono font-bold">{item.studentNumber}</td>
                                                <td className="py-3 px-3 font-black text-slate-100">
                                                    <span className={ambianceTheme === 'dark' ? "text-white" : "text-slate-900"}>
                                                        {item.studentName}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.isQuran ? (
                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                                                            30 Adım (Tam)
                                                        </Badge>
                                                    ) : item.completedStages.length > 0 ? (
                                                        <span className="text-[11px] font-bold text-emerald-400">
                                                            {item.completedStages.length} Adım Geçti
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-500 italic">1. Adımda</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-semibold">
                                                    <span className={item.isQuran ? "text-emerald-400 font-bold" : "text-slate-300"}>
                                                        {item.stageTitle}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <Badge className={cn(
                                                        "font-mono font-black text-[10px]",
                                                        item.isQuran
                                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                                            : item.score >= 70
                                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                            : item.score >= 50
                                                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                                            : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                                    )}>
                                                        {item.isQuran ? "Kur'an" : `%${item.score}`}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono text-[11px] opacity-80">
                                                    {item.correctCount}✓ / {item.wrongCount}✗
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.repeatLetters.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.repeatLetters.map((r, rIdx) => (
                                                                <span
                                                                    key={rIdx}
                                                                    className={cn(
                                                                        "px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5",
                                                                        r.status === '-'
                                                                            ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                                                                            : "bg-amber-950/40 border-amber-500/40 text-amber-300"
                                                                    )}
                                                                >
                                                                    {r.arabic && <span className="font-serif font-black text-xl leading-none">{r.arabic}</span>}
                                                                    <span>{r.name}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : item.evaluatedCount > 0 ? (
                                                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Hata Yok
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-500 italic">
                                                            Test edilmedi
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {onOpenStudentShare && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => onOpenStudentShare(item.student, item.stageId)}
                                                            className="h-7 w-7 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 cursor-pointer"
                                                            title={`${item.studentName} için WhatsApp Raporunu Aç`}
                                                        >
                                                            <Share2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* SEKME 3: WHATSAPP TOPLU SINIF BÜLTENİ */}
                    {activeTab === 'whatsapp' && (
                        <div className="flex-1 overflow-y-auto space-y-3">
                            <div className={cn(
                                "p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs",
                                ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-50 border-emerald-200"
                            )}>
                                <span className="font-bold flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-emerald-500" />
                                    Bu metni sınıf veli grubuna veya zümre öğretmenlerine doğrudan gönderebilirsiniz.
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopyWhatsApp}
                                        className="h-8 rounded-xl font-bold text-xs cursor-pointer"
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                        <span>{isCopied ? 'Kopyalandı' : 'Metni Kopyala'}</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleOpenWhatsApp}
                                        className="h-8 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                    >
                                        <Send className="w-3.5 h-3.5 mr-1 fill-white" />
                                        <span>WhatsApp&apos;ta Aç</span>
                                    </Button>
                                </div>
                            </div>

                            <div className={cn(
                                "p-4 sm:p-5 rounded-2xl border shadow-inner font-mono text-xs leading-relaxed whitespace-pre-wrap select-all max-h-[460px] overflow-y-auto",
                                ambianceTheme === 'dark'
                                    ? "bg-slate-900/90 border-emerald-500/30 text-emerald-100"
                                    : "bg-emerald-50/50 border-emerald-200 text-slate-900"
                            )}>
                                {whatsappClassMessage}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. ALT ÇUBUK */}
                <div className={cn(
                    "p-3.5 sm:p-4 border-t flex items-center justify-between gap-2.5 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className={cn(
                            "rounded-xl font-bold text-xs cursor-pointer",
                            ambianceTheme === 'dark' ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        Kapat
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleDownloadCSV}
                            className={cn(
                                "rounded-xl font-bold text-xs border cursor-pointer",
                                ambianceTheme === 'dark' ? "bg-white/6 border-white/15 text-slate-200 hover:bg-white/12" : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                            )}
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                            <span>Excel (CSV) İndir</span>
                        </Button>

                        <Button
                            onClick={handlePrintClassTable}
                            className="rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>A4 Raporu Yazdır / PDF</span>
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
