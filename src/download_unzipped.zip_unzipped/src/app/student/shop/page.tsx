
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { SHOP_ITEMS } from '@/lib/shop-config';
import type { ShopItem, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Gem, CheckCircle2, Package, Check, Sparkles, Frame, Award, ArrowLeft } from 'lucide-react';
import { purchaseItem, equipItem } from './actions';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/user-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function ItemCard({ item, user, onPurchase, onEquip }: { 
    item: ShopItem, 
    user: UserProfile, 
    onPurchase: (itemId: string, price: number) => Promise<void>,
    onEquip: (itemId: string, itemType: 'avatarFrame' | 'avatarBadge', assetUrl: string | null) => Promise<void> 
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
      await onEquip(item.id, item.type, item.assetUrl || item.id);
      setIsEquipping(false);
  }

  const BadgeIcon = item.component;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center p-2 bg-muted">
            {item.type === 'avatarFrame' ? (
                 <div className="w-full h-full bg-background rounded-full" style={{ background: item.assetUrl }}/>
            ) : (
                BadgeIcon && <BadgeIcon className="w-16 h-16"/>
            )}
         </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-center">
        <CardTitle>{item.name}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary">
            <Gem className="h-5 w-5"/>
            <span>{item.price.toLocaleString()}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {alreadyOwned ? (
             <Button className="w-full" onClick={handleEquip} disabled={isEquipping || isEquipped}>
                {isEquipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isEquipped ? <CheckCircle2 className="mr-2 h-4 w-4"/> : <Package className="mr-2 h-4 w-4"/>}
                {isEquipped ? 'Kuşanıldı' : 'Kuşan'}
            </Button>
        ) : (
            <Button className="w-full" onClick={handlePurchase} disabled={isPurchasing || !hasEnoughPoints}>
                {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Satın Al
            </Button>
        )}
      </CardFooter>
    </Card>
  )
}

const UnequipCard = ({ type, onEquip, user }: { type: 'avatarFrame' | 'avatarBadge', onEquip: (itemType: 'avatarFrame' | 'avatarBadge', assetUrl: string | null) => Promise<void>, user: UserProfile }) => {
    const isFrame = type === 'avatarFrame';
    const isNothingEquipped = isFrame ? !user.equippedFrameUrl : !user.equippedBadgeId;
    const [isEquipping, setIsEquipping] = useState(false);

    const handleUnequip = async () => {
        setIsEquipping(true);
        await onEquip(type, null);
        setIsEquipping(false);
    }

    return (
        <Card className={cn(isNothingEquipped && "ring-2 ring-primary")}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-4 h-full">
                <div className="w-24 h-24 rounded-full border-dashed border-2 flex items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">{isFrame ? 'Çerçeve Yok' : 'Rozet Yok'}</p>
                </div>
                <h3 className="font-semibold text-sm">Varsayılan</h3>
                <Button className="w-full mt-auto" variant="secondary" onClick={handleUnequip} disabled={isEquipping || isNothingEquipped}>
                    {isEquipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : isNothingEquipped ? <><Check className="mr-2 h-4 w-4"/>Kuşanıldı</> : "Kuşan"}
                </Button>
            </CardContent>
        </Card>
    );
};


export default function ShopPage() {
    const { user, loading } = useAuth();
    const { toast } = useToast();

    const handlePurchase = async (itemId: string, price: number) => {
        if (!user) {
            toast({ title: "Hata", description: "Satın alım için giriş yapmalısınız.", variant: "destructive" });
            return;
        }
        const result = await purchaseItem(user.uid, itemId, price);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Ürün başarıyla satın alındı." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };
    
    const handleEquip = async (itemId: string, itemType: 'avatarFrame' | 'avatarBadge', assetValue: string | null) => {
        if (!user) return;
        const result = await equipItem(user.uid, itemType, assetValue);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Yeni seçimin kuşanıldı." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    }

    if (loading || !user) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                     <Button asChild variant="outline" size="sm" className="mb-4">
                        <Link href="/student">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Panele Dön
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><ShoppingCart className="h-8 w-8"/> Dükkan & Envanter</h1>
                    <p className="text-muted-foreground">Kazandığın puanlarla profilini kişiselleştir.</p>
                </div>
                <Card className="p-4 flex items-center gap-4 shrink-0">
                    <UserAvatar user={user} className="h-12 w-12"/>
                    <div>
                        <p className="font-semibold text-lg">{user.displayName}</p>
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <Gem className="h-4 w-4 text-primary"/>
                            <span className="font-bold text-lg text-primary">{(user.score || 0).toLocaleString()}</span> Puan
                        </div>
                    </div>
                </Card>
            </div>
            
            <Tabs defaultValue="frames" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="frames"><Frame className="mr-2 h-4 w-4"/> Çerçeveler</TabsTrigger>
                    <TabsTrigger value="badges"><Award className="mr-2 h-4 w-4"/> Rozetler</TabsTrigger>
                </TabsList>
                <TabsContent value="frames" className="mt-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        <UnequipCard type="avatarFrame" onEquip={(type, val) => handleEquip('none-frame', type, val)} user={user} />
                        {SHOP_ITEMS.filter(item => item.type === 'avatarFrame').map(item => (
                            <ItemCard key={item.id} item={item} user={user} onPurchase={handlePurchase} onEquip={handleEquip} />
                        ))}
                    </div>
                </TabsContent>
                 <TabsContent value="badges" className="mt-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                         <UnequipCard type="avatarBadge" onEquip={(type, val) => handleEquip('none-badge', type, val)} user={user} />
                        {SHOP_ITEMS.filter(item => item.type === 'avatarBadge').map(item => (
                            <ItemCard key={item.id} item={item} user={user} onPurchase={handlePurchase} onEquip={handleEquip} />
                        ))}
                    </div>
                 </TabsContent>
            </Tabs>
        </div>
    );
}
