/**
 * SuperJournal v2 - Read Entries Endpoint
 * Handles querying message pairs from R2 with filtering
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { R2StorageService } from '$lib/bricks/SuperJournalBrick/services/R2StorageService';
import type { SuperJournalConfig, ReadQuery } from '$lib/bricks/SuperJournalBrick/models/MessagePairEntry';

const r2Config: SuperJournalConfig = {
  retryAttempts: 3,
  retryDelay: 2000,
  bucketName: import.meta.env.VITE_R2_SUPERJOURNAL_BUCKET || 'atomicaether-superjournal',
  endpoint: import.meta.env.VITE_R2_ENDPOINT || 'https://62e9e6e776415c8c0c59e5497a3b396d.r2.cloudflarestorage.com'
};

const r2Service = new R2StorageService(r2Config);

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Parse query parameters
    const params = url.searchParams;
    const query: ReadQuery = {};

    // Parse startTime
    const startTimeParam = params.get('startTime');
    if (startTimeParam) {
      const startTime = parseInt(startTimeParam);
      if (!isNaN(startTime)) {
        query.startTime = startTime;
      }
    }

    // Parse endTime
    const endTimeParam = params.get('endTime');
    if (endTimeParam) {
      const endTime = parseInt(endTimeParam);
      if (!isNaN(endTime)) {
        query.endTime = endTime;
      }
    }

    // Parse status
    const status = params.get('status');
    if (status === 'active' || status === 'deleted' || status === 'all') {
      query.status = status;
    }

    // Parse limit
    const limitParam = params.get('limit');
    if (limitParam) {
      const limit = parseInt(limitParam);
      if (!isNaN(limit) && limit > 0 && limit <= 1000) {
        query.limit = limit;
      }
    }

    // Parse offset
    const offsetParam = params.get('offset');
    if (offsetParam) {
      const offset = parseInt(offsetParam);
      if (!isNaN(offset) && offset >= 0) {
        query.offset = offset;
      }
    }

    // Parse sessionId
    const sessionId = params.get('sessionId');
    if (sessionId) {
      query.sessionId = sessionId;
    }

    // Query R2
    const response = await r2Service.readEntries(query);

    return json(response, { status: 200 });

  } catch (error) {
    
    return json(
      {
        entries: [],
        total: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return json(
        { entries: [], total: 0, hasMore: false, error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }

    // Parse request body
    const query: ReadQuery = await request.json();

    // Query R2
    const response = await r2Service.readEntries(query);

    return json(response, { status: 200 });

  } catch (error) {
    
    return json(
      {
        entries: [],
        total: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
};