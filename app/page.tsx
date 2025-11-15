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
          <div className="mt-8 flex justify-center">
            <a
              href="https://discord.gg/yqQFDqRXvr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:bg-[#4752C4] hover:shadow-xl"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Our Discord
            </a>
          </div>
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
        <section id="doctrines">
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
