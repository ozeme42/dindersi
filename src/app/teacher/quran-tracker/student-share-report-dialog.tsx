'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Share2,
    Send,
    Printer,
    Download,
    Copy,
    Check,
    BookOpen,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Phone,
    MessageSquare,
    Calendar,
    User,
    FileText,
    ExternalLink,
    Eye,
    RefreshCw,
    Award,
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
    CUZ1_LETTER_META,
    ElifbaStage
} from '@/lib/elifba-curriculum';
import type { QuranStudentProgress } from './actions';

interface StudentShareReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: UserProfile | null;
    initialStageId?: string;
    classId: string;
    className: string;
    branch: string;
    progress?: QuranStudentProgress;
    customStatuses?: Record<number, '+' | 'o' | '-'>;
    ambianceTheme?: 'dark' | 'light';
}

export function StudentShareReportDialog({
    isOpen,
    onClose,
    student,
    initialStageId = 'cuz1',
    classId,
    className,
    branch,
    progress,
    customStatuses,
    ambianceTheme = 'dark'
}: StudentShareReportDialogProps) {
    const { toast } = useToast();
    const reportCardRef = useRef<HTMLDivElement | null>(null);

    // Seçili aşama
    const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId);
    // WhatsApp için telefon numarası (opsiyonel)
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    // Özel öğretmen notu
    const [teacherNote, setTeacherNote] = useState<string>('');
    // Kopyalama animasyonu
    const [isCopied, setIsCopied] = useState<boolean>(false);
    // Görsel indirme yükleniyor mu
    const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
    // Aktif sekme: 'preview' (Görsel Kart) | 'whatsapp' (Mesaj Metni)
    const [activeTab, setActiveTab] = useState<'preview' | 'whatsapp'>('preview');

    // Dialog açıldığında ilk ayarlar
    useEffect(() => {
        if (!isOpen) return;
        const resolved = initialStageId ? mapLegacyStageIdToDiyanet(initialStageId) : 'cuz1';
        setSelectedStageId(resolved);
        setIsCopied(false);
        // Varsayılan öğretmen tavsiyesi
        if (!teacherNote) {
            setTeacherNote('Günde en az 10-15 dakika sesli tekrar yapılması gelişim için çok faydalı olacaktır. Gayretinden dolayı tebrik eder, başarılar dilerim.');
        }
    }, [isOpen, initialStageId]);

    // Seçili aşama nesnesi
    const currentStage = useMemo(() => {
        return DIYANET_ELIFBA_STAGES.find(s => s.id === selectedStageId) || DIYANET_ELIFBA_STAGES[0];
    }, [selectedStageId]);

    // Aşama durumları (Harf bazlı doğru/yanlış/yardım kayıtları)
    const activeStatuses = useMemo<Record<number, '+' | 'o' | '-'>>(() => {
        // Eğer dışarıdan customStatuses verilmişse (ör. açık rapordan çağrıldıysa) onu kullan
        if (customStatuses && Object.keys(customStatuses).length > 0) {
            return customStatuses;
        }

        const stages = progress?.stages || {};
        let saved = stages[selectedStageId]?.itemStatuses;

        if (!saved) {
            for (const [legacyId, mappedId] of Object.entries(LEGACY_STAGE_ALIASES)) {
                if (mappedId === selectedStageId && stages[legacyId]?.itemStatuses) {
                    saved = stages[legacyId].itemStatuses;
                    break;
                }
            }
        }

        if (saved && typeof saved === 'object') {
            const parsed: Record<number, '+' | 'o' | '-'> = {};
            for (const [key, val] of Object.entries(saved)) {
                const num = Number(key);
                if (!isNaN(num) && (val === '+' || val === 'o' || val === '-')) {
                    parsed[num] = val;
                }
            }
            return parsed;
        }

        return {};
    }, [customStatuses, progress, selectedStageId]);

    // İstatistikler
    const stats = useMemo(() => {
        const total = currentStage.itemCount;
        const correct = Object.values(activeStatuses).filter(s => s === '+').length;
        const help = Object.values(activeStatuses).filter(s => s === 'o').length;
        const wrong = Object.values(activeStatuses).filter(s => s === '-').length;
        const evaluated = Object.keys(activeStatuses).length;
        const score = total > 0 ? Math.round(((correct + help * 0.5) / total) * 100) : 0;
        return { total, correct, help, wrong, evaluated, score };
    }, [activeStatuses, currentStage.itemCount]);

    // Ayrıştırılmış harfler / ögeler
    const { wrongItems, helpItems, correctItems } = useMemo(() => {
        const wrongList: Array<{ index: number; name: string; arabic?: string; desc?: string }> = [];
        const helpList: Array<{ index: number; name: string; arabic?: string; desc?: string }> = [];
        const correctList: Array<{ index: number; name: string; arabic?: string }> = [];

        for (let i = 1; i <= currentStage.itemCount; i++) {
            const st = activeStatuses[i];
            const meta = getStageItemMeta(currentStage.id, i);
            if (st === '-') {
                wrongList.push({
                    index: i,
                    name: meta?.name || `#${i}`,
                    arabic: meta?.arabic,
                    desc: meta?.desc
                });
            } else if (st === 'o') {
                helpList.push({
                    index: i,
                    name: meta?.name || `#${i}`,
                    arabic: meta?.arabic,
                    desc: meta?.desc
                });
            } else if (st === '+') {
                correctList.push({
                    index: i,
                    name: meta?.name || `#${i}`,
                    arabic: meta?.arabic
                });
            }
        }

        return { wrongItems: wrongList, helpItems: helpList, correctItems: correctList };
    }, [activeStatuses, currentStage]);

    // Öğrencinin Cüz / Kur'an Sayfası bilgisi
    const cuzPage = progress?.cuzPage;
    const isQuranMode = Boolean(cuzPage && cuzPage > 0 && selectedStageId === 'cuz');

    // WhatsApp Mesaj Metni Oluşturucu
    const whatsappMessage = useMemo(() => {
        if (!student) return '';

        const lines: string[] = [];
        const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const studentName = student.displayName || 'Öğrenci';
        const classInfo = `${className}${branch && branch !== 'all' ? `/${branch}` : ''}`;
        const noInfo = student.studentNumber ? ` (No: ${student.studentNumber})` : '';

        lines.push(`📖 *DİN DERSİ ATÖLYESİ - KUR'AN & ELİFBA TAKİP RAPORU*`);
        lines.push(`📅 *Tarih:* ${dateStr}`);
        lines.push(`👤 *Öğrenci:* ${studentName}${noInfo}`);
        lines.push(`🏫 *Sınıf / Şube:* ${classInfo}`);

        if (isQuranMode && cuzPage) {
            lines.push(`📍 *Konu:* Kur'an-ı Kerim Tilavet Takibi`);
            lines.push(`📄 *Mevcut Sayfa:* ${cuzPage}. Sayfa`);
        } else {
            lines.push(`📍 *Aşama:* ${currentStage.title}`);
            lines.push(`📊 *Başarı Durumu:* %${stats.score}`);
            lines.push(`📈 *Özet:* ${stats.correct} Doğru ✅ | ${stats.help} Yardımla ⚠️ | ${stats.wrong} Tekrar ❌`);
        }

        // 1. Yanlışlar ve Tekrar Edilmesi Gereken Harfler (Öncelikli Vurgu)
        if (wrongItems.length > 0 || helpItems.length > 0) {
            lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
            lines.push(`⚠️ *EVDE TEKRAR ÇALIŞILMASI GEREKENLER:*`);
            lines.push(`_Aşağıdaki harflerin/kelimelerin evde sesli tekrar edilmesi önemle rica olunur:_`);

            if (wrongItems.length > 0) {
                lines.push(`\n❌ *Tekrar Edilecek Harfler (Yanlışlar):*`);
                wrongItems.forEach(item => {
                    const arabicStr = item.arabic ? ` [ ${item.arabic} ]` : '';
                    const descStr = item.desc ? ` - ${item.desc}` : '';
                    lines.push(`• *${item.name}*${arabicStr}${descStr}`);
                });
            }

            if (helpItems.length > 0) {
                lines.push(`\n⚠️ *Yardımla Okunanlar (Pekiştirilmeli):*`);
                helpItems.forEach(item => {
                    const arabicStr = item.arabic ? ` [ ${item.arabic} ]` : '';
                    const descStr = item.desc ? ` - ${item.desc}` : '';
                    lines.push(`• *${item.name}*${arabicStr}${descStr}`);
                });
            }
        } else if (stats.correct > 0 && stats.wrong === 0 && stats.help === 0) {
            lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
            lines.push(`🎉 *TEBRİKLER!*`);
            lines.push(`Öğrencimiz bu aşamadaki tüm harfleri/örnekleri eksiksiz ve hatasız okumuştur. Maşallah! 👏`);
        } else if (stats.evaluated === 0) {
            lines.push(`\nℹ️ *Bilgi:* Bu aşama için henüz değerlendirme yapılmamıştır.`);
        }

        // 2. Başarıyla Okunan Harfler
        if (correctItems.length > 0) {
            lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
            lines.push(`✅ *Başarıyla Okunan Harfler / Doğrular (${correctItems.length} Adet):*`);
            const itemsFormatted = correctItems.map(c => c.arabic ? `${c.name} (${c.arabic})` : c.name).join(', ');
            lines.push(itemsFormatted);
        }

        // 3. Öğretmen Tavsiyesi ve Notu
        if (teacherNote.trim()) {
            lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
            lines.push(`💡 *Öğretmen Tavsiyesi & Notu:*`);
            lines.push(teacherNote.trim());
        }

        lines.push(`\n━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`✨ *Din Dersi Atölyesi ile Kur'an Öğreniyorum* ✨`);

        return lines.join('\n');
    }, [student, className, branch, isQuranMode, cuzPage, currentStage, stats, wrongItems, helpItems, correctItems, teacherNote]);

    // Panoya Kopyalama
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(whatsappMessage);
            setIsCopied(true);
            toast({
                title: "Kopyalandı! 📋",
                description: "WhatsApp mesaj metni panoya kopyalandı. İstediğiniz yere yapıştırabilirsiniz."
            });
            setTimeout(() => setIsCopied(false), 2500);
        } catch (err) {
            toast({
                title: "Kopyalama Başarısız",
                description: "Lütfen mesaj kutusundan metni manuel kopyalayın.",
                variant: "destructive"
            });
        }
    };

    // WhatsApp'ta Aç
    const handleOpenWhatsApp = () => {
        const encoded = encodeURIComponent(whatsappMessage);
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        let url = '';
        if (cleanPhone) {
            url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
        } else {
            url = `https://api.whatsapp.com/send?text=${encoded}`;
        }
        window.open(url, '_blank');
    };

    // Görsel Olarak İndir (PNG)
    const handleDownloadImage = async () => {
        if (!reportCardRef.current || !student) return;
        setIsExportingImage(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(reportCardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const safeName = (student.displayName || 'Ogrenci').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_-]/g, '_');
            link.download = `Kuran_Takip_${safeName}_${currentStage.shortTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            link.href = imgData;
            link.click();
            toast({
                title: "Görsel İndirildi! 🖼️",
                description: "Öğrenci gelişim kartı PNG formatında cihazınıza kaydedildi."
            });
        } catch (err: any) {
            console.error("Image export error:", err);
            toast({
                title: "Görsel Oluşturulamadı",
                description: "Lütfen Yazdır / PDF İndir seçeneğini kullanın.",
                variant: "destructive"
            });
        } finally {
            setIsExportingImage(false);
        }
    };

    // Yazdır / PDF Olarak Kaydet
    const handlePrint = () => {
        if (!reportCardRef.current || !student) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        const cardHtml = reportCardRef.current.innerHTML;
        const studentTitle = student.displayName || 'Öğrenci';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="utf-8" />
                <title>Kur'an &amp; Elifba Gelişim Raporu - ${studentTitle}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #0f172a;
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .arabic-text {
                        font-family: 'Traditional Arabic', 'Scheherazade New', 'Amiri', serif;
                    }
                </style>
            </head>
            <body class="bg-white p-2">
                ${cardHtml}
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

    // Hızlı Tavsiye Şablonları
    const handleSelectTemplate = (template: string) => {
        setTeacherNote(template);
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn(
                "max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-0 rounded-3xl border shadow-2xl",
                ambianceTheme === 'dark'
                    ? "bg-slate-950 border-white/15 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
            )}>
                {/* 1. MODAL BAŞLIĞI */}
                <div className={cn(
                    "p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-emerald-50/60 border-slate-200"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-green-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-900/40 shrink-0">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg sm:text-xl font-black tracking-tight">{student.displayName}</h2>
                                {student.studentNumber && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                        No: {student.studentNumber}
                                    </Badge>
                                )}
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                    {className} {branch !== 'all' ? `(${branch})` : ''}
                                </Badge>
                            </div>
                            <p className={cn("text-xs mt-0.5", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                WhatsApp Paylaşım &amp; Detaylı Hata-Çalışma Raporu
                            </p>
                        </div>
                    </div>

                    {/* Aşama Seçici */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold shrink-0 opacity-70">Aşama:</span>
                        <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                            <SelectTrigger className={cn(
                                "h-9 w-52 sm:w-60 text-xs font-black rounded-xl border",
                                ambianceTheme === 'dark'
                                    ? "bg-white/10 border-white/15 text-white"
                                    : "bg-white border-slate-300 text-slate-900 shadow-sm"
                            )}>
                                <SelectValue placeholder="Aşama Seçin" />
                            </SelectTrigger>
                            <SelectContent className={cn(
                                "max-h-72 rounded-xl",
                                ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200"
                            )}>
                                {DIYANET_ELIFBA_STAGES.map(s => {
                                    const stData = progress?.stages?.[s.id];
                                    const evalCount = stData?.itemStatuses ? Object.keys(stData.itemStatuses).length : 0;
                                    return (
                                        <SelectItem key={s.id} value={s.id} className="text-xs cursor-pointer">
                                            <div className="flex items-center justify-between w-full gap-2">
                                                <span className="truncate">{s.title}</span>
                                                {evalCount > 0 && (
                                                    <span className="text-[10px] opacity-60 font-mono shrink-0">
                                                        ({evalCount}/{s.itemCount})
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 2. ORTA İÇERİK - SEKME YAPISI */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

                    {/* İstatistik Özet Kartları */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className={cn(
                            "p-3 rounded-2xl border text-center transition-all",
                            ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                        )}>
                            <span className="text-[11px] block font-bold text-slate-400">Başarı Puanı</span>
                            <span className={cn(
                                "text-2xl font-black block mt-0.5",
                                stats.score >= 70 ? "text-emerald-500" : stats.score >= 50 ? "text-amber-500" : "text-rose-500"
                            )}>
                                %{stats.score}
                            </span>
                        </div>

                        <div className={cn(
                            "p-3 rounded-2xl border text-center",
                            ambianceTheme === 'dark' ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                        )}>
                            <span className="text-[11px] block font-bold">✓ Doğrular</span>
                            <span className="text-2xl font-black block mt-0.5 text-emerald-500">{stats.correct}</span>
                        </div>

                        <div className={cn(
                            "p-3 rounded-2xl border text-center",
                            ambianceTheme === 'dark' ? "bg-amber-950/30 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                        )}>
                            <span className="text-[11px] block font-bold">◎ Yardımla</span>
                            <span className="text-2xl font-black block mt-0.5 text-amber-500">{stats.help}</span>
                        </div>

                        <div className={cn(
                            "p-3 rounded-2xl border text-center",
                            ambianceTheme === 'dark' ? "bg-rose-950/30 border-rose-500/20 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
                        )}>
                            <span className="text-[11px] block font-bold">✗ Tekrar (Yanlış)</span>
                            <span className="text-2xl font-black block mt-0.5 text-rose-500">{stats.wrong}</span>
                        </div>
                    </div>

                    {/* Sekme Seçici: Önizleme Kartı & WhatsApp Metni */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                        <TabsList className={cn(
                            "w-full grid grid-cols-2 p-1 rounded-2xl border",
                            ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                        )}>
                            <TabsTrigger value="preview" className="rounded-xl font-bold text-xs py-2">
                                <FileText className="w-3.5 h-3.5 mr-1.5" /> Görsel Rapor Kartı
                            </TabsTrigger>
                            <TabsTrigger value="whatsapp" className="rounded-xl font-bold text-xs py-2">
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> WhatsApp Mesaj Metni
                            </TabsTrigger>
                        </TabsList>

                        {/* SEKME 1: GÖRSEL RAPOR KARTI (Yazdırılabilir / İndirilebilir A4 Tasarımı) */}
                        <TabsContent value="preview" className="mt-3">
                            <div className="space-y-3">
                                {/* Kartın Kendisi (Yazdırma & PNG Export Hedefi) */}
                                <div
                                    ref={reportCardRef}
                                    className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6"
                                    style={{ minHeight: '400px' }}
                                >
                                    {/* 1. Antet & Kurum Başlığı */}
                                    <div className="flex items-center justify-between border-b pb-4 border-slate-200 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-2xl shadow-md">
                                                📖
                                            </div>
                                            <div>
                                                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                                    DİN DERSİ ATÖLYESİ
                                                </h1>
                                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                                    Kur&apos;an-ı Kerim &amp; Elifba Bireysel Gelişim Karnesi
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-slate-500 space-y-0.5">
                                            <p className="font-bold text-slate-800">
                                                {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p>Rapor No: #{student.studentNumber || '01'}</p>
                                        </div>
                                    </div>

                                    {/* 2. Öğrenci Bilgileri & Başarı Skoru */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                        <div className="space-y-1">
                                            <span className="text-[11px] font-bold text-slate-500 block">Öğrenci Adı Soyadı</span>
                                            <p className="text-base font-black text-slate-900">{student.displayName}</p>
                                            <p className="text-xs text-slate-600 font-medium">
                                                {className} {branch !== 'all' ? `(${branch})` : ''} {student.studentNumber ? `• No: ${student.studentNumber}` : ''}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[11px] font-bold text-slate-500 block">Değerlendirilen Aşama</span>
                                            <p className="text-sm font-black text-emerald-800">{currentStage.title}</p>
                                            <p className="text-xs text-slate-500">{currentStage.sectionTitle}</p>
                                        </div>

                                        <div className="sm:text-right space-y-1">
                                            <span className="text-[11px] font-bold text-slate-500 block">Başarı Durumu</span>
                                            <div className="flex items-center sm:justify-end gap-2">
                                                <span className={cn(
                                                    "text-2xl font-black",
                                                    stats.score >= 70 ? "text-emerald-700" : stats.score >= 50 ? "text-amber-700" : "text-rose-700"
                                                )}>
                                                    %{stats.score}
                                                </span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black",
                                                    stats.score >= 70 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                )}>
                                                    {stats.score >= 70 ? "BAŞARILI" : "PEKİŞTİRİLMELİ"}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600">
                                                {stats.correct} Doğru • {stats.help} Yardım • {stats.wrong} Tekrar
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. EVDE ÇALIŞILMASI GEREKEN HARFLER & YANLIŞLAR (EN KRİTİK ALAN) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                                                    !
                                                </div>
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                                    Evde Tekrar Edilmesi Gereken Harfler &amp; Kelimeler
                                                </h3>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">
                                                Toplam {(wrongItems.length + helpItems.length)} Harf / Kelime
                                            </span>
                                        </div>

                                        {wrongItems.length === 0 && helpItems.length === 0 ? (
                                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black">Mükemmel! Tekrar Edilecek Hata Bulunmuyor 🎉</p>
                                                    <p className="text-xs text-emerald-700 mt-0.5">
                                                        Öğrencimiz bu aşamadaki tüm örnekleri başarıyla tamamladı. Bir sonraki aşamaya geçmeye hazır!
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                {/* Tekrar Edilecekler */}
                                                {wrongItems.map(item => (
                                                    <div
                                                        key={`wrong-${item.index}`}
                                                        className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-center gap-3 shadow-sm"
                                                    >
                                                        {item.arabic ? (
                                                            <div className="w-12 h-12 rounded-xl bg-white border border-rose-200 text-rose-700 flex items-center justify-center text-3xl font-serif font-bold shrink-0 shadow-inner">
                                                                {item.arabic}
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-rose-700 flex items-center justify-center text-xs font-black shrink-0 font-mono shadow-inner">
                                                                #{item.index}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-xs font-black text-slate-900 truncate">
                                                                    {item.name}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white shrink-0">
                                                                    Tekrar
                                                                </span>
                                                            </div>
                                                            {item.desc && (
                                                                <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">
                                                                    {item.desc}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Yardımla Okunanlar */}
                                                {helpItems.map(item => (
                                                    <div
                                                        key={`help-${item.index}`}
                                                        className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-center gap-3 shadow-sm"
                                                    >
                                                        {item.arabic ? (
                                                            <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center text-3xl font-serif font-bold shrink-0 shadow-inner">
                                                                {item.arabic}
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-white border border-amber-200 text-amber-700 flex items-center justify-center text-xs font-black shrink-0 font-mono shadow-inner">
                                                                #{item.index}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-xs font-black text-slate-900 truncate">
                                                                    {item.name}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-600 text-white shrink-0">
                                                                    Yardımla
                                                                </span>
                                                            </div>
                                                            {item.desc && (
                                                                <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">
                                                                    {item.desc}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Başarıyla Okunan Harfler (Doğrular) */}
                                    {correctItems.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-slate-200">
                                            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                Başarıyla Okunan Harfler ({correctItems.length} Doğru)
                                            </h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {correctItems.map(item => (
                                                    <span
                                                        key={`correct-${item.index}`}
                                                        className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1"
                                                    >
                                                        {item.arabic && <span className="font-serif font-bold text-emerald-700 text-sm">{item.arabic}</span>}
                                                        <span>{item.name}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 5. Öğretmen Notu & İmzası */}
                                    <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                        <div className="sm:col-span-2 space-y-1">
                                            <span className="text-[11px] font-black text-slate-700 block uppercase">
                                                Öğretmen Değerlendirmesi &amp; Çalışma Tavsiyesi
                                            </span>
                                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                                                {teacherNote || 'Evde günlük sesli tekrar yapılması tavsiye edilir.'}
                                            </div>
                                        </div>

                                        <div className="text-right space-y-4">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-400 block">Ders Öğretmeni</span>
                                                <p className="text-xs font-black text-slate-800 mt-1">İmza / Kaşe</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* SEKME 2: WHATSAPP MESAJ METNİ */}
                        <TabsContent value="whatsapp" className="mt-3">
                            <div className="space-y-3">
                                {/* Telefon Numarası Girişi (Opsiyonel) */}
                                <div className={cn(
                                    "p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3",
                                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                                )}>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-xs font-bold">Veli / Öğrenci Telefonu (Opsiyonel):</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Input
                                            type="tel"
                                            placeholder="05XX XXX XX XX (Boş bırakabilirsiniz)"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className={cn(
                                                "h-8 text-xs font-mono rounded-xl border w-full sm:w-64",
                                                ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Canlı Mesaj Önizleme Kutusu (WhatsApp Görünümü) */}
                                <div className={cn(
                                    "p-4 sm:p-5 rounded-2xl border shadow-inner font-mono text-xs leading-relaxed whitespace-pre-wrap select-all max-h-[360px] overflow-y-auto",
                                    ambianceTheme === 'dark'
                                        ? "bg-slate-900/90 border-emerald-500/30 text-emerald-100"
                                        : "bg-emerald-50/50 border-emerald-200 text-slate-900"
                                )}>
                                    {whatsappMessage}
                                </div>

                                {/* Mesajı Kopyalama Butonu */}
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleCopy}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "rounded-xl font-bold text-xs cursor-pointer",
                                            ambianceTheme === 'dark' ? "border-white/15 hover:bg-white/10" : "border-slate-300 hover:bg-slate-100"
                                        )}
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                        <span>{isCopied ? 'Kopyalandı!' : 'Mesaj Metnini Kopyala'}</span>
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* 3. ÖĞRETMEN TAVSİYESİ & NOTU DÜZENLEME */}
                    <div className={cn(
                        "p-3.5 sm:p-4 rounded-2xl border space-y-2.5",
                        ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    )}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                Öğretmen Çalışma Tavsiyesi &amp; Notu (Mesaja ve Rapora Eklenir)
                            </span>
                            <span className="text-[10px] opacity-60">Düzenlenebilir</span>
                        </div>

                        <Textarea
                            value={teacherNote}
                            onChange={(e) => setTeacherNote(e.target.value)}
                            rows={2}
                            placeholder="Evde çalışılması için öğrenciye tavsiyenizi yazın..."
                            className={cn(
                                "text-xs rounded-xl resize-none",
                                ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                            )}
                        />

                        {/* Hızlı Tavsiye Butonları */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] font-bold opacity-60 py-0.5">Hızlı Şablonlar:</span>
                            <button
                                type="button"
                                onClick={() => handleSelectTemplate('Peltek harfleri (ث, ذ, ظ) dil ucunu dişlerin arasına alarak evde 15 dakika sesli tekrar edelim.')}
                                className={cn(
                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                                    ambianceTheme === 'dark' ? "bg-white/6 hover:bg-white/12 border-white/10 text-slate-300" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                                )}
                            >
                                👅 Peltek Harfler Tekrarı
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectTemplate('Harekeleri gereksiz yere uzatmadan net ve temiz sesle okumaya özen gösterelim.')}
                                className={cn(
                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                                    ambianceTheme === 'dark' ? "bg-white/6 hover:bg-white/12 border-white/10 text-slate-300" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                                )}
                            >
                                🎯 Hareke Okunuşları
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectTemplate('Gayretiniz ve güzel okuyuşunuz için tebrik ederim! Çok başarılı, aynen devam! 👏')}
                                className={cn(
                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                                    ambianceTheme === 'dark' ? "bg-white/6 hover:bg-white/12 border-white/10 text-slate-300" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                                )}
                            >
                                👏 Tebrik &amp; Motivasyon
                            </button>
                        </div>
                    </div>

                </div>

                {/* 4. ALT EYLEM ÇUBUĞU */}
                <div className={cn(
                    "p-3.5 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0",
                    ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className={cn(
                            "rounded-xl font-bold text-xs cursor-pointer w-full sm:w-auto",
                            ambianceTheme === 'dark' ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        Kapat
                    </Button>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Görsel PNG İndir */}
                        <Button
                            variant="outline"
                            onClick={handleDownloadImage}
                            disabled={isExportingImage}
                            className={cn(
                                "rounded-xl font-bold text-xs border cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "bg-white/6 border-white/15 text-slate-200 hover:bg-white/12"
                                    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                            )}
                            title="Raporu PNG resim formatında indir"
                        >
                            {isExportingImage ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                            <span>Görsel İndir</span>
                        </Button>

                        {/* Yazdır / PDF İndir */}
                        <Button
                            variant="outline"
                            onClick={handlePrint}
                            className={cn(
                                "rounded-xl font-bold text-xs border cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "bg-white/6 border-white/15 text-slate-200 hover:bg-white/12"
                                    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                            )}
                            title="Yazdır veya PDF Olarak Kaydet"
                        >
                            <Printer className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                            <span>Yazdır / PDF</span>
                        </Button>

                        {/* WhatsApp İle Gönder (Ana Buton) */}
                        <Button
                            onClick={handleOpenWhatsApp}
                            className="rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 cursor-pointer flex items-center gap-1.5"
                            title="Doğrudan WhatsApp'a aktar ve veliye/öğrenciye gönder"
                        >
                            <Send className="w-3.5 h-3.5 fill-white" />
                            <span>WhatsApp ile Gönder</span>
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
