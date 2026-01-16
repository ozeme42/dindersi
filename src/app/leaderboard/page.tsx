'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Crown, Trophy, Users, List, Flame, Search, 
    ChevronLeft, ChevronRight, Loader2, BookOpenCheck, LogIn, School, GraduationCap, LayoutDashboard,
    Megaphone, BellRing, X, Palmtree, Sun, Gift, PartyPopper, CalendarClock, Settings, Save, Plus, Trash2, FilePenLine, RotateCcw, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import Link from 'next/link';
import { 
    getHallOfFameData, getLiveLeaderboard, HallOfFamePeriod, getAnnouncements, 
    getLeaderboardSettings, saveLeaderboardSettings, 
    finishHolidayAndStartSeason, startHolidayMode, undoLastSeasonAction,
    createAnnouncement, deleteAnnouncement, updateAnnouncement,
    getSchoolLeaderboard, getGradeLeaderboard, getBranchLeaderboard
} from '@/app/leaderboard/actions'; 
import type { UserProfile } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const ITEMS_PER_PAGE = 20;

// --- YARDIMCI FONKSİYONLAR ---
const formatIsoToLocalInput = (isoString: string | null) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    } catch (e) { return ''; }
};

// --- BİLEŞENLER ---
const PaginationControls = ({ currentPage, totalPages, onPageChange }: any) => { if (totalPages <= 1) return null; return (<div className="flex items-center justify-center gap-4 mt-8"><Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="bg-slate-900/50 border-white/10 text-white hover:bg-indigo-600"><ChevronLeft className="h-4 w-4 mr-1" /> Önceki</Button><div className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-black/20 px-4 py-1.5 rounded-full border border-white/5"><span className="text-white">{currentPage}</span><span className="text-slate-600">/</span><span>{totalPages}</span></div><Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="bg-slate-900/50 border-white/10 text-white hover:bg-indigo-600">Sonraki <ChevronRight className="h-4 w-4 ml-1" /></Button></div>); };
const RankBadge = ({ rank }: { rank: number }) => { if (rank === 1) return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg text-yellow-950 font-black text-sm shrink-0"><Crown className="h-5 w-5" /></div>; if (rank === 2) return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 shadow-lg text-slate-900 font-black text-sm shrink-0">2</div>; if (rank === 3) return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-600 shadow-lg text-orange-950 font-black text-sm shrink-0">3</div>; return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-slate-400 font-bold text-sm border border-white/10 shrink-0">{rank}</div>; };
const Podium = ({ winners }: { winners: UserProfile[] }) => { if (!winners || winners.length === 0) return <div className="text-center py-10 text-slate-400 bg-black/20 rounded-lg border border-white/5">Veri yok.</div>; return (<div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-4xl px-4 mt-8 mb-12">{winners.length > 1 && (<div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-100"><UserAvatar user={winners[1]} className="w-16 h-16 border-4 border-slate-300 shadow-lg mx-auto mb-2" /><div className="text-center"><div className="text-white font-bold text-sm truncate max-w-[100px]">{winners[1].displayName}</div><div className="text-slate-400 text-xs">{winners[1].class}</div></div><div className="w-full bg-gradient-to-t from-slate-900/80 to-slate-800/80 rounded-t-xl mt-3 h-32 flex items-end justify-center pb-4 border-t-4 border-slate-400"><span className="text-slate-300 font-mono font-bold">{winners[1].score} XP</span></div></div>)}{winners.length > 0 && (<div className="flex flex-col items-center w-1/3 z-10 animate-in slide-in-from-bottom-8 duration-700"><div className="relative"><div className="absolute -top-6 left-1/2 -translate-x-1/2"><Crown className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-bounce" /></div><UserAvatar user={winners[0]} className="w-20 h-20 border-4 border-yellow-400 shadow-lg mx-auto mb-2" /></div><div className="text-center"><div className="text-yellow-100 font-bold text-base truncate max-w-[120px]">{winners[0].displayName}</div><div className="text-yellow-500/80 text-xs">{winners[0].class}</div></div><div className="w-full bg-gradient-to-t from-yellow-900/40 to-amber-700/40 rounded-t-xl mt-3 h-40 flex items-end justify-center pb-6 border-t-4 border-yellow-400"><span className="text-yellow-100 font-mono font-black text-xl">{winners[0].score}</span></div></div>)}{winners.length > 2 && (<div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-200"><UserAvatar user={winners[2]} className="w-16 h-16 border-4 border-orange-500 shadow-lg mx-auto mb-2" /><div className="text-center"><div className="text-white font-bold text-sm truncate max-w-[100px]">{winners[2].displayName}</div><div className="text-orange-400 text-xs">{winners[2].class}</div></div><div className="w-full bg-gradient-to-t from-orange-950/80 to-orange-900/80 rounded-t-xl mt-3 h-28 flex items-end justify-center pb-4 border-t-4 border-orange-500"><span className="text-orange-200 font-mono font-bold">{winners[2].score} XP</span></div></div>)}</div>); };
const LeaderboardRow = ({ user, index }: { user: UserProfile, index: number }) => (<div className="group relative flex items-center gap-4 p-4 bg-slate-900/40 hover:bg-slate-800/60 rounded-2xl border border-white/5 transition-all hover:scale-[1.01] overflow-hidden"><RankBadge rank={index + 1} /><UserAvatar user={user} className="h-10 w-10 text-sm shrink-0 border border-white/10" /><div className="flex-grow min-w-0"><div className="font-bold text-slate-200 group-hover:text-white transition-colors truncate text-base">{user.displayName}</div><div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 border-white/10 text-slate-400 bg-black/20">{user.class || 'Sınıfsız'}</Badge>{user.schoolName && <span className="text-[10px] text-slate-500 truncate max-w-[150px] hidden sm:block">{user.schoolName}</span>}</div></div><div className="text-right shrink-0"><div className="font-mono font-bold text-indigo-300 group-hover:text-indigo-200 text-lg">{(user.score || 0).toLocaleString()}</div><div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">TOPLAM PUAN</div></div></div>);
const GroupLeaderboardRow = ({ item, index, onClick, type }: any) => { return (<div onClick={onClick} className="group relative flex items-center gap-4 p-4 bg-slate-900/60 hover:bg-indigo-900/20 rounded-2xl border border-white/10 transition-all hover:scale-[1.01] cursor-pointer overflow-hidden"><RankBadge rank={index + 1} /><div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:from-indigo-900 group-hover:to-slate-900 transition-colors">{type === 'school' && <School className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />}{type === 'grade' && <GraduationCap className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />}{type === 'branch' && <LayoutDashboard className="h-6 w-6 text-emerald-400 group-hover:text-emerald-300" />}</div><div className="flex-grow min-w-0"><div className="flex items-center gap-2"><div className="font-bold text-white text-lg truncate">{item.name}</div><ChevronRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" /></div><div className="flex items-center gap-2 mt-0.5"><Badge variant="secondary" className="text-[10px] py-0 px-2 h-5 bg-white/5 text-slate-400 border-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-200">{item.studentCount} Öğrenci</Badge></div></div><div className="text-right shrink-0"><div className="font-mono font-bold text-white text-xl group-hover:text-indigo-300 transition-colors">{item.score.toLocaleString()}</div><div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 uppercase tracking-widest font-bold"><Flame className="h-3 w-3 text-orange-500" /> Toplam Puan</div></div></div>); }

// --- ŞEREF KÜRSÜSÜ KARTI VE DETAY PENCERESİ (YENİ) ---
function HallOfFameCard({ period }: { period: HallOfFamePeriod }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="group relative bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all hover:-translate-y-1 duration-300 cursor-pointer">
                    <div className="bg-gradient-to-r from-amber-900/40 to-slate-900/40 p-4 border-b border-white/5 flex items-center justify-between">
                        <span className="font-black text-amber-100 uppercase tracking-wider text-sm">{period.periodName}</span>
                        <Trophy className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="p-4 space-y-4">
                        {period.winners.slice(0, 3).map((winner, rank) => (
                            <div key={rank} className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", rank === 0 ? "bg-yellow-400 text-black shadow-lg" : rank === 1 ? "bg-slate-300 text-black" : "bg-orange-400 text-black")}>{rank + 1}</div>
                                <UserAvatar user={winner} className="h-8 w-8 border border-white/10" />
                                <div className="min-w-0">
                                    <div className="text-white font-bold text-sm truncate">{winner.displayName}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{winner.score.toLocaleString()} Puan</div>
                                </div>
                            </div>
                        ))}
                        {period.winners.length > 3 && (
                            <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5 group-hover:text-amber-400 transition-colors flex items-center justify-center gap-2"><List className="h-3 w-3"/>+ {period.winners.length - 3} öğrenci daha (Tümünü Gör)</div>
                        )}
                        {period.winners.length <= 3 && (
                            <div className="text-center text-[10px] text-slate-600 pt-2">Detaylar için tıkla</div>
                        )}
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-400"><Trophy className="h-5 w-5"/>{period.periodName} - Liderlik Tablosu</DialogTitle>
                    <DialogDescription>Bu dönemin en iyi öğrencileri.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                    {period.winners.map((winner, index) => (
                        <LeaderboardRow key={index} user={winner} index={index} />
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- SÜPER ADMİN YÖNETİM PENCERESİ ---
function AdminSettingsDialog({ onSettingsChange }: { onSettingsChange: () => void }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState({ seasonName: '', holidayMode: false, holidayMessage: '', rewards: { first: 500, second: 250, third: 100 }, seasonStartDate: '', seasonEndDate: '' });
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [annForm, setAnnForm] = useState({ id: '', title: '', content: '', category: 'general' });
    const [loadingAnn, setLoadingAnn] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFinishingHoliday, setIsFinishingHoliday] = useState(false);
    const [isStartingHoliday, setIsStartingHoliday] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [indexLink, setIndexLink] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            getLeaderboardSettings().then(data => {
                if(data) setSettings({ ...data, seasonStartDate: formatIsoToLocalInput(data.seasonStartDate), seasonEndDate: formatIsoToLocalInput(data.seasonEndDate) });
            });
            fetchAnnouncements();
            setIndexLink(null);
        }
    }, [open]);

    const fetchAnnouncements = () => { setLoadingAnn(true); getAnnouncements(annForm.category).then(res => { if(res.success && res.data) setAnnouncements(res.data); setLoadingAnn(false); }); };
    
    const handleSaveSettings = async () => {
        setIsSaving(true);
        const dataToSave = { seasonName: settings.seasonName, holidayMessage: settings.holidayMessage, rewards: settings.rewards, seasonStartDate: settings.seasonStartDate ? new Date(settings.seasonStartDate).toISOString() : null, seasonEndDate: settings.seasonEndDate ? new Date(settings.seasonEndDate).toISOString() : null };
        const result = await saveLeaderboardSettings(dataToSave);
        if (result.success) { toast({ title: "Başarılı", description: "Genel ayarlar güncellendi." }); onSettingsChange(); } else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        setIsSaving(false);
    };

    const handleStartHoliday = async () => {
        if(!confirm(`DİKKAT! BU İŞLEM GERİ ALINAMAZ!\n\n1. "${settings.seasonName}" sezonu arşivlenecek.\n2. TÜM ÖĞRENCİLERİN PUANLARI SIFIRLANACAK.\n3. Tatil modu açılacak.\n\nDevam etmek istiyor musunuz?`)) return;
        setIsStartingHoliday(true);
        const result = await startHolidayMode(settings.seasonName, settings.holidayMessage || "İyi tatiller!");
        if (result.success) { toast({ title: "Tatil Modu Başladı", description: result.message, className: "bg-orange-600 text-white" }); onSettingsChange(); setOpen(false); } 
        else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        setIsStartingHoliday(false);
    };

    const handleEndHoliday = async () => {
        if(!settings.seasonName || settings.seasonName === "TATİL DÖNEMİ") { alert("Lütfen yeni sezon için geçerli bir isim giriniz."); return; }
        if(!confirm("Tatil dönemi bitirilecek.\n\n1. Tatil puanları arşivlenecek.\n2. Herkesin puanı SIFIRLANACAK.\n3. Tatil birincilerine ödül puanları verilecek.\n4. Yeni sezon başlayacak.\n\nEmin misiniz?")) return;
        setIsFinishingHoliday(true);
        const result = await finishHolidayAndStartSeason(settings.seasonName, settings.rewards);
        if (result.success) { toast({ title: "Yeni Sezon Başladı", description: result.message, className: "bg-emerald-600 text-white" }); onSettingsChange(); setOpen(false); } 
        else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        setIsFinishingHoliday(false);
    };

    const handleUndo = async () => {
        const actionName = settings.holidayMode ? "Sezon Bitirme (Tatile Geçiş)" : "Tatil Bitirme (Yeni Sezon)";
        if (!confirm(`⚠️ DİKKAT: SON İŞLEMİ GERİ ALMAK ÜZERESİNİZ!\n\nBu işlem "${actionName}" işlemini iptal eder ve puanları geri yükler.\n\nEmin misiniz?`)) return;
        setIsUndoing(true);
        setIndexLink(null); 
        const result = await undoLastSeasonAction();
        if (result.success) {
            toast({ title: "İşlem Geri Alındı", description: result.message, className: "bg-blue-600 text-white" });
            onSettingsChange(); setOpen(false);
        } else {
            if (result.error && (result.error.includes("index") || result.error.includes("precondition")) && result.error.includes("https://console.firebase.google.com")) {
                const urlRegex = /https:\/\/console\.firebase\.google\.com[^\s]*/;
                const match = result.error.match(urlRegex);
                if (match) { setIndexLink(match[0]); toast({ title: "İndeks Gerekli", description: "Veritabanı indeksi oluşturmanız gerekiyor. Kırmızı kutudaki linke tıklayın.", variant: "destructive" }); } 
                else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
            } else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        }
        setIsUndoing(false);
    };

    const handleAnnouncementSubmit = async () => {
        if(!annForm.title || !annForm.content) { toast({ title: "Eksik Bilgi", description: "Başlık ve içerik giriniz.", variant: "destructive" }); return; }
        setLoadingAnn(true);
        let res;
        if (annForm.id) { res = await updateAnnouncement(annForm.id, { title: annForm.title, content: annForm.content, category: annForm.category }); } 
        else { res = await createAnnouncement({ title: annForm.title, content: annForm.content, category: annForm.category as 'general' | 'exam' }); }
        if(res.success) { toast({ title: annForm.id ? "Duyuru Güncellendi" : "Duyuru Eklendi" }); setAnnForm({ id: '', title: '', content: '', category: annForm.category }); fetchAnnouncements(); } 
        else { toast({ title: "Hata", description: res.error, variant: "destructive" }); }
        setLoadingAnn(false);
    }
    const handleDeleteAnnouncement = async (id: string) => { if(!confirm("Silinsin mi?")) return; const res = await deleteAnnouncement(id); if(res.success) { toast({ title: "Silindi" }); fetchAnnouncements(); } }
    const handleEditClick = (ann: any) => { setAnnForm({ id: ann.id, title: ann.title, content: ann.content, category: ann.category }); };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline" className="bg-slate-900/80 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 gap-2"><Settings className="h-4 w-4" /> Yönetim</Button></DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-xl flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400"/> Yönetim Paneli</DialogTitle><DialogDescription>Sistem ayarlarını ve duyuruları buradan yönetebilirsiniz.</DialogDescription></DialogHeader>
                <Tabs defaultValue="season" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-white/10 mb-4"><TabsTrigger value="season">Sezon & Tarihler</TabsTrigger><TabsTrigger value="announcements">Duyurular</TabsTrigger></TabsList>
                    <TabsContent value="season" className="space-y-5">
                        {!settings.holidayMode && (<div className="p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/30 space-y-4"><div className="space-y-2"><Label className="text-slate-300">Aktif Sezon Adı</Label><Input value={settings.seasonName} onChange={(e) => setSettings({ ...settings, seasonName: e.target.value })} className="bg-slate-900 border-white/10" placeholder="Örn: 2025-2026 Güz" /></div><div className="pt-2 pb-2 border-t border-white/5 mt-4"><h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2"><Palmtree className="h-4 w-4"/> Tatil Moduna Geçiş</h4><p className="text-xs text-slate-400 mb-3 leading-relaxed">Bu butona bastığınızda mevcut sezon <b>arşivlenir</b> ve <b>tüm öğrencilerin puanları sıfırlanır</b>. Sistem tatil moduna geçer.</p><div className="space-y-2 mb-3"><Label className="text-xs text-slate-400">Tatil Mesajı</Label><Input value={settings.holidayMessage} onChange={(e) => setSettings({ ...settings, holidayMessage: e.target.value })} className="bg-slate-900 border-white/10" placeholder="İyi tatiller! Yeni sezon yakında..." /></div><Button onClick={handleStartHoliday} disabled={isStartingHoliday} className="w-full bg-orange-600 hover:bg-orange-500 text-white border-0">{isStartingHoliday ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Palmtree className="mr-2 h-4 w-4"/>} Sezonu Bitir & Tatile Geç</Button></div></div>)}
                        {settings.holidayMode && (<div className="p-4 rounded-xl bg-orange-900/20 border border-orange-500/30 space-y-4 animate-in fade-in"><div className="flex items-center justify-between mb-2"><Badge className="bg-orange-500 animate-pulse text-white border-0">TATİL MODU AKTİF</Badge></div><div className="space-y-2"><Label className="text-slate-300 font-bold">Yeni Başlayacak Sezonun Adı</Label><Input value={settings.seasonName === "TATİL DÖNEMİ" ? "" : settings.seasonName} onChange={(e) => setSettings({ ...settings, seasonName: e.target.value })} className="bg-slate-900 border-white/10" placeholder="Örn: 2025-2026 Bahar Dönemi" /></div><div className="space-y-2 bg-black/20 p-3 rounded-lg border border-white/5"><Label className="text-xs text-emerald-400 font-bold flex items-center gap-1 mb-2"><Gift className="h-3 w-3"/> Yeni Sezon Başlangıç Ödülleri</Label><div className="grid grid-cols-3 gap-2"><div className="space-y-1"><span className="text-[10px] text-yellow-500 block text-center font-bold">1. Ödülü</span><Input type="number" value={settings.rewards.first} onChange={e => setSettings({...settings, rewards: {...settings.rewards, first: +e.target.value}})} className="bg-slate-900 border-white/10 text-center h-8" /></div><div className="space-y-1"><span className="text-[10px] text-slate-400 block text-center font-bold">2. Ödülü</span><Input type="number" value={settings.rewards.second} onChange={e => setSettings({...settings, rewards: {...settings.rewards, second: +e.target.value}})} className="bg-slate-900 border-white/10 text-center h-8" /></div><div className="space-y-1"><span className="text-[10px] text-orange-500 block text-center font-bold">3. Ödülü</span><Input type="number" value={settings.rewards.third} onChange={e => setSettings({...settings, rewards: {...settings.rewards, third: +e.target.value}})} className="bg-slate-900 border-white/10 text-center h-8" /></div></div><p className="text-[10px] text-slate-500 mt-2">Bu puanlar tatil bittiğinde ilk 3'e otomatik verilir.</p></div><Button onClick={handleEndHoliday} disabled={isFinishingHoliday} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 mt-2">{isFinishingHoliday ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trophy className="mr-2 h-4 w-4"/>} Tatili Bitir & Yeni Sezonu Başlat</Button></div>)}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5"><div className="space-y-2"><Label className="text-xs uppercase font-bold text-slate-400">Başlangıç Tarihi</Label><Input type="datetime-local" value={settings.seasonStartDate} onChange={(e) => setSettings({ ...settings, seasonStartDate: e.target.value })} className="bg-slate-900 border-white/10 text-xs" /></div><div className="space-y-2"><Label className="text-xs uppercase font-bold text-slate-400">Bitiş Tarihi</Label><Input type="datetime-local" value={settings.seasonEndDate} onChange={(e) => setSettings({ ...settings, seasonEndDate: e.target.value })} className="bg-slate-900 border-white/10 text-xs" /></div></div><Button onClick={handleSaveSettings} disabled={isSaving} variant="outline" className="w-full border-white/10 hover:bg-white/5">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>} Sadece Tarihleri/Metinleri Kaydet</Button>
                        {indexLink && (<div className="bg-red-900/50 p-4 rounded-lg border border-red-500/50 mb-4 animate-in fade-in"><p className="font-bold text-red-200 mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Firebase İndeksi Eksik</p><p className="text-xs text-red-300 mb-2">Geri alma işlemini yapabilmek için veritabanı indeksi gerekiyor. Linke tıklayıp "Create Index" deyin:</p><a href={indexLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-xs break-all hover:text-blue-300 block bg-black/30 p-2 rounded">{indexLink}</a><Button onClick={() => setIndexLink(null)} size="sm" variant="ghost" className="mt-2 h-6 text-xs text-red-400 hover:bg-red-900/50 hover:text-white">Kapat</Button></div>)}
                        <div className="mt-8 pt-4 border-t-2 border-dashed border-red-500/30"><div className="flex items-center justify-between"><div className="text-xs text-red-400 font-bold">Hatalı işlem mi yaptınız?</div><Button onClick={handleUndo} disabled={isUndoing} variant="ghost" size="sm" className="text-red-400 hover:text-white hover:bg-red-500/20 h-8 text-xs border border-red-500/30">{isUndoing ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : <RotateCcw className="mr-2 h-3 w-3"/>} Son İşlemi Geri Al</Button></div><p className="text-[10px] text-slate-500 mt-2">Bu buton, en son yapılan sezon işlemini iptal eder.</p></div>
                    </TabsContent>
                    <TabsContent value="announcements" className="space-y-4">
                         <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5 space-y-3"><div className="flex justify-between items-center"><h4 className="text-sm font-bold text-white">{annForm.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Ekle'}</h4>{annForm.id && <Button variant="ghost" size="sm" onClick={() => setAnnForm({ id: '', title: '', content: '', category: annForm.category })} className="h-6 text-xs text-slate-400 hover:text-white">Vazgeç <X className="ml-1 h-3 w-3"/></Button>}</div><div className="flex gap-2"><Input placeholder="Başlık" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} className="bg-slate-950 border-white/10" /><Select value={annForm.category} onValueChange={v => { setAnnForm({...annForm, category: v}); fetchAnnouncements(); }}><SelectTrigger className="w-[120px] bg-slate-950 border-white/10"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="general">Genel</SelectItem><SelectItem value="exam">Sınav</SelectItem></SelectContent></Select></div><Textarea placeholder="Duyuru içeriği..." value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} className="bg-slate-950 border-white/10 min-h-[60px]" /><Button onClick={handleAnnouncementSubmit} disabled={loadingAnn} className={cn("w-full h-8 text-xs", annForm.id ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500")}>{loadingAnn ? <Loader2 className="mr-2 h-3 w-3 animate-spin"/> : (annForm.id ? <Save className="mr-2 h-3 w-3"/> : <Plus className="mr-2 h-3 w-3"/>)} {annForm.id ? 'Değişiklikleri Kaydet' : 'Duyuru Yayınla'}</Button></div>
                         <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">{announcements.length === 0 ? <p className="text-center text-slate-500 text-sm py-4">Duyuru yok.</p> : announcements.map(ann => (<div key={ann.id} className={cn("flex justify-between items-start p-3 rounded-lg border transition-colors group", annForm.id === ann.id ? "bg-indigo-900/20 border-indigo-500/50" : "bg-slate-900 border-white/5 hover:bg-slate-800")}><div className="flex-grow cursor-pointer" onClick={() => handleEditClick(ann)}><div className="font-bold text-white text-sm flex items-center gap-2">{ann.title} {annForm.id === ann.id && <Badge className="text-[9px] h-4 bg-indigo-500">Düzenleniyor</Badge>}</div><div className="text-xs text-slate-400 mt-1 line-clamp-2">{ann.content}</div><div className="text-[10px] text-slate-600 mt-1">{format(new Date(ann.createdAt), 'd MMM HH:mm', {locale: tr})}</div></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-amber-400" onClick={() => handleEditClick(ann)}><FilePenLine className="h-3 w-3"/></Button><Button size="icon" variant="ghost" className="h-6 w-6 text-slate-500 hover:text-red-400" onClick={() => handleDeleteAnnouncement(ann.id)}><Trash2 className="h-3 w-3"/></Button></div></div>))}</div>
                    </TabsContent>
                </Tabs>
                <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Kapat</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- SAYAÇ ---
function CountdownTimer({ targetDate }: { targetDate: string }) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    useEffect(() => {
        if (!targetDate) return;
        const calculate = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const diff = target - now;
            if (diff > 0) {
                setTimeLeft({ days: Math.floor(diff / (1000 * 60 * 60 * 24)), hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)), seconds: Math.floor((diff % (1000 * 60)) / 1000) });
            } else { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); }
        };
        calculate();
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className="flex gap-2 sm:gap-4 text-center justify-center sm:justify-start">
            <div className="bg-black/30 p-2 sm:p-3 rounded-xl min-w-[55px] border border-white/10 backdrop-blur-md"><div className="text-lg sm:text-2xl font-black text-white font-mono">{timeLeft.days}</div><div className="text-[9px] sm:text-xs text-slate-400 uppercase font-bold">Gün</div></div>
            <div className="bg-black/30 p-2 sm:p-3 rounded-xl min-w-[55px] border border-white/10 backdrop-blur-md"><div className="text-lg sm:text-2xl font-black text-white font-mono">{timeLeft.hours}</div><div className="text-[9px] sm:text-xs text-slate-400 uppercase font-bold">Saat</div></div>
            <div className="bg-black/30 p-2 sm:p-3 rounded-xl min-w-[55px] border border-white/10 backdrop-blur-md"><div className="text-lg sm:text-2xl font-black text-white font-mono">{timeLeft.minutes}</div><div className="text-[9px] sm:text-xs text-slate-400 uppercase font-bold">Dak</div></div>
            <div className="bg-black/30 p-2 sm:p-3 rounded-xl min-w-[55px] border border-white/10 backdrop-blur-md animate-pulse"><div className="text-lg sm:text-2xl font-black text-red-400 font-mono">{timeLeft.seconds}</div><div className="text-[9px] sm:text-xs text-slate-400 uppercase font-bold">San</div></div>
        </div>
    );
}

