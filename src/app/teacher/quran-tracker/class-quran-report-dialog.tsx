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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
    Download,
    Share2,
    FileText,
    Users,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Search,
    ArrowUpDown,
    Send,
    Copy,
    Check,
    BookOpen,
    Sparkles,
    Filter,
    Calendar,
    Loader2
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

    // Sekmeler: 'table' (Resmi Çizelge) | 'whatsapp' (Toplu WhatsApp Özeti) | 'cards' (Toplu Öğrenci Fişleri)
    const [activeTab, setActiveTab] = useState<'table' | 'whatsapp' | 'cards'>('table');

    // Filtreleme & Arama
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [levelFilter, setLevelFilter] = useState<'all' | 'quran' | 'elifba' | 'needs_practice'>('all');
    const [sortBy, setSortBy] = useState<'number' | 'name' | 'stage' | 'score'>('number');

    // WhatsApp mesajı kopyalama durumu
    const [isCopied, setIsCopied] = useState<boolean>(false);
    // Görsel indirme
    const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

    // Her öğrenci için detaylı aşama ve hata özetini hesapla
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

            // Tekrar edilmesi gereken harfler listesi
            const repeatLetters: Array<{ name: string; arabic?: string; status: '-' | 'o' }> = [];
            for (let i = 1; i <= totalItems; i++) {
                const st = itemStatuses[i];
                if (st === '-' || st === 'o') {
                    const meta = getStageItemMeta(stageObj.id, i);
                    repeatLetters.push({
                        name: meta?.name || `#${i}`,
                        arabic: meta?.arabic,
                        status: st
                    });
                }
            }

            // Durum etiketi
            let statusText = 'Başlamadı';
            if (isQuran) {
                statusText = `Kur'an (Sayfa ${cuzPage || 1})`;
            } else if (stageData?.status === 'completed' || score >= 70) {
                statusText = 'Aşamayı Geçti';
            } else if (evaluatedCount > 0) {
                statusText = 'Çalışıyor';
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
        lines.push(`📋 *ÖĞRENCİ BAZLI DURUM VE TEKRAR LİSTESİ:*`);

        studentReportList.forEach((item, idx) => {
            const noStr = item.student.studentNumber ? `(No: ${item.student.studentNumber})` : '';
            lines.push(`\n${idx + 1}. *${item.studentName}* ${noStr}`);

            if (item.isQuran) {
                lines.push(`   📖 *Seviye:* Kur'an-ı Kerim Okuyor (${item.cuzPage || 1}. Sayfa)`);
            } else {
                lines.push(`   📍 *Aşama:* ${item.shortTitle} (Puan: %${item.score})`);
                if (item.repeatLetters.length > 0) {
                    const mistakesFormatted = item.repeatLetters.map(r => r.arabic ? `${r.arabic} (${r.name})` : r.name).join(', ');
                    lines.push(`   ⚠️ *Evde Tekrar Edilecekler:* ${mistakesFormatted}`);
                } else if (item.evaluatedCount > 0 && item.wrongCount === 0) {
                    lines.push(`   ✅ *Tebrikler:* Bu aşamayı eksiksiz tamamladı.`);
                }
            }
        });

        lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`💡 *Öğretmen Tavsiyesi:*`);
        lines.push(`Öğrencilerimizin evde takıldıkları harfleri ve harekeleri düzenli sesli tekrar etmeleri tavsiye edilir. Destek olan tüm velilerimize teşekkür ederiz.`);
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
            // UTF-8 BOM ekle (Excel'de Türkçe harflerin düzgün görünmesi için)
            const BOM = "\uFEFF";
            const headers = [
                "Sıra",
                "Okul No",
                "Öğrenci Adı Soyadı",
                "Sınıf",
                "Şube",
                "Mevcut Seviye / Aşama",
                "Cüz / Kur'an Sayfası",
                "Başarı Puanı (%)",
                "Doğru Sayısı",
                "Yardım Sayısı",
                "Tekrar (Hata) Sayısı",
                "Evde Tekrar Edilecek Harfler",
                "Genel Durum"
            ];

            const rows = studentReportList.map((item, idx) => {
                const mistakeLetters = item.repeatLetters.map(r => r.arabic ? `${r.name} (${r.arabic})` : r.name).join(' - ');
                return [
                    idx + 1,
                    `"${item.studentNumber}"`,
                    `"${item.studentName}"`,
                    `"${className}"`,
                    `"${branch}"`,
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

    // A4 Formatında Resmi Çizelgeyi Yazdır / PDF İndir
    const handlePrintClassTable = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
        const classTitle = `${className} Sınıfı ${branch && branch !== 'all' ? `(${branch})` : ''}`;

        const rowsHtml = studentReportList.map((item, idx) => {
            const mistakesStr = item.repeatLetters.length > 0
                ? item.repeatLetters.map(r => `<span style="display:inline-block; margin:1px 2px; padding:1px 4px; background:#fee2e2; color:#991b1b; border-radius:4px; font-weight:bold; font-size:11px;">${r.arabic ? `<b>${r.arabic}</b> ` : ''}${r.name}</span>`).join('')
                : item.evaluatedCount > 0
                ? `<span style="color:#15803d; font-weight:bold; font-size:11px;">✓ Tamamlandı</span>`
                : `<span style="color:#94a3b8; font-size:11px;">-</span>`;

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                    <td style="padding: 6px 8px; text-align: center; font-weight: bold; width: 35px;">${idx + 1}</td>
                    <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-weight: bold; width: 60px;">${item.studentNumber}</td>
                    <td style="padding: 6px 8px; font-weight: bold; width: 180px;">${item.studentName}</td>
                    <td style="padding: 6px 8px; font-weight: 600; width: 170px;">${item.stageTitle}</td>
                    <td style="padding: 6px 8px; text-align: center; font-weight: bold; width: 55px; color: ${item.score >= 70 ? '#15803d' : item.score >= 50 ? '#b45309' : '#b91c1c'};">
                        ${item.isQuran ? '✓ Kur\'an' : `%${item.score}`}
                    </td>
                    <td style="padding: 6px 8px; text-align: center; font-size: 11px; width: 90px;">
                        ${item.correctCount} D / ${item.wrongCount} T
                    </td>
                    <td style="padding: 6px 8px;">${mistakesStr}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="utf-8" />
                <title>${classTitle} - Kur'an &amp; Elifba Toplu Takip Çizelgesi</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                    body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #0f172a;
                        background: #ffffff;
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                    }
                    th {
                        background-color: #f1f5f9;
                        color: #334155;
                        font-weight: 800;
                        padding: 8px 6px;
                        border-top: 1px solid #cbd5e1;
                        border-bottom: 2px solid #94a3b8;
                        text-align: left;
                    }
                    .header-box {
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 10px;
                        margin-bottom: 12px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .stats-box {
                        display: flex;
                        gap: 15px;
                        margin-bottom: 12px;
                        padding: 8px 12px;
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .footer-box {
                        margin-top: 25px;
                        display: flex;
                        justify-content: space-between;
                        padding: 0 40px;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <div style="font-size: 11px; font-weight: bold; color: #475569; letter-spacing: 1px;">T.C. MİLLÎ EĞİTİM BAKANLIĞI / DİN DERSİ ATÖLYESİ</div>
                        <h1 style="margin: 3px 0 0 0; font-size: 18px; font-weight: 900; color: #0f172a;">${classTitle} KUR'AN-I KERİM &amp; ELİFBA TOPLU TAKİP VE DEĞERLENDİRME ÇİZELGESİ</h1>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: #64748b;">
                        <div><strong>Tarih:</strong> ${dateStr}</div>
                        <div><strong>Sistem:</strong> Diyanet 30 Adım &amp; Kur'an Takip</div>
                    </div>
                </div>

                <div class="stats-box">
                    <span>Toplam Öğrenci: <b>${summaryStats.total}</b></span>
                    <span>•</span>
                    <span style="color: #15803d;">Kur'an'a Geçen: <b>${summaryStats.quranCount} (%${summaryStats.quranPercent})</b></span>
                    <span>•</span>
                    <span style="color: #0369a1;">Elifba'da Olan: <b>${summaryStats.elifbaCount}</b></span>
                    <span>•</span>
                    <span style="color: #b45309;">Sınıf Başarı Ortalaması: <b>%${summaryStats.avgScore}</b></span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 35px;">#</th>
                            <th style="text-align: center; width: 60px;">No</th>
                            <th style="width: 180px;">Öğrenci Adı Soyadı</th>
                            <th style="width: 170px;">Mevcut Aşama / Konu</th>
                            <th style="text-align: center; width: 55px;">Başarı</th>
                            <th style="text-align: center; width: 90px;">D / T</th>
                            <th>Evde Tekrar Edilmesi Gereken Harfler (Yanlışlar)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="footer-box">
                    <div style="text-align: center;">
                        <div>Ders Öğretmeni</div>
                        <div style="margin-top: 35px; font-weight: bold;">İmza / Kaşe</div>
                    </div>
                    <div style="text-align: center;">
                        <div>Okul Müdürü</div>
                        <div style="margin-top: 35px; font-weight: bold;">İmza / Mühür</div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
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
                "max-w-5xl max-h-[94vh] overflow-hidden flex flex-col p-0 rounded-3xl border shadow-2xl",
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
                                Tüm sınıfın seviyeleri, doğruları, yanlışları ve evde tekrar edilmesi gereken harfler listesi
                            </p>
                        </div>
                    </div>

                    {/* Hızlı Eylemler (Excel, Yazdır, WhatsApp) */}
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
                            title="A4 Yatay Çizelge Olarak Yazdır / PDF İndir"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Yazdır / PDF</span>
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
                        {/* Sekmeler */}
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
                            <TabsList className={cn(
                                "grid grid-cols-2 p-1 rounded-2xl border w-full sm:w-80",
                                ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                            )}>
                                <TabsTrigger value="table" className="rounded-xl font-bold text-xs py-1.5">
                                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Sınıf Çizelgesi
                                </TabsTrigger>
                                <TabsTrigger value="whatsapp" className="rounded-xl font-bold text-xs py-1.5">
                                    <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> WhatsApp Sınıf Özeti
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Filtre ve Arama */}
                        {activeTab === 'table' && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
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

                    {/* SEKME 1: RESMİ SINIF ÇİZELGESİ TABLOSU */}
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
                                        <th className="py-2.5 px-3 min-w-[160px]">Öğrenci Adı Soyadı</th>
                                        <th className="py-2.5 px-3 min-w-[160px]">Mevcut Aşama / Konu</th>
                                        <th className="py-2.5 px-3 text-center w-24">Başarı Skoru</th>
                                        <th className="py-2.5 px-3 text-center w-24">Özet (D/T)</th>
                                        <th className="py-2.5 px-3 min-w-[240px]">Evde Tekrar Edilmesi Gereken Harfler (Yanlışlar)</th>
                                        <th className="py-2.5 px-3 text-center w-20">Eylem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredList.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
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
                                                <td className="py-2.5 px-3 text-center font-bold opacity-60">{idx + 1}</td>
                                                <td className="py-2.5 px-3 text-center font-mono font-bold">{item.studentNumber}</td>
                                                <td className="py-2.5 px-3 font-black text-slate-100">
                                                    <span className={ambianceTheme === 'dark' ? "text-white" : "text-slate-900"}>
                                                        {item.studentName}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold">
                                                    <span className={item.isQuran ? "text-emerald-400 font-bold" : "text-slate-300"}>
                                                        {item.stageTitle}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
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
                                                        {item.isQuran ? 'Kur\'an' : `%${item.score}`}
                                                    </Badge>
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-mono text-[11px] opacity-80">
                                                    {item.correctCount}✓ / {item.wrongCount}✗
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {item.repeatLetters.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.repeatLetters.map((r, rIdx) => (
                                                                <span
                                                                    key={rIdx}
                                                                    className={cn(
                                                                        "px-1.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1",
                                                                        r.status === '-'
                                                                            ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                                                                            : "bg-amber-950/40 border-amber-500/40 text-amber-300"
                                                                    )}
                                                                >
                                                                    {r.arabic && <span className="font-serif font-black">{r.arabic}</span>}
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
                                                <td className="py-2.5 px-3 text-center">
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

                    {/* SEKME 2: WHATSAPP TOPLU SINIF BÜLTENİ */}
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
                            <span>A4 Çizelgeyi Yazdır / PDF</span>
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
