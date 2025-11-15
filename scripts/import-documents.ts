/**
 * Import markdown documents from filesystem to database
 * Run with: npx tsx scripts/import-documents.ts
 */

import { config } from 'dotenv';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

// Load environment variables first
config({ path: '.env.local' });

// Create database pool after env variables are loaded
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function importDocuments() {
  try {
    const documentsDir = path.join(process.cwd(), 'documents');
    const files = await readdir(documentsDir);

    // Filter to only markdown files (exclude dev docs)
    const mdFiles = files.filter((f) => {
      if (!f.endsWith('.md')) return false;
      // Exclude development documentation
      const devDocs = [
        'BACKEND_INTEGRATION.md',
        'LOCAL_DEVELOPMENT.md',
        'MAILER_INTEGRATION.md',
        'NEXTJS_BACKEND.md',
        'PROJECT_SUMMARY.md',
        'README.md',
        'CLAUDE.md',
      ];
      return !devDocs.includes(f);
    });

    console.log(`Found ${mdFiles.length} documents to import`);

    for (const filename of mdFiles) {
      const filePath = path.join(documentsDir, filename);
      const content = await readFile(filePath, 'utf-8');
      const isPrivate = filename.toLowerCase().endsWith('private.md');

      // Check if document already exists
      const existing = await pool.query('SELECT id FROM documents WHERE filename = $1', [
        filename,
      ]);

      if (existing.rows.length > 0) {
        // Update existing document
        await pool.query(
          'UPDATE documents SET content = $1, is_private = $2, updated_at = CURRENT_TIMESTAMP WHERE filename = $3',
          [content, isPrivate, filename]
        );
        console.log(`✓ Updated: ${filename}`);
      } else {
        // Insert new document
        await pool.query(
          'INSERT INTO documents (filename, content, is_private) VALUES ($1, $2, $3)',
          [filename, content, isPrivate]
        );
        console.log(`✓ Imported: ${filename}`);
      }
    }

    console.log('\n✅ Import complete!');
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importDocuments();
