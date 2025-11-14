'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils/format';

interface ProcessedMail {
  mail_id: number;
  from_character_id: number;
  sender_name: string;
  subject: string;
  mail_timestamp: string;
  processed_at: string;
  status: string;
  srp_request_id: number | null;
  error_message: string | null;
}

interface ProcessedMailDetail extends ProcessedMail {
  mail_body?: string;
  mail_header?: any;
  killmail_data?: any;
}

export function ProcessedMailsTable() {
  const [mails, setMails] = useState<ProcessedMail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMailId, setExpandedMailId] = useState<number | null>(null);
  const [expandedMailData, setExpandedMailData] = useState<Record<number, ProcessedMailDetail>>({});

  const pageSize = 100;

  useEffect(() => {
    loadMails();
  }, [currentPage, statusFilter]);

  async function loadMails() {
    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/processed-mails?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load processed mails');
      }

      setMails(data.mails);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMailExpand(mailId: number) {
    if (expandedMailId === mailId) {
      setExpandedMailId(null);
      return;
    }

    setExpandedMailId(mailId);

    // Fetch mail details if not already cached
    if (!expandedMailData[mailId]) {
      try {
        const response = await fetch(`/api/admin/processed-mails?mail_id=${mailId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load mail details');
        }

        setExpandedMailData(prev => ({
          ...prev,
          [mailId]: data.mail
        }));
      } catch (err: any) {
        console.error('Failed to load mail details:', err);
      }
    }
  }

  const filteredMails = mails.filter(mail =>
    mail.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <input
            type="text"
            placeholder="Search by sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="srp_created">SRP Created</option>
            <option value="rejected_ship">Rejected (Ship)</option>
            <option value="rejected_too_old">Rejected (Too Old)</option>
            <option value="rejected_pilot">Rejected (Pilot)</option>
            <option value="rejected_multiple">Rejected (Multiple)</option>
            <option value="duplicate">Duplicate</option>
            <option value="not_srp">Not SRP</option>
            <option value="invalid">Invalid</option>
            <option value="banned">Banned</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="flex gap-4 text-sm text-foreground-muted">
          <span>Showing: <strong className="text-foreground">{filteredMails.length}</strong></span>
          <span>Total: <strong className="text-foreground">{total}</strong></span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground-muted">Sender</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground-muted">Subject</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground-muted">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground-muted">Processed At</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground-muted">SRP Request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-foreground-muted">
                    Loading processed mails...
                  </td>
                </tr>
              )}

              {!loading && filteredMails.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-foreground-muted">
                    No processed mails found
                  </td>
                </tr>
              )}

              {!loading && filteredMails.map((mail) => (
                <React.Fragment key={mail.mail_id}>
                  <tr
                    className={`hover:bg-background-secondary transition-colors cursor-pointer ${
                      expandedMailId === mail.mail_id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => toggleMailExpand(mail.mail_id)}
                  >
                    <td className="px-4 py-3 text-sm text-foreground">{mail.sender_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{mail.subject || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={mail.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {formatDate(mail.processed_at, 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      {mail.srp_request_id ? (
                        <Link
                          href={`/srp?id=${mail.srp_request_id}`}
                          className="text-primary hover:underline"
                        >
                          {mail.srp_request_id}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>

                  {expandedMailId === mail.mail_id && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 bg-background-secondary/50">
                        <MailDetail
                          mail={expandedMailData[mail.mail_id]}
                          loading={!expandedMailData[mail.mail_id]}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-tertiary transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-tertiary transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'srp_created':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'rejected_ship':
      case 'rejected_too_old':
      case 'rejected_pilot':
      case 'rejected_multiple':
      case 'invalid':
        return 'bg-danger/20 text-danger border-danger/30';
      case 'duplicate':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'not_srp':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'banned':
        return 'bg-red-900/20 text-red-400 border-red-900/30';
      case 'error':
        return 'bg-danger/20 text-danger border-danger/30';
      default:
        return 'bg-foreground-muted/20 text-foreground-muted border-foreground-muted/30';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function MailDetail({ mail, loading }: { mail?: ProcessedMailDetail; loading: boolean }) {
  if (loading) {
    return <div className="text-center text-foreground-muted py-4">Loading details...</div>;
  }

  if (!mail) {
    return null;
  }

  return (
    <div className="space-y-4">
      {mail.error_message && (
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">Error Message</label>
          <div className="bg-background-tertiary border border-border rounded-lg p-3 text-sm text-danger">
            {mail.error_message}
          </div>
        </div>
      )}

      {mail.mail_body && (
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">Mail Body</label>
          <div className="bg-background-tertiary border border-border rounded-lg p-3 text-sm text-foreground max-h-64 overflow-y-auto whitespace-pre-wrap">
            {mail.mail_body}
          </div>
        </div>
      )}

      {mail.killmail_data?.killmail_id && (
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">ZKillboard Link</label>
          <div className="bg-background-tertiary border border-border rounded-lg p-3 text-sm">
            <a
              href={`https://zkillboard.com/kill/${mail.killmail_data.killmail_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              https://zkillboard.com/kill/{mail.killmail_data.killmail_id}/
            </a>
          </div>
        </div>
      )}

      {mail.mail_header && (
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">Mail Header</label>
          <div className="bg-background-tertiary border border-border rounded-lg p-3 text-xs text-foreground max-h-64 overflow-y-auto">
            <pre>{JSON.stringify(mail.mail_header, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
