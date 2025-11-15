/**
 * Resources API Endpoint
 * Creates new markdown documents in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPublicSession } from '@/lib/auth/session';
import { canEditResources } from '@/lib/auth/roleConstants';

export async function POST(request: NextRequest) {
  try {
    // Only admin and election officer can create documents
    const session = await getPublicSession();

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.roles || !canEditResources(session.roles)) {
      return NextResponse.json(
        { error: 'Only admin and election officer can create documents' },
        { status: 403 }
      );
    }

    // Get the new document data from request body
    const { filename, content, isPrivate } = await request.json();

    if (!filename || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid filename or content' }, { status: 400 });
    }

    // Validate filename to prevent SQL injection
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Ensure filename ends with .md
    const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

    // Check if document already exists
    const existing = await pool.query('SELECT id FROM documents WHERE filename = $1', [
      finalFilename,
    ]);

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Document with this filename already exists' }, { status: 400 });
    }

    // Insert new document
    await pool.query(
      'INSERT INTO documents (filename, content, is_private, updated_by) VALUES ($1, $2, $3, $4)',
      [finalFilename, content, isPrivate || false, session.character_id]
    );

    return NextResponse.json({ success: true, filename: finalFilename });
  } catch (error: unknown) {
    console.error('[RESOURCES] POST error:', error);
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}
