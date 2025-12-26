"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { Loader2, Zap } from "lucide-react";
import { useEffect } from 'react';
import Link from 'next/link';

// This page now only serves to redirect users. 
// The main dashboard logic has been consolidated into the root `src/app/page.tsx`.
export default function TeacherDashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Yönlendirme mantığını useEffect içine almak best-practice'dir (Render sırasında state update uyarısını önler)
  useEffect(() => {
    if (!loading) {
      if (user) {
        // Yönlendirmeyi /teacher yerine ana dizine yap
        router.replace('/');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Yükleme Ekranı Tasarımı (Cyber/Dark Tema)
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Arka Plan Efektleri */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo / İkon Alanı */}
          <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500" />
              <div className="relative bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl">
                  <Zap className="h-12 w-12 text-cyan-400 fill-cyan-400/20" />
              </div>
              
              {/* Dönen Loader Halkası */}
              <div className="absolute -inset-4 border-2 border-transparent border-t-cyan-500/50 border-r-indigo-500/50 rounded-full animate-spin [animation-duration:2s]" />
          </div>

          {/* Metin Alanı */}
          <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">
                  Değerler Oyunu
              </h2>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-bold tracking-widest uppercase">Yönlendiriliyor...</span>
              </div>
          </div>
      </div>
    </div>
  );
}
