'use client';

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1">
        <AuthGuard role={["student", "teacher", "superadmin"]}>{children}</AuthGuard>
      </main>
    </div>
  );
}
