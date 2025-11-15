'use client';

import { useEffect } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ProcessedMailsTable } from '@/components/mail/ProcessedMailsTable';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ProcessedMailsPage() {
  useEffect(() => {
    document.title = 'Processed Mails - Bombers Bar';
  }, []);

  return (
    <RequireAuth requireFCRole>
      <PageContainer>
        <PageHeader
          title="Processed Mails"
          description="View EVE in-game mails processed by the automated SRP mailer system."
        />
        <ProcessedMailsTable />
      </PageContainer>
    </RequireAuth>
  );
}
