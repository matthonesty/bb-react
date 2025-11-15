'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "There's a new channel and discord server?",
      answer: (
        <>
          As of October 2023, Bombers Bar has moved to new services. The new in-game main channel is{' '}
          <strong>&quot;BB: Bombers Bar&quot;</strong> and the link to the new discord server can be found on the{' '}
          <a href="/" className="text-primary hover:underline">
            website homepage
          </a>
          . You can leave the old main channel and discord if you&apos;re still in them as those will no longer be
          used or updated.
        </>
      ),
    },
    {
      question: 'How to join us on TS?',
      answer: (
        <>
          There is a fixed address and password in the &quot;BB: Bombers Bar&quot; channel that you should use to
          join our Teamspeak server. When you initially connect you will be in the &quot;Main Lobby&quot;. From here
          you should be able to join the various public channels and hang out with your fellow cloaky space nerds.
          When a fleet is starting and you x up in the BB in-game channel, you are called into fleet. Switch to the
          in-game Fleet chat window, in the MOTD you will see the relevant TS channel to use (usually BB Roam 1)
          together with new password. Join us there!
        </>
      ),
    },
    {
      question: 'TS password is not working?',
      answer:
        "The FC has a lot to do and is probably a little behind. Move to the staging system and just put a reminder in the fleet chat window and your FC will update it shortly in the fleet MOTD.",
    },
    {
      question: 'What is an X-up?',
      answer:
        'Simple, just type an "x" in a channel. An X-up channel for joining fleet will be linked in the main channel when fleet is starting and while fleet is still accepting members. The FC might ask you to volunteer in the fleet channel for one reason or another, too.',
    },
    {
      question: 'My mic is offline',
      answer:
        "We don't like people having muted mic's. Offline mic's may be a clear signal to us that you are speaking in some other channel, to some other group… So expect to be asked to unmute your mic if caught.",
    },
    {
      question: 'MOTD (Message Of The Day)',
      answer: (
        <>
          In your fleet chat window have a look at the MOTD. Be sure to reload it often because info will change from
          time to time. Reload by left-clicking small donut icon on the top and clicking &quot;Reload MOTD&quot;. The
          MOTD has some important info such as; who is the fleet BLOPS (Black Ops ship that will bridge us to the
          target), who is the FC and what staging system you should travel to. The BLOPS and FC pilots are two most
          important characters in fleet, you should put them in your <strong>WATCHLIST</strong>. To do this; Rightclick
          the name of the BLOPS pilot, in that menu open pick &quot;Fleet&quot; then &quot;Add to Watchlist&quot;,
          repeat for the FC or anybody else you want keep an eye on. You can drag and drop them from the fleet chat
          window to watchlist also. Keep it as simple as possible and the BLOPS pilot should always be put on the top
          of the list.
        </>
      ),
    },
    {
      question: 'Fleet Types',
      answer: (
        <>
          The general fleet types we run are; Whaling, Armada, Habakuk, Wolfpack and Bombing fleets.{' '}
          <a href="/fleet-types" className="text-primary hover:underline">
            Click here to view the Fleet Types Page
          </a>{' '}
          which explains each fleet type in more detail.
        </>
      ),
    },
    {
      question: 'Overview that I should have?',
      answer: (
        <>
          There are many very good ones around. Usability depends on what you are doing in EVE. I will list a few here
          and you can take your pick:
          <ul className="mt-2 ml-6 list-disc space-y-1">
            <li>
              <a
                href="https://github.com/Arziel1992/Z-S-Overview-Pack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Z-S Overview
              </a>
            </li>
          </ul>
          <p className="mt-2">
            Drop a message in the in-game Bombers Bar channel if you are stuck and need a hand setting up.
          </p>
        </>
      ),
    },
    {
      question: 'To cloak or not to cloak?',
      answer: (
        <>
          Once you arrive to the staging system displayed in the MOTD, stay cloaked in system or dock at the station /
          citadel specified in the MOTD. At some point the FC will call us all to warp to the BLOPS pilot.{' '}
          <strong className="text-primary">YOU NEED TO BE CLOAKED</strong>, check that before you warp to the BLOPS! If
          you warp uncloaked, you will uncloak all others in the fleet and put the whole fleet in danger. If you
          repeatedly uncloak the fleet you will be asked to leave. Don&apos;t be &quot;that&quot; guy.
        </>
      ),
    },
    {
      question: 'Bridge is up!',
      answer: (
        <>
          When the hunter finds a target he will light a covert cyno. Our BLOPS will lock on to that cyno and will open
          the bridge for our fleet. To take the bridge you need to; Keep at range 1000m to the BLOPS, when the blue
          vortex appears around BLOPS or the bridger says &quot;bridge up!&quot; You need to either leftclick BLOPS
          name in watchlist, which will open radial navigation and use top field (at 12:00 hours) to jump, or you can
          right click the BLOPS pilot and from menu use Jump to… (the name of the system where hunter opened cyno).
        </>
      ),
    },
    {
      question: 'JUMP, JUMP, JUMP! Possible problems?',
      answer: (
        <>
          Since everybody is cloaked, you never know if you warped at zero to the BLOPS. If in doubt, warp away to
          random celestial and warp back to the BLOPS at zero again. Better than to be lazy and once everybody decloak
          for jump, you find yourself 100 km away. You will miss the kill! Every time someone decloaks on the BLOPS
          (this will happen, yes). The whole fleet needs to warp off to random celestial, and wait until BLOPS calls
          the fleet back. <strong>DO NOT go before that or you may end in some strange place.</strong>
        </>
      ),
    },
    {
      question: 'Finally! Jumping on target',
      answer: (
        <>
          <p className="mb-2">
            Finally, we jump on the target. First, <strong>ALIGN</strong> to some random celestial. A moon, green
            anomaly, asteroid belt. Just, be ready to run away if needed. ALIGN! Then, lock the target. And then,{' '}
            <strong className="text-primary">ALWAYS FIRST APPLY POINT</strong> (or any other e-war on the target).{' '}
            <strong>DO NOT start with DPS</strong> i.e. torpedos before FC calls for it.
          </p>
          <p className="mb-2">
            Keep in mind, BB fleet usually have 20,000-30,000 DPS and can melt down most of the targets in a minute or
            seconds. Just as you want to get on juicy killmail, so do 50 other pilots in your fleet. If you are among
            the first to drop on the target and you start full DPS, chances are first 10-20 pilots will kill the target
            before others have even lock it (because they were slow in taking the bridge). Imagine the other 30 pilots
            disappointment. Maybe you will be among those on other drops?
          </p>
          <p className="mb-2">
            You secure your place on killmails the moment you point or scram it, not when you shoot torpedos on it.
            Strange thing, is it? BB fleet&apos;s major problem is to control DPS and not kill target, not vice versa.
          </p>
          <p>
            Once we kill ship, lock the pod. <strong className="text-primary">E-WAR ONLY ON THE POD!</strong> – FC
            screams every time… All of us wants to be on that killmail, too. DO NOT shoot torpedos at the pod, not all
            of us can lock it as quick as you have. Be generous, make others happy.
          </p>
        </>
      ),
    },
    {
      question: 'Advice on how to stop killing prematurely',
      answer:
        'If you are using a mouse to start modules then move your point (warp disruptor) and dampening modules to upper row – you can click on those first when the hype starts. Torpedo icon move from central F1 position, so you will be less tempted to click it in hurry. Also, be wise. Towards the end of target\'s life leave one damp mod free to use on pod and get on pod killmail. You will be a whore, I know… But it pays off.',
    },
    {
      question: 'Target killed, pod killed \\o/ hurray, now what?',
      answer: (
        <>
          Well, congrats fellow bomber pilot. Now is a time to warp to a random celestial if the FC calls for it and
          cloak on the way to it. <strong>Cloak while you warp off, NOT at the moment you arrive at the celestial.</strong>{' '}
          Reason: you just killed expensive ship, he was screaming loud while dying and his friends in the system will
          try to find individual targets (our bombers) to make things even. Once you are cloaked and safe, wait. Our
          BLOPS didn&apos;t jump with us on the target and is still in the old system together with the fuel truck and
          maybe some individuals that were slow to get the bridge in time. Now, they will start to communicate in comms,
          calling for everyone left in the previous system to warp to the BLOPS before all of them join us in the system
          we just dropped in. We wait until BLOPS jumps and calls us all to warp to zero. Then the hunters go out to
          find us more juicy targets to kill.
        </>
      ),
    },
    {
      question: 'I like it, want to be with you and help, I will bring a bling fit bomber, combat BLOPS maybe, everything to help you…',
      answer: (
        <>
          Just remember anything outside of O&apos;bomberCare will not be covered. Polarized bombers are normally flown
          by experienced pilots so you know the risks. The same applies to combat blops. Bridging BLOPS are something
          else. We need bridging BLOPS, but let&apos;s make it clear – you will not end up on any killmail, You may not
          be paid for it (we pay for fuel), your FC most likely will share his FC payment with you, the risk is high and
          you will put your ship in danger…. If you want to help, go for recons, we need those in any fleet. They keep
          bombers alive. Ultimately, go hunting, become a hunter-star. Loss of your hunting ship is covered by
          O&apos;bombersCare, you can use a Mar5hy bling fit to stay alive long enough to light a cyno… and maybe
          become famous in EVE. They will fear you and avoid you even if you fly any ship, because you never know –
          maybe there are hundred ships on the other side waiting? Happy hunting, guys…
        </>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-foreground-muted">
            Everything you need to know about flying with Bombers Bar
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-surface-secondary"
              >
                <h3 className="text-lg font-semibold text-foreground pr-4">{faq.question}</h3>
                {openIndex === index ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-foreground-muted" />
                )}
              </button>
              {openIndex === index && (
                <div className="border-t border-border bg-background-dark px-6 py-4">
                  <div className="text-foreground-muted leading-relaxed">{faq.answer}</div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Still Have Questions?</h2>
          <p className="text-foreground-muted mb-6">
            Join our Discord or hop into the in-game &quot;BB: Bombers Bar&quot; channel - we&apos;re always happy to help!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://discord.gg/yqQFDqRXvr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-[#4752C4] hover:shadow-xl"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Discord
            </a>
            <a
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-all hover:bg-primary/80 hover:shadow-xl"
            >
              Learn How to Join
            </a>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
