'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { OyunKurulum } from '@/components/oyun-kurulum';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 

function OzetlerPage() {
    const { user } = useAuth();
    
    // Öğrencinin sınıf adını tutacağımız state (Örn: "4. Sınıf")
    const [studentClassName, setStudentClassName] = useState<string | null>(null);
    const [isFetchingData, setIsFetchingData] = useState(true);

    useEffect(() => {
        if (!user || !user.uid) {
            if (user === null) setIsFetchingData(false); 
            return;
        }

        const fetchUserProfile = async () => {
            try {
                const userDocRef = doc(db, 'users', user.uid); 
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    // İŞTE BURASI! Senin attığın Backend kodundaki mantığın aynısı:
                    // Veritabanından gelen "4. Sınıf - A" verisini "4. Sınıf" olarak bölüyoruz.
                    const className = data.class?.split(' - ')[0];
                    
                    setStudentClassName(className || null);
                }
            } catch (error) {
                console.error("Öğrenci profili çekilirken hata:", error);
            } finally {
                setIsFetchingData(false);
            }
        };

        fetchUserProfile();
    }, [user]);

    if (user === undefined || isFetchingData) {
        return (
            <div className="flex flex-col h-[50vh] w-full items-center justify-center gap-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
                </div>
                <p className="text-cyan-200 text-sm font-medium animate-pulse">Öğrenci bilgileri yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="pb-20 md:pb-0">
            <OyunKurulum 
                pageTitle="Konu Özetleri"
                pageIcon={BookOpen}
                targetPath="student/ozetler"
                dataType="ozetler"
                isStatic={true} 
                studentClassId={studentClassName} // Ayrıştırdığımız sınıfı gönderiyoruz
            />
        </div>
    );
}

export default function OzetlerSuspense() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-[#0f172a]">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
        }>
            <OzetlerPage />
        </Suspense>
    );
}