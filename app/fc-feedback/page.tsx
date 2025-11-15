'use client';

import { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';

export default function FCFeedbackPage() {
  // Get current UTC date and time for defaults
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = now.toISOString().split('T')[1].substring(0, 5); // HH:MM

  const [formData, setFormData] = useState({
    fc_name: '',
    fleet_date: currentDate,
    fleet_time: currentTime,
    fleet_type: '',
    fleet_length: '',
    was_clear: '',
    fc_rating: '',
    had_fun: '',
    roles: '',
    experience: '',
    clarity_improvement: '',
    fc_improvement: '',
    defining_moment: '',
    additional_comments: '',
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
      await apiClient.post('/api/fc-feedback', formData);
      setSubmitStatus({
        type: 'success',
        message: 'Feedback submitted successfully! Thank you.',
      });
      // Reset form with fresh UTC date/time
      const resetNow = new Date();
      const resetDate = resetNow.toISOString().split('T')[0];
      const resetTime = resetNow.toISOString().split('T')[1].substring(0, 5);

      setFormData({
        fc_name: '',
        fleet_date: resetDate,
        fleet_time: resetTime,
        fleet_type: '',
        fleet_length: '',
        was_clear: '',
        fc_rating: '',
        had_fun: '',
        roles: '',
        experience: '',
        clarity_improvement: '',
        fc_improvement: '',
        defining_moment: '',
        additional_comments: '',
      });
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to submit feedback. Please try again.',
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
            <CardTitle>FC Feedback</CardTitle>
            <CardDescription>Provide anonymous feedback about a fleet experience</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* FC Name */}
              <div>
                <label htmlFor="fc_name" className="block text-sm font-medium text-foreground mb-2">
                  Fleet Commander Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  id="fc_name"
                  name="fc_name"
                  value={formData.fc_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Fleet Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label
                    htmlFor="fleet_date"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Fleet Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    id="fleet_date"
                    name="fleet_date"
                    value={formData.fleet_date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fleet_time"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Fleet Time (EVE) <span className="text-error">*</span>
                  </label>
                  <input
                    type="time"
                    id="fleet_time"
                    name="fleet_time"
                    value={formData.fleet_time}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="fleet_length"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Fleet Length
                  </label>
                  <select
                    id="fleet_length"
                    name="fleet_length"
                    value={formData.fleet_length}
                    onChange={handleChange}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    <option value="< 1 hour">Less than 1 hour</option>
                    <option value="1-2 hours">1-2 hours</option>
                    <option value="2-3 hours">2-3 hours</option>
                    <option value="3+ hours">3+ hours</option>
                  </select>
                </div>
              </div>

              {/* Fleet Type */}
              <div>
                <label
                  htmlFor="fleet_type"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Fleet Type <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  id="fleet_type"
                  name="fleet_type"
                  value={formData.fleet_type}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Blops, Training, Standard"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="fc_rating"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    FC Rating (1-3) <span className="text-error">*</span>
                  </label>
                  <select
                    id="fc_rating"
                    name="fc_rating"
                    value={formData.fc_rating}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    <option value="1">1 - Needs Improvement</option>
                    <option value="2">2 - Good</option>
                    <option value="3">3 - Excellent</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="had_fun"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Did you have fun? <span className="text-error">*</span>
                  </label>
                  <select
                    id="had_fun"
                    name="had_fun"
                    value={formData.had_fun}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Somewhat">Somewhat</option>
                  </select>
                </div>
              </div>

              {/* Communication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="was_clear"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Was communication clear?
                  </label>
                  <select
                    id="was_clear"
                    name="was_clear"
                    value={formData.was_clear}
                    onChange={handleChange}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Mostly">Mostly</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="experience"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Your Experience Level
                  </label>
                  <select
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    <option value="New">New to BB</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Experienced">Experienced</option>
                  </select>
                </div>
              </div>

              {/* Roles */}
              <div>
                <label htmlFor="roles" className="block text-sm font-medium text-foreground mb-2">
                  Roles Filled (if any)
                </label>
                <input
                  type="text"
                  id="roles"
                  name="roles"
                  value={formData.roles}
                  onChange={handleChange}
                  placeholder="e.g., Hunter, Bridge, Scanner"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Optional Text Fields */}
              <div>
                <label
                  htmlFor="clarity_improvement"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Communication Improvement Suggestions (optional)
                </label>
                <textarea
                  id="clarity_improvement"
                  name="clarity_improvement"
                  value={formData.clarity_improvement}
                  onChange={handleChange}
                  rows={3}
                  placeholder="How could the FC improve communication?"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="fc_improvement"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  FC Improvement Suggestions (optional)
                </label>
                <textarea
                  id="fc_improvement"
                  name="fc_improvement"
                  value={formData.fc_improvement}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What could the FC improve overall?"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="defining_moment"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Defining Moment (optional)
                </label>
                <textarea
                  id="defining_moment"
                  name="defining_moment"
                  value={formData.defining_moment}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Was there a memorable moment during the fleet?"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="additional_comments"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Additional Comments (optional)
                </label>
                <textarea
                  id="additional_comments"
                  name="additional_comments"
                  value={formData.additional_comments}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any other feedback?"
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
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}
