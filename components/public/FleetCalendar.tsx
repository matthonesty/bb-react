'use client';

import { Calendar, Clock, Users, MapPin, Radio } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FleetManagement } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface FleetCalendarProps {
  fleets: FleetManagement[];
}

export function FleetCalendar({ fleets }: FleetCalendarProps) {
  if (fleets.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-foreground-muted" />
          <p className="mt-4 text-foreground-muted">No upcoming fleets scheduled</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {fleets.map((fleet) => (
        <FleetCard key={fleet.id} fleet={fleet} />
      ))}
    </div>
  );
}

function FleetCard({ fleet }: { fleet: FleetManagement }) {
  const scheduledDate = parseISO(fleet.scheduled_at);
  const formattedTime = format(scheduledDate, 'HH:mm');

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
      <div className="flex flex-col sm:flex-row">
        {/* Date/Time Section */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 border-r border-border p-6 sm:w-44">
          <div className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
            {format(scheduledDate, 'MMM')}
          </div>
          <div className="text-4xl font-bold text-primary my-1">{format(scheduledDate, 'dd')}</div>
          <div className="text-sm font-medium text-foreground-muted uppercase mb-3">
            {format(scheduledDate, 'EEE')}
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-foreground-muted" />
            <span className="font-semibold text-foreground">
              {formattedTime}
            </span>
            <span className="text-xs text-foreground-muted">{fleet.timezone}</span>
          </div>
        </div>

        {/* Fleet Details */}
        <div className="flex-1 p-6">
          {/* Fleet Title & Description */}
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {fleet.title || fleet.fleet_type_name}{' '}
              {fleet.fleet_type_name && fleet.fleet_type_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const element = document.getElementById(`fleet-type-${fleet.fleet_type_id}`);
                    if (element) {
                      // Scroll with offset for sticky header
                      const yOffset = -80;
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });

                      // Trigger click on the header to expand it if not already expanded
                      setTimeout(() => {
                        const header = element.querySelector('[role="button"]') as HTMLElement;
                        // Check if the ships list is not visible (meaning it's collapsed)
                        const shipsContainer = element.querySelector('.border-t');
                        if (header && !shipsContainer) {
                          header.click();
                        }
                      }, 500);
                    }
                  }}
                  className="text-foreground-muted font-normal hover:text-primary hover:underline transition-colors cursor-pointer"
                >
                  ({fleet.fleet_type_name})
                </button>
              )}
            </h3>
            {fleet.description && (
              <p className="text-foreground-muted leading-relaxed border-l-2 border-primary/30 pl-3">
                {fleet.description}
              </p>
            )}
          </div>

          {/* Fleet Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                  Fleet Commander
                </div>
                <div className="font-semibold text-foreground">{fleet.fc_name}</div>
              </div>
            </div>

            {fleet.staging_system && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Staging
                  </div>
                  <div className="font-semibold text-foreground">{fleet.staging_system}</div>
                </div>
              </div>
            )}

            {fleet.comms_channel && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Radio className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    In-Game Channel
                  </div>
                  <div className="font-semibold text-foreground">{fleet.comms_channel}</div>
                </div>
              </div>
            )}
          </div>

          {/* Participant Count */}
          {fleet.participant_count > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-primary">
                  <Users className="h-4 w-4" />
                  <span className="font-bold text-lg">{fleet.participant_count}</span>
                </div>
                <span className="text-foreground-muted">
                  pilot{fleet.participant_count !== 1 ? 's' : ''} registered
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
