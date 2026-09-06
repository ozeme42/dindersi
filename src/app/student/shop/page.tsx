
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { SHOP_ITEMS } from '@/lib/shop-config';
import type { ShopItem, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Gem, CheckCircle2, Package, Frame, Award, ArrowLeft, XCircle } from 'lucide-react';
import { purchaseItem, equipItem } from './actions';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/user-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { playSound } from '@/lib/audio-service';

// --- ÜRÜN KARTI BİLEŞENİ ---
function ItemCard({ item, user, onPurchase, onEquip }: { 
    item: ShopItem, 
    user: any, 
    onPurchase: (itemId: string, price: number) => Promise<void>,
    onEquip: (item: ShopItem) => Promise<void> 
}) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);

  const hasEnoughPoints = (user.score || 0) >= item.price;
  const alreadyOwned = user.ownedItems?.includes(item.id);

  const isEquipped = item.type === 'avatarFrame' 
    ? user.equippedFrameUrl === item.assetUrl
    : user.equippedBadgeId === item.id;

  const handlePurchase = async () => {
    setIsPurchasing(true);
    await onPurchase(item.id, item.price);
    setIsPurchasing(false);
  }
  
  const handleEquip = async () => {
      setIsEquipping(true);
      await onEquip(item);
      setIsEquipping(false);
  }

  const BadgeIcon = item.component;

  return (
    <div className={cn(
        "group relative bg-[#0e0c26]/70 backdrop-blur-xl border rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 flex flex-col h-full shadow-lg",
        isEquipped 
            ? "border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30" 
            : alreadyOwned 
                ? "border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-cyan-900/30" 
                : "border-white/10 hover:border-white/25 hover:shadow-indigo-950/40"
    )}>
      
      {/* Glow Hover Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* İkon / Görsel Alanı */}
      <div className="relative h-36 bg-[#08061a]/80 flex items-center justify-center border-b border-white/5 shrink-0 overflow-hidden">
         <div className={cn(
             "absolute w-24 h-24 rounded-full blur-2xl transition-all duration-500",
             isEquipped ? "bg-emerald-500/25" : "bg-cyan-500/15 group-hover:bg-cyan-400/25 group-hover:scale-125"
         )} />
         
         <div className="relative z-10 transition-transform duration-300 group-hover:scale-110">
            {item.type === 'avatarFrame' ? (
                <div className="w-20 h-20 rounded-full bg-slate-900 border-4 border-slate-700/80 relative overflow-hidden shadow-2xl">
                     <div className="absolute inset-0" style={{ background: item.assetUrl }} />
                     <div className="w-full h-full bg-slate-900/50" /> 
                </div>
            ) : (
                BadgeIcon ? <BadgeIcon className="w-16 h-16 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]" /> : <Award className="w-16 h-16 text-white" />
            )}
         </div>

         {/* Durum Rozeti */}
         {isEquipped ? (
             <div className="absolute top-3 left-3 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                 <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                 <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">Aktif Kuşanıldı</span>
             </div>
         ) : alreadyOwned ? (
             <div className="absolute top-3 left-3 bg-cyan-500/20 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                 <Package className="w-3 h-3 text-cyan-400" />
                 <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">Envanterde</span>
             </div>
         ) : null}

         {!alreadyOwned && (
             <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-yellow-500/40 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-lg">
                 <Gem className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                 <span className="text-xs font-black font-mono text-yellow-200">{item.price.toLocaleString()}</span>
             </div>
         )}
      </div>

      {/* İçerik */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
            <h3 className="font-black text-white text-lg mb-1 group-hover:text-cyan-300 transition-colors line-clamp-1 tracking-tight" title={item.name}>{item.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 min-h-[2.5rem] font-medium">{item.description}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
            {alreadyOwned ? (
                <Button 
                    onClick={handleEquip} 
                    disabled={isEquipping || isEquipped}
                    className={cn(
                        "w-full h-11 font-black rounded-xl transition-all",
                        isEquipped 
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/25 cursor-default opacity-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "bg-white/10 text-white hover:bg-cyan-600 hover:text-white border border-white/10 hover:border-cyan-500/50"
                    )}
                >
                    {isEquipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isEquipped ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400"/> : <Package className="mr-2 h-4 w-4"/>}
                    {isEquipped ? 'Kuşanıldı' : 'Hemen Kuşan'}
                </Button>
            ) : (
                <Button 
                    onClick={handlePurchase} 
                    disabled={isPurchasing || !hasEnoughPoints}
                    className={cn(
                        "w-full h-11 font-black rounded-xl transition-all shadow-lg",
                        hasEnoughPoints 
                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-yellow-500/20 hover:scale-[1.02]" 
                            : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
                    )}
                >
                    {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    {hasEnoughPoints ? 'Satın Al' : 'Yetersiz XP'}
                </Button>
            )}
        </div>
      </div>
    </div>
  )
}

// --- VARSAYILAN (ÇIKAR) KARTI ---
const UnequipCard = ({ type, onUnequip, user }: { 
    type: 'avatarFrame' | 'avatarBadge', 
    onUnequip: (type: 'avatarFrame' | 'avatarBadge') => Promise<void>, 
    user: any 
}) => {
    const isFrame = type === 'avatarFrame';
    const isNothingEquipped = isFrame ? !user.equippedFrameUrl : !user.equippedBadgeId;
    const [isEquipping, setIsEquipping] = useState(false);

    const handleUnequip = async () => {
        setIsEquipping(true);
        await onUnequip(type);
        setIsEquipping(false);
    }

    return (
        <div className={cn(
            "group relative bg-[#0e0c26]/50 border-2 border-dashed rounded-3xl overflow-hidden transition-all duration-300 flex flex-col h-full",
            isNothingEquipped ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "border-white/10 hover:border-white/30"
        )}>
            <div className="relative h-36 flex items-center justify-center border-b border-white/5 bg-[#08061a]/60 shrink-0">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {isFrame ? <Frame className="w-8 h-8 text-slate-500" /> : <Award className="w-8 h-8 text-slate-500" />}
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow text-center justify-between">
                <div>
                    <h3 className="font-black text-slate-200 text-lg mb-1 tracking-tight">Varsayılan</h3>
                    <p className="text-xs text-slate-400 font-medium">{isFrame ? 'Varsayılan çerçeveye dön' : 'Rozeti kaldır'}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/5">
                     <Button 
                        onClick={handleUnequip} 
                        disabled={isEquipping || isNothingEquipped}
                        variant="secondary"
                        className={cn(
                            "w-full h-11 font-black rounded-xl transition-all",
                            isNothingEquipped ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default opacity-100" : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
                        )}
                    >
                        {isEquipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isNothingEquipped ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400"/> : <XCircle className="mr-2 h-4 w-4" />}
                        {isNothingEquipped ? 'Varsayılan Aktif' : 'Çıkar'}
                    </Button>
                </div>
            </div>
        </div>
    );
};


export default function ShopPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // Satın Alma
    const handlePurchase = async (itemId: string, price: number) => {
        if (!user) {
            toast({ title: "Hata", description: "Satın alım için giriş yapmalısınız.", variant: "destructive" });
            return;
        }
        const result = await purchaseItem(user.uid, itemId, price);
        if (result.success) {
            playSound('win');
            toast({ title: "Başarılı!", description: "Ürün başarıyla satın alındı." });
            // The onSnapshot listener in useAuth will handle the UI update.
        } else {
            playSound('incorrect');
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };
    
    // Kuşanma
    const handleEquip = async (item: ShopItem) => {
        if (!user) return;
        
        const assetValue = item.type === 'avatarFrame' ? item.assetUrl : item.id;
        const result = await equipItem(user.uid, item.type, assetValue || null);
        if (result.success) {
            playSound('pop');
            toast({ title: "Başarılı!", description: "Seçiminiz güncellendi." });
        } else {
            playSound('incorrect');
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }
    
    // Çıkarma
    const handleUnequip = async (type: 'avatarFrame' | 'avatarBadge') => {
        if (!user) return;
        const result = await equipItem(user.uid, type, null);
         if (result.success) {
            playSound('pop');
            toast({ title: "Başarılı!", description: "Eşya çıkarıldı." });
        } else {
            playSound('incorrect');
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }

    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>
    }

    return (
        <div className="min-h-screen bg-[#050314] pb-24 md:pb-12 text-slate-100 relative overflow-hidden font-sans">
            
            {/* Cosmic Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/15 rounded-full blur-[140px]" />
                <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                
                {/* HERO BANNER & STATS */}
                <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-2xl p-6 md:p-8 mb-8 shadow-2xl">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
                    
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl group">
                                    <Link href="/student" className="flex items-center gap-1.5 text-xs font-bold">
                                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                        Öğrenci Paneli
                                    </Link>
                                </Button>
                                <span className="text-slate-600">/</span>
                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Kozmik Mağaza</span>
                            </div>
                            
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3.5">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 shrink-0">
                                    <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                </div>
                                <span>Kozmik <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">Market</span></span>
                            </h1>
                            <p className="text-slate-300/80 text-sm md:text-base mt-2 max-w-xl leading-relaxed font-medium">
                                Kazandığın puanlarla benzersiz avatar çerçeveleri ve rozetler kuşan, profilinle sınıfta ve liderlik tablosunda fark yarat!
                            </p>
                        </div>

                        {/* Canlı İstatistikler & Kullanıcı Kartı */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                            {/* Bakiye Kartı */}
                            <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-yellow-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center gap-3.5 min-w-[170px]">
                                <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                                    <Gem className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400/90 block">Kullanılabilir Bakiye</span>
                                    <span className="text-xl md:text-2xl font-black text-white font-mono leading-none">{(user.score || 0).toLocaleString()}</span>
                                    <span className="text-[10px] font-bold text-yellow-300 ml-1">XP</span>
                                </div>
                            </div>

                            {/* Profil Kartı */}
                            <div className="flex-1 sm:flex-none bg-[#0e0c26]/90 border border-white/10 rounded-2xl p-3.5 shadow-xl backdrop-blur-xl flex items-center gap-3 min-w-[200px]">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full blur opacity-60" />
                                    <UserAvatar user={user} className="w-12 h-12 border-2 border-slate-800 relative z-10" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-black text-white text-sm truncate leading-tight">{user.displayName}</p>
                                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                                        {user.ownedItems?.length || 0} Eşyaya Sahip
                                    </p>
                                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        {user.equippedBadgeId || user.equippedFrameUrl ? 'Özelleştirildi' : 'Standart'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* SEKME SEÇİCİ VE ÜRÜN IZGARASI */}
                <Tabs defaultValue="frames" className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <TabsList className="bg-[#0e0c26]/90 border border-white/10 p-1.5 rounded-2xl h-auto inline-flex shadow-xl backdrop-blur-xl self-start">
                            <TabsTrigger 
                                value="frames" 
                                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-slate-400 px-6 py-3 rounded-xl transition-all font-black text-sm flex items-center gap-2.5"
                            >
                                <Frame className="w-4 h-4" /> 
                                <span>Çerçeveler</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 ml-1">
                                    {SHOP_ITEMS.filter(i => i.type === 'avatarFrame').length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="badges" 
                                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(139,92,246,0.4)] text-slate-400 px-6 py-3 rounded-xl transition-all font-black text-sm flex items-center gap-2.5"
                            >
                                <Award className="w-4 h-4" /> 
                                <span>Rozetler</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 ml-1">
                                    {SHOP_ITEMS.filter(i => i.type === 'avatarBadge').length}
                                </span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-2 px-1">
                            <Package className="w-4 h-4 text-cyan-400" />
                            <span>Kuşanılan öğe doğrudan liderlik tablosu ve profilinde görünür.</span>
                        </div>
                    </div>

                    <TabsContent value="frames" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <UnequipCard 
                                type="avatarFrame" 
                                onUnequip={handleUnequip}
                                user={user} 
                            />
                            {SHOP_ITEMS.filter(item => item.type === 'avatarFrame').map(item => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    user={user} 
                                    onPurchase={handlePurchase} 
                                    onEquip={handleEquip}
                                />
                            ))}
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="badges" className="animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <UnequipCard 
                                type="avatarBadge" 
                                onUnequip={handleUnequip}
                                user={user} 
                            />
                            {SHOP_ITEMS.filter(item => item.type === 'avatarBadge').map(item => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    user={user} 
                                    onPurchase={handlePurchase} 
                                    onEquip={handleEquip}
                                />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
