'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProcessedMailsTable } from '@/components/mail/ProcessedMailsTable';

export default function ProcessedMailsPage() {
  const { user } = useAuth();
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    document.title = 'Processed Mails - Bombers Bar';

    // Check if user is view-only (FC or Accountant without higher permissions)
    if (user?.roles) {
      const viewOnly = (user.roles.includes('FC') || user.roles.includes('Accountant')) &&
        !user.roles.includes('admin') &&
        !user.roles.includes('Council');
      setIsViewOnly(viewOnly);
    }
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Processed Mails</h1>
        <p className="text-foreground-muted">
          View and manage EVE in-game mails processed by the automated SRP mailer system.
        </p>
      </div>

      <ProcessedMailsTable isViewOnly={isViewOnly} />
    </div>
  );
}
