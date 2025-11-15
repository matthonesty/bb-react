'use client';

import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Bombers Bar" className="h-32 w-32" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Welcome to Bombers Bar
        </h1>
      </div>
    </div>
  );
}
