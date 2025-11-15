'use client';

import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { publicApi } from '@/lib/api/public';
import {
  Users,
  Target,
  Shield,
  Zap,
  TrendingUp,
  Heart,
  MessageCircle,
  Smile,
  DollarSign,
  UserPlus,
  Bomb
} from 'lucide-react';

export default function AboutPage() {
  // Fetch SRP configuration
  const {
    data: srpData,
    isLoading: srpLoading,
  } = useQuery({
    queryKey: ['public', 'srp-config'],
    queryFn: () => publicApi.getSRPConfig(),
  });

  const shipTypes = srpData?.ship_types || [];

  const reasons = [
    {
      icon: Users,
      title: 'Very Newbro Friendly',
      description: "It doesn't matter when you've started playing EVE. As soon as you can fly a cloaky ship you are welcome to join our fleets.",
    },
    {
      icon: TrendingUp,
      title: 'Broaden Your Horizons',
      description: 'Get information about all different types of play from mining and incursions to the best fits for solo fights.',
    },
    {
      icon: Target,
      title: 'Be More Than Just an F1 Monkey!',
      description: 'Take more responsibility with sebo bombers to help recons or fly a recon or hunter yourself.',
    },
    {
      icon: Shield,
      title: 'This Is Not a Corp or Alliance!',
      description: "There's no corp or alliance to join - you just have to X-up and come along.",
    },
    {
      icon: Bomb,
      title: 'Blow Up Shit!',
      description: 'Easy access to PVP and dank green killboards.',
    },
    {
      icon: Heart,
      title: "O'bombercare (SRP)",
      description: "Don't be afraid about losing your ship - we will give you ISK to completely or at least partially cover your loss. (If you're flying bomber/recon/hunter - others bring at your own risk)",
    },
    {
      icon: MessageCircle,
      title: 'No Politics and No Drama',
      description: 'One of the only permanent rules in Bombers Bar. Fly with who you want to and who you enjoy flying with!',
    },
    {
      icon: UserPlus,
      title: 'Networking / Making Friends',
      description: "Meet people from all over EVE and build connections beyond your alliance/corp boundaries. You're always welcome on BB comms to chill, ask questions, or try to start your own roam.",
    },
    {
      icon: Zap,
      title: 'Or Just Be an F1 Monkey!',
      description: 'SCREW RESPONSIBILITY. JUST ALIGN OUT, HIT F1, WATCH EXPLOSIONS, GG',
    },
    {
      icon: DollarSign,
      title: 'You Could Earn ISK While You Play',
      description: 'Hunters and FCs receive a portion of loot in fleets.',
    },
    {
      icon: Smile,
      title: 'Have Fun!',
      description: 'Come along and watch Netflix while you wait or join in chatting - do whatever will let you have fun.',
    },
  ];

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl mb-6">
            About Bombers Bar
          </h1>
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-8 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              The NPSI Community For Cloakies
            </h2>
            <p className="text-lg text-foreground-muted mb-4">
              The &quot;Not Purple Shoot It&quot; fleets allow cloaky enthusiasts from all over New Eden to come together in a fleet.
            </p>
            <div className="space-y-2 text-lg">
              <p className="font-semibold text-foreground">No corporations.</p>
              <p className="font-semibold text-foreground">No politics.</p>
              <p className="font-semibold text-foreground">Just pretty explosions and Green Killboards.</p>
            </div>
          </div>

          {/* Key Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href="https://discord.gg/yqQFDqRXvr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-[#4752C4] hover:shadow-xl"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </a>
            <a
              href="#fittings"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary/80 hover:shadow-xl"
            >
              Fittings
            </a>
            <a
              href="#obombercare"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary/80 hover:shadow-xl"
            >
              O&apos;bombercare (SRP)
            </a>
          </div>
        </div>

        {/* How to Join */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">How to Join a Fleet?</h2>
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">Join Our Channels</h3>
                  <p className="text-foreground-muted">
                    Join the in-game chat channel <span className="font-semibold text-foreground">&quot;BB: Bombers Bar&quot;</span>, the Discord channel linked above, and install TeamSpeak3 and bookmark the Bombers Bar TeamSpeak comms.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">Check Fleet Schedule</h3>
                  <p className="text-foreground-muted">
                    Check out time and date for the next fleet. Fleets are in the BB channel MOTD and will be listed in the announcements channel of the Discord. Consider having your ship fitted and ready in place well in advance of fleet start.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">X-Up and Join!</h3>
                  <p className="text-foreground-muted mb-4">
                    Bring your ship to the pre-announced staging system, and X up in the linked X-up channel when that channel gets linked as the scheduled fleet time approaches. Accept the fleet invite and you&apos;re in!
                  </p>
                  <div className="rounded-md bg-background-secondary p-4 text-sm text-foreground-muted">
                    <strong className="text-foreground">Note:</strong> Bombers Bar does not have a static staging system but it is recommended to have clones & ships ready in: <span className="font-semibold text-foreground">Jita, Amarr, and Thera</span> as well as other major trade hubs.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Fittings Section */}
        <section id="fittings" className="mb-16 scroll-mt-20">
          <Card className="p-6 text-center">
            <a
              href="/#doctrines"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary/80 hover:shadow-xl"
            >
              <Target className="h-5 w-5" />
              View Fleet Doctrines
            </a>
          </Card>
        </section>

        {/* Reasons to Join */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Reasons To Join Bombers Bar Fleets
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <Card key={index} className="p-6 hover:border-primary/50 transition-colors">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">{reason.title}</h3>
                  </div>
                  <p className="text-sm text-foreground-muted">{reason.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* O'bombercare (SRP) Section */}
        <section id="obombercare" className="mb-16 scroll-mt-20">
          <Card className="p-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
              O&apos;bombercare (Ship Replacement Program)
            </h2>
            <div className="mb-6">
              <p className="text-foreground-muted mb-6 text-center">
                O&apos;bombercare is our Ship Replacement Program (SRP) that reimburses pilots for ship losses during Bombers Bar fleets.
                Fly with confidence knowing your approved ships are covered!
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground mb-4">How to Submit for SRP</h3>
              <p className="text-foreground-muted">
                Send an EVE mail to <span className="font-semibold text-foreground">&quot;Bombers Bar SRP&quot;</span> with a link to your zKillboard or in-game loss mail.
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-xl font-bold text-foreground mb-4">SRP Payouts</h3>

              {srpLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(
                    shipTypes.reduce((acc, ship) => {
                      if (!acc[ship.group_name]) {
                        acc[ship.group_name] = [];
                      }
                      acc[ship.group_name].push(ship);
                      return acc;
                    }, {} as Record<string, typeof shipTypes>)
                  ).map(([groupName, ships]) => (
                    <div key={groupName} className="rounded-lg border border-border bg-surface p-4">
                      <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wider">
                        {groupName}
                      </h4>
                      <div className="space-y-2">
                        {ships.map((ship) => (
                          <div key={ship.type_name} className="text-xs">
                            <div className="flex justify-between items-start">
                              <span className="text-foreground-muted flex-1 mr-2">{ship.type_name}</span>
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-foreground whitespace-nowrap">
                                  {(ship.base_payout / 1000000).toFixed(0)}m
                                </span>
                                {ship.polarized_payout && (
                                  <span className="text-xs text-foreground-muted whitespace-nowrap">
                                    {(ship.polarized_payout / 1000000).toFixed(0)}m pol
                                  </span>
                                )}
                                {ship.fc_discretion && (
                                  <span className="text-xs text-foreground-muted italic">FC disc.</span>
                                )}
                              </div>
                            </div>
                            {ship.notes && (
                              <div className="text-xs text-foreground-muted italic mt-0.5">
                                * {ship.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Call to Action */}
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Fly?</h2>
          <p className="text-foreground-muted mb-6">
            Join our Discord, check out the fleet schedule, and get ready for some epic bombing runs!
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary/80 hover:shadow-xl"
          >
            View Upcoming Fleets
          </a>
        </div>
      </div>
    </PageContainer>
  );
}
