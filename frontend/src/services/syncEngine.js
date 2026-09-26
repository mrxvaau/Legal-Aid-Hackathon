import offlineDb from './offlineDb';
import api from './api';

export const syncEngine = {
  /**
   * Run synchronization pass for all pending and failed offline items
   * @param {Function} onProgress - Optional callback for status changes
   * @returns {Promise<Object>} Final sync summary
   */
  async syncAllPending(onProgress = null) {
    const queue = await offlineDb.getAllQueue();
    const toSync = queue.filter(item => item.sync_status === 'PENDING_SYNC' || item.sync_status === 'FAILED');

    const results = {
      attempted: toSync.length,
      synced: 0,
      conflicts: 0,
      failed: 0
    };

    for (const item of toSync) {
      await offlineDb.updateQueueItem(item.local_id, {
        sync_status: 'SYNCING',
        last_sync_attempt: new Date().toISOString()
      });

      if (onProgress) onProgress({ item, status: 'SYNCING' });

      try {
        const response = await api.syncApplication(item.application_payload);

        // Conflict check
        if (response.conflict) {
          await offlineDb.updateQueueItem(item.local_id, {
            sync_status: 'CONFLICT',
            conflict_data: response
          });
          results.conflicts++;
          if (onProgress) onProgress({ item, status: 'CONFLICT', response });
        } else {
          // Success
          await offlineDb.updateQueueItem(item.local_id, {
            sync_status: 'SYNCED',
            server_application_id: response.application_id || response.data?.id,
            conflict_data: null,
            error_message: null
          });
          results.synced++;
          if (onProgress) onProgress({ item, status: 'SYNCED', response });
        }
      } catch (err) {
        // If server responded with 409 conflict
        if (err.status === 409 && err.data?.conflict) {
          await offlineDb.updateQueueItem(item.local_id, {
            sync_status: 'CONFLICT',
            conflict_data: err.data
          });
          results.conflicts++;
          if (onProgress) onProgress({ item, status: 'CONFLICT', response: err.data });
        } else {
          // General sync failure
          await offlineDb.updateQueueItem(item.local_id, {
            sync_status: 'FAILED',
            retry_count: (item.retry_count || 0) + 1,
            error_message: err.message || 'Network or server error during sync'
          });
          results.failed++;
          if (onProgress) onProgress({ item, status: 'FAILED', error: err.message });
        }
      }
    }

    return results;
  },

  /**
   * Resolve an active conflict
   */
  async resolveConflict(localId, resolutionStrategy, mergedData) {
    const item = await offlineDb.getQueueItem?.(localId) || (await offlineDb.getAllQueue()).find(q => q.local_id === localId);
    if (!item) throw new Error(`Queue item ${localId} not found`);

    const appId = item.conflict_data?.target_application_id || item.conflict_data?.server_version?.id;
    if (!appId) throw new Error('Missing target application ID for conflict resolution');

    const res = await api.resolveConflict({
      application_id: appId,
      local_id: localId,
      resolution_strategy: resolutionStrategy,
      merged_data: mergedData
    });

    await offlineDb.updateQueueItem(localId, {
      sync_status: 'SYNCED',
      server_application_id: appId,
      conflict_data: null,
      error_message: null
    });

    return res;
  }
};

export default syncEngine;
