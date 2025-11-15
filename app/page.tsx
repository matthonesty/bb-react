'use client';

import { useQuery } from '@tanstack/react-query';
import { Calendar, Target } from 'lucide-react';
import { publicApi } from '@/lib/api/public';
import { FleetCalendar } from '@/components/public/FleetCalendar';
import { DoctrinesDisplay } from '@/components/public/DoctrinesDisplay';
import { PageContainer } from '@/components/layout/PageContainer';

export default function Home() {
  // Fetch upcoming fleets
  const {
    data: fleetsData,
    isLoading: fleetsLoading,
    error: fleetsError,
  } = useQuery({
    queryKey: ['public', 'fleets'],
    queryFn: () => publicApi.getFleets({ limit: 10 }),
  });

  // Fetch active doctrines
  const {
    data: doctrinesData,
    isLoading: doctrinesLoading,
    error: doctrinesError,
  } = useQuery({
    queryKey: ['public', 'doctrines'],
    queryFn: () => publicApi.getDoctrines(),
  });

  const fleets = fleetsData?.fleets || [];
  const fleetTypes = doctrinesData?.fleet_types || [];

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Welcome to Bombers Bar
          </h1>
          <p className="mt-4 text-lg text-foreground-muted">
            EVE Online&apos;s premier NPSI stealth bomber community
          </p>
        </div>

        {/* Fleet Calendar Section */}
        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upcoming Fleets</h2>
              <p className="text-foreground-muted">
                Join our scheduled fleets and participate in epic battles
              </p>
            </div>
          </div>

          {fleetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : fleetsError ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-center text-destructive">
              Failed to load fleets
            </div>
          ) : (
            <FleetCalendar fleets={fleets} />
          )}
        </section>

        {/* Doctrines Section */}
        <section>
          <div className="mb-6 flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Fleet Doctrines</h2>
              <p className="text-foreground-muted">
                Browse our active ship fittings and fleet compositions
              </p>
            </div>
          </div>

          {doctrinesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : doctrinesError ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-center text-destructive">
              Failed to load doctrines
            </div>
          ) : (
            <DoctrinesDisplay fleetTypes={fleetTypes} />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
