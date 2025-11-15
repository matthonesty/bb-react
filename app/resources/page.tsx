'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { FileText, Lock, ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { canViewPrivateResources, canEditResources } from '@/lib/auth/roleConstants';

interface Resource {
  title: string;
  filename: string;
  content: string;
  isPrivate: boolean;
}

// This will be populated by the API
const RESOURCES: Resource[] = [
  {
    title: 'Bombers Bar Governance Constitution',
    filename: 'bombersbargovernanceconstitutionpublic.md',
    content: '',
    isPrivate: false,
  },
  {
    title: 'Bombers Bar Code of Conduct',
    filename: 'bombersbarcodeofconductpublic.md',
    content: '',
    isPrivate: false,
  },
  {
    title: 'Fleet and Roles Guide',
    filename: 'fleetandrolesguidepublic.md',
    content: '',
    isPrivate: false,
  },
  {
    title: 'Parliamentary Procedures',
    filename: 'parliamentaryprocprivate.md',
    content: '',
    isPrivate: true,
  },
  {
    title: 'FC Applicant Onboarding',
    filename: 'fcapplicantonboardingprivate.md',
    content: '',
    isPrivate: true,
  },
  {
    title: 'Support Staff Job Description',
    filename: 'supportstaffjobdescprivate.md',
    content: '',
    isPrivate: true,
  },
  {
    title: 'Delegated Duties',
    filename: 'delegateddutiesprivate.md',
    content: '',
    isPrivate: true,
  },
];

export default function ResourcesPage() {
  const { user, isAuthenticated } = useAuth();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [resourceContents, setResourceContents] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Check if user has FC+ role (can view private resources)
  const hasActiveFCRole = user?.roles ? canViewPrivateResources(user.roles) : false;

  // Check if user can edit resources (admin or election officer)
  const canEdit = user?.roles ? canEditResources(user.roles) : false;

  // Filter resources based on permissions
  const visibleResources = RESOURCES.filter((resource) => {
    if (!resource.isPrivate) return true;
    return isAuthenticated && hasActiveFCRole;
  });

  // Fetch resource content when expanded
  const handleToggle = async (index: number, filename: string) => {
    if (openIndex === index) {
      setOpenIndex(null);
      return;
    }

    setOpenIndex(index);

    // If content already loaded, don't fetch again
    if (resourceContents[filename]) return;

    try {
      const response = await fetch(`/api/resources/${filename}`);
      if (response.ok) {
        const data = await response.json();
        setResourceContents((prev) => ({ ...prev, [filename]: data.content }));
      }
    } catch (error) {
      console.error('Failed to load resource:', error);
    }
  };

  // Enter edit mode
  const handleEdit = (filename: string) => {
    setEditedContent((prev) => ({ ...prev, [filename]: resourceContents[filename] }));
    setEditMode((prev) => ({ ...prev, [filename]: true }));
  };

  // Cancel edit mode
  const handleCancelEdit = (filename: string) => {
    setEditMode((prev) => ({ ...prev, [filename]: false }));
    setEditedContent((prev) => {
      const newState = { ...prev };
      delete newState[filename];
      return newState;
    });
  };

  // Save edited content
  const handleSave = async (filename: string) => {
    setSaving((prev) => ({ ...prev, [filename]: true }));

    try {
      const response = await fetch(`/api/resources/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent[filename] }),
      });

      if (response.ok) {
        // Update the cached content
        setResourceContents((prev) => ({ ...prev, [filename]: editedContent[filename] }));
        setEditMode((prev) => ({ ...prev, [filename]: false }));
        setEditedContent((prev) => {
          const newState = { ...prev };
          delete newState[filename];
          return newState;
        });
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save resource:', error);
      alert('Failed to save document');
    } finally {
      setSaving((prev) => ({ ...prev, [filename]: false }));
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl mb-4">
            Resources
          </h1>
          <p className="text-lg text-foreground-muted">
            Documentation, guides, and policies for Bombers Bar
          </p>
        </div>

        {/* Resources List */}
        <div className="space-y-3">
          {visibleResources.map((resource, index) => (
            <Card key={resource.filename} className="overflow-hidden">
              <button
                onClick={() => handleToggle(index, resource.filename)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-surface-secondary"
              >
                <div className="flex items-center gap-3">
                  {resource.isPrivate ? (
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <Lock className="h-5 w-5 text-amber-500" />
                    </div>
                  ) : (
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{resource.title}</h3>
                    {resource.isPrivate && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Active FC+ Only
                      </p>
                    )}
                  </div>
                </div>
                {openIndex === index ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-foreground-muted" />
                )}
              </button>
              {openIndex === index && (
                <div className="border-t border-border bg-background-dark px-6 py-6">
                  {resourceContents[resource.filename] ? (
                    <>
                      {/* Edit/Save buttons for admin/election officer */}
                      {canEdit && (
                        <div className="flex justify-end gap-2 mb-4">
                          {editMode[resource.filename] ? (
                            <>
                              <button
                                onClick={() => handleCancelEdit(resource.filename)}
                                disabled={saving[resource.filename]}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground border border-border rounded-md hover:bg-background-secondary transition-colors"
                              >
                                <X size={16} />
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSave(resource.filename)}
                                disabled={saving[resource.filename]}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                              >
                                {saving[resource.filename] ? (
                                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                ) : (
                                  <Save size={16} />
                                )}
                                Save
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEdit(resource.filename)}
                              className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground border border-border rounded-md hover:bg-background-secondary transition-colors"
                            >
                              <Edit2 size={16} />
                              Edit
                            </button>
                          )}
                        </div>
                      )}

                      {/* Content display or edit mode */}
                      {editMode[resource.filename] ? (
                        <textarea
                          value={editedContent[resource.filename]}
                          onChange={(e) =>
                            setEditedContent((prev) => ({
                              ...prev,
                              [resource.filename]: e.target.value,
                            }))
                          }
                          className="w-full min-h-[500px] p-4 font-mono text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <div className="prose">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeSlug]}
                          >
                            {resourceContents[resource.filename]}
                          </ReactMarkdown>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* No Access Message */}
        {!isAuthenticated && RESOURCES.some((r) => r.isPrivate) && (
          <div className="mt-8 rounded-lg bg-amber-500/10 border border-amber-500/20 p-6 text-center">
            <Lock className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <p className="text-foreground-muted">
              Some resources are restricted to active FCs and leadership.
              <br />
              Please log in to view all available resources.
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
