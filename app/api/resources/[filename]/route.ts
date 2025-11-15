/**
 * Resources API Endpoint
 * Serves markdown documents from the database
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPublicSession } from '@/lib/auth/session';
import { canViewPrivateResources, canEditResources } from '@/lib/auth/roleConstants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent SQL injection
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Get document from database (exclude soft-deleted)
    const result = await pool.query(
      'SELECT content, is_private FROM documents WHERE filename = $1 AND deleted_at IS NULL',
      [filename]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const document = result.rows[0];

    // If private, verify user has FC+ role
    if (document.is_private) {
      const session = await getPublicSession();

      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      if (!session.roles || !canViewPrivateResources(session.roles)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    return NextResponse.json({ content: document.content });
  } catch (error: unknown) {
    console.error('[RESOURCES] GET error:', error);
    return NextResponse.json({ error: 'Failed to load resource' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent SQL injection
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Only admin and election officer can edit documents
    const session = await getPublicSession();

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.roles || !canEditResources(session.roles)) {
      return NextResponse.json(
        { error: 'Only admin and election officer can edit documents' },
        { status: 403 }
      );
    }

    // Get the new content from request body
    const { content } = await request.json();

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Update document in database
    const result = await pool.query(
      'UPDATE documents SET content = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE filename = $3 RETURNING id',
      [content, session.character_id, filename]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[RESOURCES] PUT error:', error);
    return NextResponse.json({ error: 'Failed to save resource' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent SQL injection
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Only admin and election officer can delete documents
    const session = await getPublicSession();

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.roles || !canEditResources(session.roles)) {
      return NextResponse.json(
        { error: 'Only admin and election officer can delete documents' },
        { status: 403 }
      );
    }

    // Soft delete: set deleted_at timestamp
    const result = await pool.query(
      'UPDATE documents SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1 WHERE filename = $2 AND deleted_at IS NULL RETURNING id',
      [session.character_id, filename]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[RESOURCES] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}
