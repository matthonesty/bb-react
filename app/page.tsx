'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Shield, Users, Rocket, Target } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isAuthenticated, isLoading, login } = useAuth();

  // Redirect to SRP page if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      window.location.href = '/srp';
    }
  }, [isAuthenticated, isLoading]);

  // Only show loading if we're authenticated (brief redirect loading)
  if (isLoading && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show nothing (about to redirect)
  if (isAuthenticated) {
    return null;
  }

  // Show landing page for unauthenticated users

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary">
            <span className="text-4xl font-bold text-white">BB</span>
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-4">
          Welcome to Bombers Bar
        </h1>
        <p className="text-xl text-foreground-muted max-w-2xl mx-auto mb-8">
          Elite bomber fleet operations in EVE Online. Join us for coordinated
          attacks, ship replacement programs, and more.
        </p>
        <Button size="lg" onClick={login}>
          Login with EVE Online
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <Card variant="bordered">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">SRP</h3>
              <p className="text-sm text-foreground-muted">
                Ship Replacement Program to cover your losses
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Fleet Ops</h3>
              <p className="text-sm text-foreground-muted">
                Organized fleet operations with experienced FCs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Doctrines</h3>
              <p className="text-sm text-foreground-muted">
                Optimized bomber fits and fleet compositions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Intel</h3>
              <p className="text-sm text-foreground-muted">
                Bombing run intelligence and target tracking
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <Card variant="bordered" padding="lg">
        <CardHeader>
          <CardTitle>About Bombers Bar</CardTitle>
          <CardDescription>
            Your premier stealth bomber community in EVE Online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none">
            <p className="text-foreground-muted">
              Bombers Bar is a public NPSI (Not Purple Shoot It) community focused on
              stealth bomber fleet operations in EVE Online. We run regular fleets
              targeting high-value targets across New Eden.
            </p>
            <p className="text-foreground-muted mt-4">
              Our Ship Replacement Program (SRP) ensures that pilots who follow
              doctrine and FC commands will have their losses covered. Join us for
              exciting bombing runs and coordinated attacks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
