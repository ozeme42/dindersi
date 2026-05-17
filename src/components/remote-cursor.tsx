'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

export function RemoteCursor() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Record<string, { x: number, y: number, name: string }>>({});

  useEffect(() => {
    if (!user) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Sadece öğretmenler ve adminler imleç yayınlayabilir
      if (user.role === 'teacher' || user.role === 'superadmin') {
        const posRef = doc(db, 'remote_cursors', user.uid);
        setDoc(posRef, {
          x: (e.clientX / window.innerWidth) * 100,
          y: (e.clientY / window.innerHeight) * 100,
          name: user.displayName || 'Öğretmen',
          updatedAt: serverTimestamp(),
          active: true
        }, { merge: true });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Tüm aktif uzak imleçleri dinle
    const cursorsRef = collection(db, 'remote_cursors');
    const unsubscribe = onSnapshot(cursorsRef, (snapshot) => {
      const newPositions: any = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Mevcut kullanıcıyı ve aktif olmayanları gösterme
        if (doc.id !== user.uid && data.active) {
            newPositions[doc.id] = data;
        }
      });
      setPositions(newPositions);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      unsubscribe();
      // Çıkışta aktiflik durumunu kapat
      if (user.role === 'teacher' || user.role === 'superadmin') {
          setDoc(doc(db, 'remote_cursors', user.uid), { active: false }, { merge: true });
      }
    };
  }, [user]);

  if (!user) return null;

  return (
    <>
      {Object.entries(positions).map(([id, pos]) => (
        <div
          key={id}
          className="fixed pointer-events-none z-[9999] flex flex-col items-center transition-all duration-100 ease-out"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-5 h-5 bg-red-600 rounded-full shadow-[0_0_15px_red] animate-pulse border-2 border-white" />
          <span className="bg-red-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full mt-1 font-black whitespace-nowrap shadow-lg">
            {pos.name}
          </span>
        </div>
      ))}
    </>
  );
}
