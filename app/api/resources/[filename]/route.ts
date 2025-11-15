/**
 * Resources API Endpoint
 * Serves markdown files from the documents directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getPublicSession } from '@/lib/auth/session';
import { canViewPrivateResources, canEditResources } from '@/lib/auth/roleConstants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Check if this is a private resource
    const isPrivate = filename.toLowerCase().endsWith('private.md');

    // If private, verify user has FC+ role
    if (isPrivate) {
      const session = await getPublicSession();

      if (!session) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      if (!session.roles || !canViewPrivateResources(session.roles)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Read the file from the documents directory
    const filePath = path.join(process.cwd(), 'documents', filename);
    const content = await readFile(filePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

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

    // Validate filename to prevent directory traversal
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

    // Write the file to the documents directory
    const filePath = path.join(process.cwd(), 'documents', filename);
    await writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[RESOURCES] PUT error:', error);
    return NextResponse.json({ error: 'Failed to save resource' }, { status: 500 });
  }
}
