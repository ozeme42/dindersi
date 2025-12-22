// @/app/curriculum/layout.tsx
import React from 'react';
import { AppHeader } from '@/components/app-header';

export default function CurriculumLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-950">
            <AppHeader title="Genel Müfredat"/>
            <main>{children}</main>
        </div>
    );
}
