
'use client';

import { useState } from 'react';
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

// --- ÜRÜN KARTI BİLEŞENİ ---
function ItemCard({ item, user, onPurchase, onEquip }: { 
    item: ShopItem, 
    user: UserProfile, 
    onPurchase: (itemId: string, price: number) => Promise<void>,
    onEquip: (item: ShopItem, assetValue: string | null) => Promise<void> 
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
      const valueToUse = item.type === 'avatarFrame' ? item.assetUrl : item.id;
      await onEquip(item, valueToUse || item.id);
      setIsEquipping(false);
  }

  const BadgeIcon = item.component;

  return (
    <div className="group relative bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-900/20 flex flex-col h-full">
      
      {/* Parlama Efekti */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* İkon / Görsel Alanı */}
      <div className="relative h-32 bg-slate-950/50 flex items-center justify-center border-b border-white/5 shrink-0">
         <div className="absolute w-20 h-20 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-400/30 transition-colors" />
         
         <div className="relative z-10">
            {item.type === 'avatarFrame' ? (
                <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700 relative overflow-hidden shadow-lg">
                     <div className="absolute inset-0" style={{ background: item.assetUrl }} />
                     {/* Frame önizlemesi */}
                     <div className="w-full h-full bg-slate-800/50" /> 
                </div>
            ) : (
                BadgeIcon ? <BadgeIcon className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" /> : <Award className="w-16 h-16 text-white" />
            )}
         </div>

         {!alreadyOwned && (
             <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur border border-yellow-500/30 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                 <Gem className="w-3.5 h-3.5 text-yellow-400" />
                 <span className="text-xs font-bold text-white">{item.price.toLocaleString()}</span>
             </div>
         )}
      </div>

      {/* İçerik */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex-grow">
            <h3 className="font-bold text-white text-lg mb-1 group-hover:text-cyan-300 transition-colors line-clamp-1" title={item.name}>{item.name}</h3>
            <p className="text-sm text-slate-400 leading-snug line-clamp-2 min-h-[2.5rem]">{item.description}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
            {alreadyOwned ? (
                <Button 
                    onClick={handleEquip} 
                    disabled={isEquipping || isEquipped}
                    className={cn(
                        "w-full h-10 font-bold rounded-xl transition-all",
                        isEquipped 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 cursor-default opacity-100"
                            : "bg-slate-800 text-white hover:bg-cyan-600 hover:text-white"
                    )}
                >
                    {isEquipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isEquipped ? <CheckCircle2 className="mr-2 h-4 w-4"/> : <Package className="mr-2 h-4 w-4"/>}
                    {isEquipped ? 'Kuşanıldı' : 'Kuşan'}
                </Button>
            ) : (
                <Button 
                    onClick={handlePurchase} 
                    disabled={isPurchasing || !hasEnoughPoints}
                    className={cn(
                        "w-full h-10 font-bold rounded-xl transition-all shadow-lg",
                        hasEnoughPoints 
                            ? "bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-amber-900/20" 
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    )}
                >
                    {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    Satın Al
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
    user: UserProfile 
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
            "group relative bg-slate-900/40 border border-dashed border-slate-700 rounded-3xl overflow-hidden hover:border-slate-500 transition-all duration-300 flex flex-col h-full",
            isNothingEquipped && "border-emerald-500/50 bg-emerald-500/5"
        )}>
            <div className="relative h-32 flex items-center justify-center border-b border-white/5 bg-slate-950/30 shrink-0">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center">
                    {isFrame ? <Frame className="w-8 h-8 text-slate-600" /> : <Award className="w-8 h-8 text-slate-600" />}
                </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow text-center">
                <div className="flex-grow">
                    <h3 className="font-bold text-slate-300 text-lg mb-1">Varsayılan</h3>
                    <p className="text-sm text-slate-500">{isFrame ? 'Çerçeveyi Kaldır' : 'Rozeti Kaldır'}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/5">
                     <Button 
                        onClick={handleUnequip} 
                        disabled={isEquipping || isNothingEquipped}
                        variant="secondary"
                        className={cn(
                            "w-full h-10 font-bold rounded-xl",
                            isNothingEquipped ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-default opacity-100" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        )}
                    >
                        {isEquipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isNothingEquipped ? <CheckCircle2 className="mr-2 h-4 w-4"/> : <XCircle className="mr-2 h-4 w-4" />}
                        {isNothingEquipped ? 'Varsayılan' : 'Çıkar'}
                    </Button>
                </div>
            </div>
        </div>
    );
};


export default function ShopPage() {
    const { user, loading, force_refresh_user } = useAuth() as any;
    const { toast } = useToast();

    // Satın Alma
    const handlePurchase = async (itemId: string, price: number) => {
        if (!user) {
            toast({ title: "Hata", description: "Satın alım için giriş yapmalısınız.", variant: "destructive" });
            return;
        }
        const result = await purchaseItem(user.uid, itemId, price);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Ürün başarıyla satın alındı." });
            force_refresh_user();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };
    
    // Kuşanma
    const handleEquip = async (item: ShopItem, assetValue: string | null) => {
        if (!user) return;
        const result = await equipItem(user.uid, item.type, assetValue);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Seçiminiz güncellendi." });
            force_refresh_user();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }
    
    // Çıkarma
    const handleUnequip = async (type: 'avatarFrame' | 'avatarBadge') => {
        if (!user) return;
        const result = await equipItem(user.uid, type, null);
         if (result.success) {
            toast({ title: "Başarılı!", description: "Eşya çıkarıldı." });
            force_refresh_user();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }

    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-24 md:pb-12 text-slate-100 relative overflow-hidden">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
                
                {/* Üst Kısım */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="space-y-2">
                        <Button asChild variant="ghost" size="sm" className="pl-0 text-slate-400 hover:text-white hover:bg-transparent group">
                            <Link href="/student" className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Panele Dön
                            </Link>
                        </Button>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Market</span>
                        </h1>
                        <p className="text-slate-400 max-w-md">
                            Puanlarını harca, profilini özelleştir ve tarzını yansıt!
                        </p>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-full blur opacity-50" />
                            <UserAvatar user={user} className="w-14 h-14 border-2 border-slate-800 relative z-10" />
                        </div>
                        <div>
                            <p className="font-bold text-white text-lg leading-none mb-1">{user.displayName}</p>
                            <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-lg border border-yellow-500/20">
                                <Gem className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="font-mono font-bold text-yellow-100">{(user.score || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Sekmeler ve İçerik */}
                <Tabs defaultValue="frames" className="w-full">
                    
                    <div className="flex justify-center md:justify-start mb-8">
                        <TabsList className="bg-slate-900/80 border border-white/10 p-1 rounded-xl h-auto inline-flex">
                            <TabsTrigger 
                                value="frames" 
                                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-slate-400 px-6 py-2.5 rounded-lg transition-all flex items-center gap-2"
                            >
                                <Frame className="w-4 h-4" /> Çerçeveler
                            </TabsTrigger>
                            <TabsTrigger 
                                value="badges" 
                                className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400 text-slate-400 px-6 py-2.5 rounded-lg transition-all flex items-center gap-2"
                            >
                                <Award className="w-4 h-4" /> Rozetler
                            </TabsTrigger>
                        </TabsList>
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
