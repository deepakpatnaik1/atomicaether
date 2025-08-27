/**
 * SuperJournal v2 - Update Entry Status Endpoint
 * Handles soft delete/restore via status updates
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { R2StorageService } from '$lib/bricks/SuperJournalBrick/services/R2StorageService';
import type { SuperJournalConfig } from '$lib/bricks/SuperJournalBrick/models/MessagePairEntry';

const r2Config: SuperJournalConfig = {
  retryAttempts: 3,
  retryDelay: 2000,
  bucketName: import.meta.env.VITE_R2_SUPERJOURNAL_BUCKET || 'atomicaether-superjournal',
  endpoint: import.meta.env.VITE_R2_ENDPOINT || 'https://62e9e6e776415c8c0c59e5497a3b396d.r2.cloudflarestorage.com'
};

const r2Service = new R2StorageService(r2Config);

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse request body
    const { entryId, status } = await request.json();

    // Basic validation
    if (!entryId || typeof entryId !== 'string') {
      return json(
        { success: false, error: 'Missing or invalid entryId' },
        { status: 400 }
      );
    }

    if (status !== 'active' && status !== 'deleted') {
      return json(
        { success: false, error: 'Status must be "active" or "deleted"' },
        { status: 400 }
      );
    }

    // Update status in R2
    const response = await r2Service.updateEntryStatus(entryId, status);

    if (response.success) {
      return json(response, { status: 200 });
    } else {
      return json(response, { status: 500 });
    }

  } catch (error) {
    
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
        entryId: '',
        timestamp: Date.now(),
        r2Key: ''
      },
      { status: 500 }
    );
  }
};