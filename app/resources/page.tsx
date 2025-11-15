'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { FileText, Lock, ChevronDown, ChevronRight, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { canViewPrivateResources, canEditResources } from '@/lib/auth/roleConstants';

interface Resource {
  title: string;
  filename: string;
  is_private: boolean;
}

export default function ResourcesPage() {
  const { user, isAuthenticated } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [resourceContents, setResourceContents] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    filename: '',
    content: '',
    isPrivate: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<{ title: string; filename: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user has FC+ role (can view private resources)
  const hasActiveFCRole = user?.roles ? canViewPrivateResources(user.roles) : false;

  // Check if user can edit resources (admin or election officer)
  const canEdit = user?.roles ? canEditResources(user.roles) : false;

  // Fetch resources from API
  const loadResources = async () => {
    try {
      setIsLoadingResources(true);
      const response = await fetch('/api/resources/list');
      if (response.ok) {
        const data = await response.json();
        setResources(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  // Load resources on mount
  useEffect(() => {
    loadResources();
  }, []);

  // Filter resources based on permissions
  const visibleResources = resources.filter((resource) => {
    if (!resource.is_private) return true;
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

  // Create new resource
  const handleCreateResource = async () => {
    if (!newResource.title.trim() || !newResource.filename.trim()) {
      alert('Title and filename are required');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newResource.title,
          filename: newResource.filename,
          content: newResource.content,
          isPrivate: newResource.isPrivate,
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setNewResource({ title: '', filename: '', content: '', isPrivate: false });
        setIsAddModalOpen(false);

        // Reload resources list
        await loadResources();
      } else {
        const error = await response.json();
        alert(`Failed to create resource: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create resource:', error);
      alert('Failed to create resource');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete resource (soft delete)
  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/resources/${resourceToDelete.filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsDeleteModalOpen(false);
        setResourceToDelete(null);
        // Reload resources list
        await loadResources();
      } else {
        const error = await response.json();
        alert(`Failed to delete resource: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert('Failed to delete resource');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl mb-4">
              Resources
            </h1>
            <p className="text-lg text-foreground-muted">
              Documentation, guides, and policies for Bombers Bar
            </p>
          </div>
          {canEdit && (
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </div>
          )}
        </div>

        {/* Resources List */}
        <div className="space-y-3">
          {isLoadingResources ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : (
            visibleResources.map((resource, index) => (
              <Card key={resource.filename} className="overflow-hidden">
                <button
                  onClick={() => handleToggle(index, resource.filename)}
                  className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-surface-secondary"
                >
                  <div className="flex items-center gap-3">
                    {resource.is_private ? (
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
                      {resource.is_private && (
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(resource.filename)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground border border-border rounded-md hover:bg-background-secondary transition-colors"
                              >
                                <Edit2 size={16} />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setResourceToDelete({ title: resource.title, filename: resource.filename });
                                  setIsDeleteModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:text-error border border-error/30 rounded-md hover:bg-error/10 transition-colors"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
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
            ))
          )}
        </div>

        {/* No Access Message */}
        {!isAuthenticated && resources.some((r) => r.is_private) && (
          <div className="mt-8 rounded-lg bg-amber-500/10 border border-amber-500/20 p-6 text-center">
            <Lock className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <p className="text-foreground-muted">
              Some resources are restricted to active FCs and leadership.
              <br />
              Please log in to view all available resources.
            </p>
          </div>
        )}

        {/* Add Resource Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setNewResource({ title: '', filename: '', content: '', isPrivate: false });
          }}
          title="Add New Resource"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Title *
              </label>
              <Input
                type="text"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="e.g., New FC Guidelines"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Filename *
              </label>
              <Input
                type="text"
                value={newResource.filename}
                onChange={(e) =>
                  setNewResource({
                    ...newResource,
                    filename: e.target.value.toLowerCase().replace(/\s+/g, ''),
                  })
                }
                placeholder="e.g., newfcguidelinespublic"
              />
              <p className="text-xs text-foreground-muted mt-1">
                Suggested format: descriptivename[public|private]
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newResource.isPrivate}
                  onChange={(e) => setNewResource({ ...newResource, isPrivate: e.target.checked })}
                  className="rounded border-border"
                />
                <span className="text-sm font-medium text-foreground-muted">
                  Private (FC+ only)
                </span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground-muted">
                  Content (Markdown)
                </label>
                <a
                  href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Markdown syntax guide ↗
                </a>
              </div>
              <textarea
                value={newResource.content}
                onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                placeholder="# Title&#10;&#10;Write your markdown content here..."
                className="w-full min-h-[300px] p-4 font-mono text-sm bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewResource({ title: '', filename: '', content: '', isPrivate: false });
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateResource}
              isLoading={isCreating}
              disabled={!newResource.title.trim() || !newResource.filename.trim() || isCreating}
            >
              Create Resource
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setResourceToDelete(null);
          }}
          onConfirm={handleDeleteResource}
          title="Delete Resource"
          message={
            resourceToDelete
              ? `Are you sure you want to delete "${resourceToDelete.title}"? This will hide the resource but can be recovered if needed.`
              : ''
          }
          confirmText="Delete"
          confirmVariant="danger"
          isLoading={isDeleting}
        />
      </div>
    </PageContainer>
  );
}
