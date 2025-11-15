'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FleetManagement, FleetType, FleetCommander } from '@/types';

interface FleetModalProps {
  fleet: FleetManagement | null;
  fleetTypes: FleetType[];
  fcs: FleetCommander[];
  onClose: () => void;
  onSuccess: () => void;
}

export function FleetModal({ fleet, fleetTypes, fcs, onClose, onSuccess }: FleetModalProps) {
  const isEditMode = !!fleet;

  const [formData, setFormData] = useState({
    scheduled_at: '',
    timezone: 'UTC',
    duration_minutes: 120,
    fleet_type_id: 0,
    fc_id: 0,
    title: '',
    description: '',
    staging_system: '',
    comms_channel: '',
    status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or fleet changes
  useEffect(() => {
    if (fleet) {
      // Convert scheduled_at to datetime-local format
      const scheduledDate = new Date(fleet.scheduled_at);
      const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        scheduled_at: localDateTime,
        timezone: fleet.timezone,
        duration_minutes: fleet.duration_minutes,
        fleet_type_id: fleet.fleet_type_id,
        fc_id: fleet.fc_id,
        title: fleet.title || '',
        description: fleet.description || '',
        staging_system: fleet.staging_system || '',
        comms_channel: fleet.comms_channel || '',
        status: fleet.status,
      });
    } else {
      // Default to next hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        scheduled_at: localDateTime,
        timezone: 'UTC',
        duration_minutes: 120,
        fleet_type_id: fleetTypes.length > 0 ? fleetTypes[0].id : 0,
        fc_id: fcs.length > 0 ? fcs[0].id : 0,
        title: '',
        description: '',
        staging_system: '',
        comms_channel: 'BB: Bombers Bar',
        status: 'scheduled',
      });
    }
    setError(null);
  }, [fleet, fleetTypes, fcs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Convert local datetime to ISO string
      const scheduledDate = new Date(formData.scheduled_at);
      const isoDateTime = scheduledDate.toISOString();

      const payload = {
        ...formData,
        scheduled_at: isoDateTime,
        fleet_type_id: parseInt(formData.fleet_type_id as any),
        fc_id: parseInt(formData.fc_id as any),
        duration_minutes: parseInt(formData.duration_minutes as any),
      };

      const url = isEditMode ? `/api/admin/fleets/${fleet.id}` : '/api/admin/fleets';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} fleet`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Moscow',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];

  return (
    <Modal isOpen onClose={onClose} title={isEditMode ? 'Edit Fleet' : 'Schedule New Fleet'}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Scheduled Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Duration (minutes)
            </label>
            <Input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) =>
                setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 120 })
              }
              min="30"
              max="480"
              step="30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Fleet Type *
            </label>
            <select
              value={formData.fleet_type_id}
              onChange={(e) => setFormData({ ...formData, fleet_type_id: parseInt(e.target.value) })}
              required
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Fleet Type</option>
              {fleetTypes.map((ft) => (
                <option key={ft.id} value={ft.id}>
                  {ft.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Fleet Commander *
            </label>
            <select
              value={formData.fc_id}
              onChange={(e) => setFormData({ ...formData, fc_id: parseInt(e.target.value) })}
              required
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select FC</option>
              {fcs.map((fc) => (
                <option key={fc.id} value={fc.id}>
                  {fc.main_character_name} ({fc.rank})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">Title *</label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Fleet title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Fleet description"
              rows={3}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Staging System *
              </label>
              <Input
                type="text"
                value={formData.staging_system}
                onChange={(e) => setFormData({ ...formData, staging_system: e.target.value })}
                placeholder="e.g., Jita"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                In-Game Channel
              </label>
              <Input
                type="text"
                value={formData.comms_channel}
                onChange={(e) => setFormData({ ...formData, comms_channel: e.target.value })}
                placeholder="BB: Bombers Bar"
              />
            </div>
          </div>

          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditMode ? 'Update Fleet' : 'Schedule Fleet'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
