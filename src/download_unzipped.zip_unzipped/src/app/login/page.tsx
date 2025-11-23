
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Info } from 'lucide-react';
import { normalizeNameToEmailLocalPart } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttemptFailed, setLoginAttemptFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const displayNameInput = (formData.get('display-name') as string).trim();
    const password = formData.get('password') as string;

    if (!displayNameInput || !password) {
        toast({ title: "Eksik Bilgi", description: "Lütfen tüm alanları doldurun.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
        const usersQuery = query(collection(db, 'users'), where("displayName", "==", displayNameInput));
        const querySnapshot = await getDocs(usersQuery);

        if (querySnapshot.empty) {
            toast({ title: "Giriş Hatası", description: "Ad Soyad veya şifre hatalı.", variant: "destructive" });
            setLoginAttemptFailed(true);
            setIsLoading(false);
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserProfile;

        if (!userData.email) {
            toast({ title: "Giriş Hatası", description: "Bu kullanıcı için bir e-posta adresi kayıtlı değil.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, userData.email, password);
            toast({
                title: "Giriş Başarılı!",
                description: "Panele yönlendiriliyorsunuz...",
             });

             if (userData.role === 'teacher' || userData.role === 'superadmin') {
                router.push('/');
             } else {
                router.push('/student');
             }

        } catch (error: any) {
             if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                 toast({ title: "Giriş Hatası", description: "Ad Soyad veya şifre hatalı.", variant: "destructive" });
                 setLoginAttemptFailed(true);
             } else {
                 toast({ title: "Giriş Hatası", description: error.message || "Giriş sırasında bilinmeyen bir hata oluştu.", variant: "destructive" });
             }
        }

    } catch (error) {
        console.error("Login process error (Firestore lookup):", error);
        toast({ title: "Beklenmedik Hata", description: "Giriş sırasında bir sorun oluştu. Lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-blue-700 to-rose-500">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Giriş Yap</CardTitle>
          <CardDescription>Hesabınıza erişmek için bilgilerinizi girin</CardDescription>
        </CardHeader>
        <CardContent>
          {loginAttemptFailed && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Giriş İpucu</AlertTitle>
              <AlertDescription>
                  Kullanıcı adınızı hatalı girmiş olabilirsiniz. Lütfen liderlik tablosundan adınızı kontrol edip tekrar deneyiniz.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="display-name">Ad Soyad</Label>
              <Input id="display-name" name="display-name" type="text" placeholder="Adınız ve Soyadınız" />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Şifre</Label>
              </div>
              <Input id="password" name="password" type="password" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Giriş Yap
            </Button>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/">Ana Sayfaya Dön</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
