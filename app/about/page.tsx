'use client';

import { useState } from 'react';
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
  Bomb,
  ChevronDown,
  ChevronRight,
  Mail,
  Info
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "There's a new channel and discord server?",
      answer: 'As of October 2023, Bombers Bar has moved to new services. The new in-game main channel is "BB: Bombers Bar" and the link to the new discord server can be found on the website homepage. You can leave the old main channel and discord if you\'re still in them as those will no longer be used or updated.',
    },
    {
      question: 'How to join us on TS?',
      answer: 'There is a fixed address and password in the "BB: Bombers Bar" channel that you should use to join our Teamspeak server. When you initially connect you will be in the "Main Lobby". From here you should be able to join the various public channels. When a fleet is starting and you x up, switch to the in-game Fleet chat window, in the MOTD you will see the relevant TS channel to use (usually BB Roam 1) together with new password.',
    },
    {
      question: 'What is an X-up?',
      answer: 'Simple, just type an "x" in a channel. An X-up channel for joining fleet will be linked in the main channel when fleet is starting and while fleet is still accepting members.',
    },
    {
      question: 'MOTD (Message Of The Day)',
      answer: 'In your fleet chat window have a look at the MOTD. Be sure to reload it often because info will change from time to time. The MOTD has important info such as; who is the fleet BLOPS, who is the FC and what staging system you should travel to. The BLOPS and FC pilots are two most important characters in fleet, you should put them in your WATCHLIST.',
    },
    {
      question: 'Fleet Types',
      answer: 'The general fleet types we run are; Whaling, Armada, Habakuk, Wolfpack and Bombing fleets. Each fleet type has different ship requirements and objectives.',
    },
    {
      question: 'To cloak or not to cloak?',
      answer: 'Once you arrive to the staging system, stay cloaked in system or dock at the station/citadel specified in the MOTD. YOU NEED TO BE CLOAKED when you warp to the BLOPS! If you warp uncloaked, you will uncloak all others in the fleet and put the whole fleet in danger.',
    },
    {
      question: 'Bridge is up!',
      answer: 'When the hunter finds a target they will light a covert cyno. Our BLOPS will lock on to that cyno and will open the bridge for our fleet. To take the bridge you need to; Keep at range 1000m to the BLOPS, when the blue vortex appears around BLOPS or the bridger says "bridge up!" you can right click the BLOPS pilot and use Jump to... the cyno system.',
    },
    {
      question: 'Finally! Jumping on target',
      answer: 'Once you jump on the target: First, ALIGN to some random celestial. Then, lock the target. And then, ALWAYS FIRST APPLY POINT or e-war before DPS. DO NOT start with torpedos before FC calls for it. BB fleet usually have 20,000-30,000 DPS and can melt down most targets quickly. Once we kill ship, lock the pod. E-WAR ONLY ON THE POD! DO NOT shoot torpedos at the pod.',
    },
    {
      question: 'Target killed, pod killed \\o/ hurray, now what?',
      answer: 'Congrats! Now warp to a random celestial if the FC calls for it and cloak on the way. Cloak while you warp off, NOT at the moment you arrive at the celestial. You just killed expensive ship and his friends will try to find you. Once cloaked and safe, wait for the BLOPS to jump in and call us all to warp to zero.',
    },
  ];

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
              href="/#doctrines"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary/80 hover:shadow-xl"
            >
              Fleet Doctrines
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

        {/* Reasons to Join */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Reasons To Join Bombers Bar Fleets
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <div
                  key={index}
                  className="group relative rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 mb-3">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{reason.title}</h3>
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed">{reason.description}</p>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </section>

        {/* O'bombercare (SRP) Section */}
        <section id="obombercare" className="mb-16 scroll-mt-20">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            O&apos;bombercare (Ship Replacement Program)
          </h2>

          {/* Description Card */}
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/20 p-3 shrink-0">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">We&apos;ve Got You Covered!</h3>
                <p className="text-foreground-muted leading-relaxed">
                  O&apos;bombercare is our Ship Replacement Program (SRP) that reimburses pilots for ship losses during Bombers Bar fleets.
                  Fly with confidence knowing your approved ships are covered!
                </p>
              </div>
            </div>
          </div>

          {/* How to Submit Card */}
          <div className="rounded-lg border border-border bg-surface p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3 shrink-0">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">How to Submit for SRP</h3>
                <p className="text-foreground-muted">
                  Send an EVE mail to <span className="font-semibold text-primary">&quot;Bombers Bar SRP&quot;</span> with a link to your zKillboard or in-game loss mail.
                </p>
              </div>
            </div>
          </div>

          {/* SRP Payouts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">SRP Payouts</h3>
            </div>

            {srpLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(
                  shipTypes.reduce((acc, ship) => {
                    if (!acc[ship.group_name]) {
                      acc[ship.group_name] = [];
                    }
                    acc[ship.group_name].push(ship);
                    return acc;
                  }, {} as Record<string, typeof shipTypes>)
                ).map(([groupName, ships]) => (
                  <div key={groupName} className="rounded-lg border border-border bg-surface p-5 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      <h4 className="font-bold text-foreground text-base uppercase tracking-wide">
                        {groupName}
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {ships.map((ship) => (
                        <div key={ship.type_name} className="pb-3 border-b border-border last:border-0 last:pb-0">
                          <div className="flex justify-between items-start gap-3 mb-1">
                            <span className="text-sm text-foreground font-medium flex-1">{ship.type_name}</span>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-bold text-primary text-sm whitespace-nowrap">
                                {(ship.base_payout / 1000000).toFixed(0)}M ISK
                              </span>
                              {ship.polarized_payout && (
                                <span className="text-xs text-foreground-muted whitespace-nowrap">
                                  {(ship.polarized_payout / 1000000).toFixed(0)}M pol
                                </span>
                              )}
                              {ship.fc_discretion && (
                                <span className="text-xs text-primary/70 italic">FC discretion</span>
                              )}
                            </div>
                          </div>
                          {ship.notes && (
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <Info className="h-3 w-3 text-foreground-muted shrink-0 mt-0.5" />
                              <p className="text-xs text-foreground-muted italic leading-relaxed">
                                {ship.notes}
                              </p>
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
        </section>

        {/* Video Resources */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Video Resources</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <a
              href="https://youtu.be/EHhOhUhEOAU"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Fleet Training</h3>
                    <p className="text-xs text-foreground-muted">Essential fleet mechanics and coordination</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/whw4B4AFwRA"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Pre-Fleet Rules &amp; Instructions</h3>
                    <p className="text-xs text-foreground-muted">What you need to know before joining</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/44dWsAbOKw4"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">How to take a BLOPS bridge</h3>
                    <p className="text-xs text-foreground-muted">Black Ops bridging mechanics</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/FRiSiD4egXc"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Newbro speech</h3>
                    <p className="text-xs text-foreground-muted">Welcome and getting started guide</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/SxUS_aAmrF0"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">How to bomb</h3>
                    <p className="text-xs text-foreground-muted">Bombing mechanics and techniques</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/PYdwWx1Zr8I"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">How to warp off after bombing</h3>
                    <p className="text-xs text-foreground-muted">Escape tactics post-bombing run</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/mCLWEA_15Z8"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Hunter training</h3>
                    <p className="text-xs text-foreground-muted">Advanced hunting techniques</p>
                  </div>
                </div>
              </Card>
            </a>

            <a
              href="https://youtu.be/D5jkmquoQJA"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="p-4 h-full transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-red-500/10 p-2 shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Recon Training</h3>
                    <p className="text-xs text-foreground-muted">Reconnaissance ship operations</p>
                  </div>
                </div>
              </Card>
            </a>
          </div>
        </section>

        {/* Terminology */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Common Terminology</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">BB</span>
              </div>
              <p className="text-sm text-foreground-muted">Bombers Bar</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">X up</span>
              </div>
              <p className="text-sm text-foreground-muted">Sign up for a fleet / add your ship to the spreadsheet</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">SB</span>
              </div>
              <p className="text-sm text-foreground-muted">Stealth Bomber</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Cov Ops</span>
              </div>
              <p className="text-sm text-foreground-muted">Covert Ops cloak</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">7o</span>
              </div>
              <p className="text-sm text-foreground-muted">Greeting</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Pew</span>
              </div>
              <p className="text-sm text-foreground-muted">Shooting ships</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Dank / Gucci / GF</span>
              </div>
              <p className="text-sm text-foreground-muted">Positive adjectives, good fight</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Gate Cloak</span>
              </div>
              <p className="text-sm text-foreground-muted">Cloak you get when jumping through a gate</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Prop Mod</span>
              </div>
              <p className="text-sm text-foreground-muted">Afterburner or Microwarpdrive</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Sebo / Sebos</span>
              </div>
              <p className="text-sm text-foreground-muted">Sensor Booster</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Point / Scram</span>
              </div>
              <p className="text-sm text-foreground-muted">Warp disruptor / warp scrambler</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Web / Webs</span>
              </div>
              <p className="text-sm text-foreground-muted">Stasis Webifier</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Align</span>
              </div>
              <p className="text-sm text-foreground-muted">Get into warp alignment without activating warp drive</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Anchor</span>
              </div>
              <p className="text-sm text-foreground-muted">Get close to a specific person</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Broadcast</span>
              </div>
              <p className="text-sm text-foreground-muted">Send a message to the fleet via the fleet interface</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Cyno</span>
              </div>
              <p className="text-sm text-foreground-muted">Cynosural Field Generator</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">GTFO</span>
              </div>
              <p className="text-sm text-foreground-muted">Warp out immediately</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Heat / Overheat</span>
              </div>
              <p className="text-sm text-foreground-muted">Use modules on overheat</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Hold Cloak</span>
              </div>
              <p className="text-sm text-foreground-muted">Use your natural 60 second cloak when jumping gates/wormholes</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">NPSI</span>
              </div>
              <p className="text-sm text-foreground-muted">Not Purple Shoot It (anyone without excellent standings is fair game)</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Ping</span>
              </div>
              <p className="text-sm text-foreground-muted">Message sent out to all BB channel members</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Primary</span>
              </div>
              <p className="text-sm text-foreground-muted">The target you&apos;re supposed to shoot first</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Recon</span>
              </div>
              <p className="text-sm text-foreground-muted">Recon ship - Force Recon or Combat Recon</p>
            </div>

            <div className="group rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-sm font-bold">Warp to me</span>
              </div>
              <p className="text-sm text-foreground-muted">Warp to the person talking</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-border rounded-lg overflow-hidden bg-surface">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-secondary"
                >
                  <h3 className="text-sm font-semibold text-foreground pr-4">{faq.question}</h3>
                  {openFaqIndex === index ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-foreground-muted" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className="border-t border-border bg-background-dark px-4 py-3">
                    <p className="text-sm text-foreground-muted leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
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
