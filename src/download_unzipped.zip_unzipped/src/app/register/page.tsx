
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page immediately
    router.replace('/');
  }, [router]);

  // Render a loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
