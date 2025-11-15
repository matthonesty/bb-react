'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';

export default function BombingIntelPage() {
  // Get current UTC date and time for defaults
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toISOString().split('T')[1].substring(0, 5); // HH:MM

  const [formData, setFormData] = useState({
    target_location: '',
    timer_date: currentDate,
    timer_time: currentTime,
    affiliation: '',
    target_description: '',
    expected_doctrines: '',
    battle_report: '',
    contact_info: '',
    additional_info: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      await apiClient.post('/api/bombing-intel', formData);
      setSubmitStatus({
        type: 'success',
        message: 'Intel submitted successfully! Thank you for contributing.',
      });
      // Reset form with fresh UTC date/time
      const resetNow = new Date();
      const resetDate = resetNow.toISOString().split('T')[0];
      const resetTime = resetNow.toISOString().split('T')[1].substring(0, 5);

      setFormData({
        target_location: '',
        timer_date: resetDate,
        timer_time: resetTime,
        affiliation: '',
        target_description: '',
        expected_doctrines: '',
        battle_report: '',
        contact_info: '',
        additional_info: '',
      });
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to submit intel. Please try again.',
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
            <CardTitle>Bombing Intel</CardTitle>
            <CardDescription>Submit intelligence about potential bombing targets</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Location */}
              <div>
                <label
                  htmlFor="target_location"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Target Location <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  id="target_location"
                  name="target_location"
                  value={formData.target_location}
                  onChange={handleChange}
                  required
                  placeholder="e.g., J123456, System Name"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Timer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="timer_date"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Timer Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    id="timer_date"
                    name="timer_date"
                    value={formData.timer_date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="timer_time"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Timer Time (EVE) <span className="text-error">*</span>
                  </label>
                  <input
                    type="time"
                    id="timer_time"
                    name="timer_time"
                    value={formData.timer_time}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Affiliation */}
              <div>
                <label
                  htmlFor="affiliation"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Target Affiliation (optional)
                </label>
                <input
                  type="text"
                  id="affiliation"
                  name="affiliation"
                  value={formData.affiliation}
                  onChange={handleChange}
                  placeholder="e.g., Alliance/Corporation name"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Target Description */}
              <div>
                <label
                  htmlFor="target_description"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Target Description <span className="text-error">*</span>
                </label>
                <textarea
                  id="target_description"
                  name="target_description"
                  value={formData.target_description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Describe the target, estimated fleet size, composition, etc..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Expected Doctrines */}
              <div>
                <label
                  htmlFor="expected_doctrines"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Expected Enemy Doctrines (optional)
                </label>
                <textarea
                  id="expected_doctrines"
                  name="expected_doctrines"
                  value={formData.expected_doctrines}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What ship types or doctrines are expected?"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Battle Report */}
              <div>
                <label
                  htmlFor="battle_report"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Battle Report Link (optional)
                </label>
                <input
                  type="url"
                  id="battle_report"
                  name="battle_report"
                  value={formData.battle_report}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Contact Info */}
              <div>
                <label
                  htmlFor="contact_info"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Contact Info - Confidential (optional)
                </label>
                <textarea
                  id="contact_info"
                  name="contact_info"
                  value={formData.contact_info}
                  onChange={handleChange}
                  rows={2}
                  placeholder="How can FCs contact you for more details? (Discord, in-game, etc.)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-foreground-muted">
                  This information will be kept confidential and only shared with FCs
                </p>
              </div>

              {/* Additional Info */}
              <div>
                <label
                  htmlFor="additional_info"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Additional Information (optional)
                </label>
                <textarea
                  id="additional_info"
                  name="additional_info"
                  value={formData.additional_info}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any other relevant information..."
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
                <Button type="submit" disabled={submitting} size="lg">
                  {submitting ? 'Submitting...' : 'Submit Intel'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}
