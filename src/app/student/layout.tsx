'use client';
import { AuthGuard } from '@/components/auth-guard';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard role="student">
            <div className="flex flex-col min-h-screen">
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </AuthGuard>
    )
}
