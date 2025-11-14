'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';

export default function FCApplicationPage() {
  const [formData, setFormData] = useState({
    main_character: '',
    discord_name: '',
    prior_fc_experience: '',
    blops_experience: '',
    hunter_experience: '',
    bridge_experience: '',
    roller_experience: '',
    familiar_fleet_types: '',
    fleet_types: '',
    timezones: '',
    bb_duration: '',
    motivation: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await apiClient.post('/api/fc-application', formData);
      setSubmitStatus({
        type: 'success',
        message: 'Application submitted successfully! Thank you for applying.'
      });
      // Reset form
      setFormData({
        main_character: '',
        discord_name: '',
        prior_fc_experience: '',
        blops_experience: '',
        hunter_experience: '',
        bridge_experience: '',
        roller_experience: '',
        familiar_fleet_types: '',
        fleet_types: '',
        timezones: '',
        bb_duration: '',
        motivation: ''
      });
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to submit application. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth>
      <div className="mx-auto max-w-4xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>FC Application</CardTitle>
          <CardDescription>
            Apply to become a Fleet Commander for Bombers Bar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Character */}
            <div>
              <label htmlFor="main_character" className="block text-sm font-medium text-foreground mb-2">
                Main Character <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="main_character"
                name="main_character"
                value={formData.main_character}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Discord Name */}
            <div>
              <label htmlFor="discord_name" className="block text-sm font-medium text-foreground mb-2">
                Discord Name (optional, if different from main)
              </label>
              <input
                type="text"
                id="discord_name"
                name="discord_name"
                value={formData.discord_name}
                onChange={handleChange}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Experience Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="blops_experience" className="block text-sm font-medium text-foreground mb-2">
                  BLOPS Experience <span className="text-error">*</span>
                </label>
                <select
                  id="blops_experience"
                  name="blops_experience"
                  value={formData.blops_experience}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Some">Some</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              <div>
                <label htmlFor="hunter_experience" className="block text-sm font-medium text-foreground mb-2">
                  Hunter Experience <span className="text-error">*</span>
                </label>
                <select
                  id="hunter_experience"
                  name="hunter_experience"
                  value={formData.hunter_experience}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Some">Some</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              <div>
                <label htmlFor="bridge_experience" className="block text-sm font-medium text-foreground mb-2">
                  Bridge Experience <span className="text-error">*</span>
                </label>
                <select
                  id="bridge_experience"
                  name="bridge_experience"
                  value={formData.bridge_experience}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Some">Some</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>

              <div>
                <label htmlFor="roller_experience" className="block text-sm font-medium text-foreground mb-2">
                  Roller Experience <span className="text-error">*</span>
                </label>
                <select
                  id="roller_experience"
                  name="roller_experience"
                  value={formData.roller_experience}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Some">Some</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>
            </div>

            {/* Familiar Fleet Types */}
            <div>
              <label htmlFor="familiar_fleet_types" className="block text-sm font-medium text-foreground mb-2">
                Familiar with Fleet Types <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="familiar_fleet_types"
                name="familiar_fleet_types"
                value={formData.familiar_fleet_types}
                onChange={handleChange}
                required
                placeholder="e.g., Blops, Standard, Training"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Timezones */}
            <div>
              <label htmlFor="timezones" className="block text-sm font-medium text-foreground mb-2">
                Preferred Timezones <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="timezones"
                name="timezones"
                value={formData.timezones}
                onChange={handleChange}
                required
                placeholder="e.g., EU, US, AUTZ"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* BB Duration */}
            <div>
              <label htmlFor="bb_duration" className="block text-sm font-medium text-foreground mb-2">
                How long have you been with BB? <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="bb_duration"
                name="bb_duration"
                value={formData.bb_duration}
                onChange={handleChange}
                required
                placeholder="e.g., 6 months, 2 years"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Prior FC Experience */}
            <div>
              <label htmlFor="prior_fc_experience" className="block text-sm font-medium text-foreground mb-2">
                Prior FC Experience <span className="text-error">*</span>
              </label>
              <textarea
                id="prior_fc_experience"
                name="prior_fc_experience"
                value={formData.prior_fc_experience}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe your previous FC experience..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Desired Fleet Types */}
            <div>
              <label htmlFor="fleet_types" className="block text-sm font-medium text-foreground mb-2">
                What types of fleets would you like to FC? <span className="text-error">*</span>
              </label>
              <textarea
                id="fleet_types"
                name="fleet_types"
                value={formData.fleet_types}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the fleet types you'd like to command..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Motivation */}
            <div>
              <label htmlFor="motivation" className="block text-sm font-medium text-foreground mb-2">
                Why do you want to become an FC for Bombers Bar? <span className="text-error">*</span>
              </label>
              <textarea
                id="motivation"
                name="motivation"
                value={formData.motivation}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Tell us about your motivation..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status Message */}
            {submitStatus && (
              <div
                className={`rounded-md p-4 ${
                  submitStatus.type === 'success'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-error/10 text-error border border-error/20'
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
    </RequireAuth>
  );
}
