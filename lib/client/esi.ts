/**
 * @fileoverview Client-side ESI helper functions
 * Centralized client-side wrappers for ESI operations
 */

/**
 * Resolve names to IDs (characters, corporations, inventory types, etc.)
 */
export async function resolveIds(names: string[]) {
  const response = await fetch('/api/esi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'resolveIds',
      params: { names }
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to resolve names');
  }

  return data.data;
}

/**
 * Get type and group information for a given type ID
 */
export async function getTypeInfo(typeId: number) {
  const response = await fetch('/api/esi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'getTypeInfo',
      params: { typeId }
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to get type info');
  }

  return data.data;
}