// --- SEZON BİLGİ KARTI ---
function SeasonInfoWidget({ settings }: { settings: any }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const now = new Date();
    const startDate = settings.seasonStartDate && !isNaN(Date.parse(settings.seasonStartDate)) ? new Date(settings.seasonStartDate) : null;
    const endDate = settings.seasonEndDate && !isNaN(Date.parse(settings.seasonEndDate)) ? new Date(settings.seasonEndDate) : null;

    let status = "active";
    if (settings.holidayMode) status = "holiday";
    else if (startDate && now < startDate) status = "upcoming";
    else if (endDate && now > endDate) status = "ended";

    let targetDate = endDate;
    let title = settings.seasonName || "Liderlik Tablosu";
    let subtitle = "Puanları topla, sıralamada yüksel!";
    let icon = <Trophy className="h-8 w-8 text-yellow-400" />;
    let colorClass = "from-indigo-900/80 via-purple-900/60 to-indigo-900/80 border-indigo-500/30";

    if (status === 'holiday') {
        title = "TATİL KUPASI";
        subtitle = settings.holidayMessage || "İyi tatiller! Yeni sezon yakında.";
        targetDate = startDate && startDate > now ? startDate : null; 
        icon = <PartyPopper className="h-8 w-8 text-orange-400" />;
        colorClass = "from-orange-900/80 via-amber-900/60 to-red-900/80 border-orange-500/30";
    } else if (status === 'upcoming') {
        targetDate = startDate;
        subtitle = "Yeni sezonun başlamasına kalan süre:";
        colorClass = "from-blue-900/80 via-cyan-900/60 to-blue-900/80 border-blue-500/30";
        icon = <CalendarClock className="h-8 w-8 text-blue-400" />;
    } else if (status === 'ended') {
        targetDate = null;
        subtitle = "Sezon tamamlandı. Sonuçlar açıklanıyor...";
        colorClass = "from-slate-900/80 via-gray-800/60 to-slate-900/80 border-slate-500/30";
        icon = <Trophy className="h-8 w-8 text-slate-400" />;
    }

    const targetDateStr = (targetDate && targetDate.getTime() > now.getTime()) ? targetDate.toISOString() : null;

    return (
        <div className={`w-full max-w-5xl mx-auto mb-8 animate-in zoom-in-95 duration-700 px-4`}>
            <div className={`relative bg-gradient-to-r ${colorClass} border rounded-3xl p-6 overflow-hidden shadow-2xl group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-1000">
                    {status === 'holiday' ? <Palmtree className="h-48 w-48 text-white -rotate-12 translate-x-10 -translate-y-10" /> : <Trophy className="h-48 w-48 text-white -rotate-12 translate-x-10 -translate-y-10" />}
                </div>
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left flex-grow">
                        <div className="p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md shadow-inner">{icon}</div>
                        <div>
                            <div className="flex flex-col md:flex-row items-center gap-3 mb-1 justify-center md:justify-start">
                                <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">{title}</h3>
                                {status === 'holiday' && <Badge className="bg-orange-500 text-white border-0 animate-pulse">Tatil Modu</Badge>}
                                {status === 'active' && <Badge className="bg-emerald-500 text-white border-0">Aktif Sezon</Badge>}
                                {status === 'upcoming' && <Badge className="bg-blue-500 text-white border-0">Yakında</Badge>}
                            </div>
                            <p className="text-slate-200 font-medium text-lg mb-3">{subtitle}</p>
                            {status !== 'holiday' && (
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start text-xs font-mono text-slate-400">
                                    {startDate && <span className="bg-black/40 px-2 py-1 rounded border border-white/10">Başlangıç: <span className="text-white">{format(startDate, 'd MMM yyyy HH:mm', { locale: tr })}</span></span>}
                                    {endDate && <span className="bg-black/40 px-2 py-1 rounded border border-white/10">Bitiş: <span className="text-white">{format(endDate, 'd MMM yyyy HH:mm', { locale: tr })}</span></span>}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-4 shrink-0">
                        {targetDateStr && <CountdownTimer targetDate={targetDateStr} />}
                        {status === 'holiday' && settings.rewards && (
                             <div className="flex gap-2 bg-black/40 p-2 rounded-xl border border-white/10 backdrop-blur-md"><div className="flex flex-col items-center px-4 border-r border-white/10"><span className="text-[10px] text-yellow-400 font-bold uppercase">1. Ödülü</span><span className="text-lg font-black text-white">+{settings.rewards.first}</span></div><div className="flex flex-col items-center px-4 border-r border-white/10"><span className="text-[10px] text-slate-300 font-bold uppercase">2. Ödülü</span><span className="text-lg font-black text-white">+{settings.rewards.second}</span></div><div className="flex flex-col items-center px-4"><span className="text-[10px] text-orange-400 font-bold uppercase">3. Ödülü</span><span className="text-lg font-black text-white">+{settings.rewards.third}</span></div></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnnouncementsWidget() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    useEffect(() => { getAnnouncements('general').then(res => { if (res.success && res.data) setAnnouncements(res.data.slice(0, 3)); }); }, []);
    if (announcements.length === 0 || !isOpen) return null;
    return (
        <div className="w-full max-w-5xl mx-auto mb-8 animate-in slide-in-from-top-4 duration-700 px-4">
            <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 rounded-2xl p-4 relative overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="absolute top-0 right-0 p-2"><button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button></div>
                <div className="flex items-start gap-4">
                    <div className="bg-indigo-500/20 p-3 rounded-xl shrink-0 animate-pulse hidden sm:block"><BellRing className="h-6 w-6 text-indigo-300" /></div>
                    <div className="space-y-3 w-full pr-6">
                        <h3 className="text-indigo-200 font-bold text-sm uppercase tracking-widest flex items-center gap-2"><Megaphone className="h-4 w-4" /> Duyurular</h3>
                        <div className="grid gap-3">{announcements.map((ann) => (<div key={ann.id} className="bg-black/20 rounded-lg p-3 border border-white/5 hover:bg-black/30 transition-colors"><div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1"><h4 className="text-white font-bold text-sm sm:text-base">{ann.title}</h4><span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap w-fit">{format(new Date(ann.createdAt), "d MMMM", { locale: tr })}</span></div><p className="text-slate-300 text-sm leading-relaxed">{ann.content}</p></div>))}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CurrentLeaderboardTab() {
    const [search, setSearch] = useState("");
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    useEffect(() => { setIsLoading(true); getLiveLeaderboard().then(data => setLeaderboard(data)).finally(() => setIsLoading(false)); }, []);
    useEffect(() => setCurrentPage(1), [search]);
    const filteredUsers = useMemo(() => { if (!search) return leaderboard; return leaderboard.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase())); }, [search, leaderboard]);
    const listData = useMemo(() => search ? filteredUsers : filteredUsers.slice(3), [filteredUsers, search]);
    const totalPages = Math.ceil(listData.length / ITEMS_PER_PAGE);
    const paginatedList = listData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return (<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"><div className="relative w-full sm:w-96 mx-auto"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input type="text" placeholder="Öğrenci ara..." className="w-full bg-black/20 border border-white/5 rounded-full pl-12 pr-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600 shadow-xl" value={search} onChange={(e) => setSearch(e.target.value)} /></div>{isLoading ? <div className="flex justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-indigo-400" /></div> : filteredUsers.length === 0 ? <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">Kayıt bulunamadı.</div> : (<>{!search && currentPage === 1 && <Podium winners={filteredUsers.slice(0, 3)} />}<div className="space-y-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2"><List className="h-3 w-3" /> Sıralama Listesi</div>{paginatedList.map((user, index) => <LeaderboardRow key={user.uid} user={user} index={(currentPage - 1) * ITEMS_PER_PAGE + index + (search ? 0 : 3)} />)}</div><PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></>)}</div>);
}

function ClassLeaderboardTab() {
    const [navStack, setNavStack] = useState<{ id: string, name: string, type: string }[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'groups' | 'students'>('groups');
    const [currentPage, setCurrentPage] = useState(1);
    useEffect(() => { setIsLoading(true); getLiveLeaderboard().then(data => { setAllUsers(data); setIsLoading(false); }); }, []);
    useEffect(() => { setViewMode('groups'); setCurrentPage(1); }, [navStack.length]);
    useEffect(() => setCurrentPage(1), [viewMode]);
    const { groups, students } = useMemo(() => { if (isLoading) return { groups: [], students: [] }; let filteredUsers = [...allUsers]; let groupType: 'school' | 'grade' | 'branch' | null = null; if (navStack.length > 0) filteredUsers = filteredUsers.filter(u => (u.schoolName || "Diğer Okullar") === navStack[0].name); if (navStack.length > 1) filteredUsers = filteredUsers.filter(u => { const classStr = u.class || "Bilinmeyen"; const grade = classStr.includes('-') ? classStr.split('-')[0].trim() + ". Sınıflar" : classStr; return grade === navStack[1].name; }); if (navStack.length > 2) filteredUsers = filteredUsers.filter(u => (u.class || "Bilinmeyen") === navStack[2].name); let groupingData: any[] = []; const map = new Map(); if (navStack.length === 0) { groupType = 'school'; filteredUsers.forEach(u => { const key = u.schoolName || "Diğer Okullar"; if(!map.has(key)) map.set(key, { name: key, score: 0, count: 0 }); map.get(key).score += (u.score || 0); map.get(key).count += 1; }); } else if (navStack.length === 1) { groupType = 'grade'; filteredUsers.forEach(u => { const classStr = u.class || "Bilinmeyen"; const key = classStr.includes('-') ? classStr.split('-')[0].trim() + ". Sınıflar" : classStr; if(!map.has(key)) map.set(key, { name: key, score: 0, count: 0 }); map.get(key).score += (u.score || 0); map.get(key).count += 1; }); } else if (navStack.length === 2) { groupType = 'branch'; filteredUsers.forEach(u => { const key = u.class || "Bilinmeyen"; if(!map.has(key)) map.set(key, { name: key, score: 0, count: 0 }); map.get(key).score += (u.score || 0); map.get(key).count += 1; }); } groupingData = Array.from(map.values()).sort((a,b) => b.score - a.score); return { groups: groupingData.map(g => ({ ...g, type: groupType, id: g.name, studentCount: g.count })), students: filteredUsers.sort((a, b) => (b.score || 0) - (a.score || 0)) }; }, [allUsers, navStack, isLoading]);
    const handleDrillDown = (item: any) => { if (navStack.length < 3) setNavStack([...navStack, { id: item.id, name: item.name, type: item.type }]); };
    const handleBack = () => setNavStack(prev => prev.slice(0, -1));
    const currentTitle = navStack.length === 0 ? "Tüm Okullar" : navStack[navStack.length - 1].name;
    const dataToRender = (navStack.length === 3 || viewMode === 'students') ? students : groups;
    const totalPages = Math.ceil(dataToRender.length / ITEMS_PER_PAGE);
    const paginatedData = dataToRender.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return (<div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6"><div className="flex flex-col gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md sticky top-20 z-20 shadow-xl"><div className="flex items-center gap-4">{navStack.length > 0 && <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-xl hover:bg-white/10 text-white shrink-0"><ChevronLeft className="h-6 w-6" /></Button>}<div className="overflow-hidden"><h3 className="text-xl font-bold text-white flex items-center gap-2 truncate">{navStack.length === 0 && <School className="h-5 w-5 text-purple-400" />}{navStack.length === 1 && <School className="h-5 w-5 text-blue-400" />}{navStack.length === 2 && <GraduationCap className="h-5 w-5 text-emerald-400" />}{navStack.length === 3 && <LayoutDashboard className="h-5 w-5 text-orange-400" />}{currentTitle}</h3><div className="flex gap-2 text-xs text-slate-400 mt-1 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none"><span className={cn("cursor-pointer hover:text-white transition-colors", navStack.length === 0 && "text-purple-300 font-bold")} onClick={() => setNavStack([])}>Okullar</span>{navStack.map((item, idx) => (<span key={idx} className="flex gap-2"><span className="text-slate-600">/</span><span className={cn("cursor-pointer hover:text-white transition-colors", idx === navStack.length - 1 && "text-purple-300 font-bold")} onClick={() => setNavStack(navStack.slice(0, idx + 1))}>{item.name}</span></span>))}</div></div></div>{navStack.length > 0 && navStack.length < 3 && (<div className="flex bg-black/20 p-1 rounded-xl w-full sm:w-fit self-center sm:self-start"><button onClick={() => setViewMode('groups')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2", viewMode === 'groups' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>{navStack.length === 1 ? <GraduationCap className="h-4 w-4"/> : <LayoutDashboard className="h-4 w-4"/>} {navStack.length === 1 ? 'Sınıflar' : 'Şubeler'}</button><button onClick={() => setViewMode('students')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2", viewMode === 'students' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}><Users className="h-4 w-4"/> Öğrenci Sıralaması</button></div>)}</div>{isLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-purple-400" /></div> : (<div className="space-y-3">{(navStack.length === 3 || viewMode === 'students') ? (paginatedData.length > 0 ? paginatedData.map((user: any, index) => <LeaderboardRow key={user.uid} user={user} index={(currentPage - 1) * ITEMS_PER_PAGE + index} />) : <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">Bu kategoride öğrenci bulunamadı.</div>) : (paginatedData.length > 0 ? paginatedData.map((item: any, index) => <GroupLeaderboardRow key={item.id} item={item} index={(currentPage - 1) * ITEMS_PER_PAGE + index} onClick={() => handleDrillDown(item)} type={item.type} />) : <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">Alt kategori bulunamadı.</div>)}<PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>)}</div>);
}

function HallOfFameTab() {
    const [history, setHistory] = useState<{ seasons: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }>({ seasons: [], monthly: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'seasons' | 'monthly'>('seasons');
    useEffect(() => { setIsLoading(true); getHallOfFameData().then(data => { setHistory(data as any); if(data.seasons.length === 0 && data.monthly.length > 0) setView('monthly'); setIsLoading(false); }); }, []);
    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-amber-400" /></div>;
    const activeList = history[view];
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center gap-4"><button onClick={() => setView('seasons')} className={cn("px-6 py-2 rounded-full font-bold text-sm transition-all", view === 'seasons' ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-white/5 text-slate-400 hover:text-white")}>🏆 Sezon Finalleri</button><button onClick={() => setView('monthly')} className={cn("px-6 py-2 rounded-full font-bold text-sm transition-all", view === 'monthly' ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]" : "bg-white/5 text-slate-400 hover:text-white")}>📅 Aylık Şampiyonlar</button></div>
            {activeList.length === 0 ? <div className="text-center py-20 text-slate-500 border border-dashed border-white/10 rounded-3xl">Henüz kayıt yok.</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">{activeList.map((period, idx) => (<HallOfFameCard key={idx} period={period} />))}</div>}
        </div>
    );
}

// --- ANA SAYFA ---
export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState("current");
    const { user, loading } = useAuth();
    const [settings, setSettings] = useState({ seasonName: "Liderlik Tablosu", holidayMode: false, holidayMessage: "", rewards: { first: 0, second: 0, third: 0 }, seasonStartDate: null, seasonEndDate: null });
    const [settingsLoading, setSettingsLoading] = useState(true);

    const fetchSettings = useCallback(() => {
        getLeaderboardSettings().then(data => {
            if (data) setSettings({ seasonName: data.seasonName || "Liderlik Tablosu", holidayMode: data.holidayMode || false, holidayMessage: data.holidayMessage || "", rewards: data.rewards || { first: 0, second: 0, third: 0 }, seasonStartDate: data.seasonStartDate || null, seasonEndDate: data.seasonEndDate || null });
            setSettingsLoading(false);
        });
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    if (loading || settingsLoading) return <div className="flex h-screen items-center justify-center bg-[#0f0720]"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>;
    
    return (
        <div className="flex flex-col min-h-screen bg-[#0f0720] text-white font-sans selection:bg-indigo-500/30">
            <div className="fixed inset-0 pointer-events-none overflow-hidden"><div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" /><div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" /></div>

            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f0720]/80 backdrop-blur-xl">
                <div className="container flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center justify-center gap-2 group">
                        <div className="bg-indigo-600/20 p-1.5 rounded-lg group-hover:bg-indigo-600/30 transition-colors"><BookOpenCheck className="h-5 w-5 text-indigo-400" /></div>
                        <span className="text-lg font-bold tracking-tight text-white">Değerler Oyunu</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        {user?.role === 'superadmin' && <AdminSettingsDialog onSettingsChange={fetchSettings} />}
                        {!user && <Button asChild size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0"><Link href="/login"><LogIn className="mr-2 h-4 w-4"/> Giriş Yap</Link></Button>}
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 relative z-10 pb-24 md:pb-8">
                <SeasonInfoWidget settings={settings} />
                <AnnouncementsWidget />
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-5xl mx-auto">
                    <div className="flex justify-center mb-10">
                        <TabsList className="bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 h-auto gap-2 shadow-2xl backdrop-blur-md">
                            <TabsTrigger value="current" className="px-6 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all text-slate-400"><List className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Genel Sıralama</span><span className="sm:hidden">Sıralama</span></TabsTrigger>
                            <TabsTrigger value="classes" className="px-6 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all text-slate-400"><Users className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Okul & Sınıf Ligi</span><span className="sm:hidden">Ligler</span></TabsTrigger>
                            <TabsTrigger value="hall-of-fame" className="px-6 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white transition-all text-slate-400"><Trophy className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Şeref Kürsüsü</span><span className="sm:hidden">Kürsü</span></TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="current" className="mt-0"><CurrentLeaderboardTab /></TabsContent>
                    <TabsContent value="classes" className="mt-0"><ClassLeaderboardTab /></TabsContent>
                    <TabsContent value="hall-of-fame" className="mt-0"><HallOfFameTab /></TabsContent>
                </Tabs>
            </main>
        </div>
    );
}