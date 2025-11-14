'use client';

import { useEffect } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ProcessedMailsTable } from '@/components/mail/ProcessedMailsTable';

export default function ProcessedMailsPage() {
  useEffect(() => {
    document.title = 'Processed Mails - Bombers Bar';
  }, []);

  return (
    <RequireAuth requireFCRole>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Processed Mails</h1>
        <p className="text-foreground-muted">
          View EVE in-game mails processed by the automated SRP mailer system.
        </p>
      </div>

      <ProcessedMailsTable />
    </div>
    </RequireAuth>
  );
}
