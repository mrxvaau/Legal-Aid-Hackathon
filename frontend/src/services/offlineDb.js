/**
 * IndexedDB Offline Queue Service for ADLASB
 * 
 * Provides client-side persistent storage for UDC assisted intakes captured
 * during disconnected or unreliable network conditions in grassroots locations (e.g. CHT).
 */

const DB_NAME = 'adlasb_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'local_id' });
        store.createIndex('sync_status', 'sync_status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function generateLocalUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'TEMP-UUID-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  }
  return 'TEMP-UUID-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const offlineDb = {
  /**
   * Save a newly captured application into the offline IndexedDB queue
   * @param {Object} applicationData - Form data and provenance payload
   * @param {Object} actor - UDC Entrepreneur actor metadata
   * @returns {Promise<Object>} Enqueued record with temporary UUID
   */
  async enqueueApplication(applicationData, actor = { id: 'PER-UDC-B4', role: 'B4_UDC_ENTREPRENEUR' }) {
    const db = await openDatabase();
    const localId = generateLocalUuid();
    const clientRequestId = 'REQ-' + localId;

    const record = {
      local_id: localId,
      client_request_id: clientRequestId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      actor: {
        id: actor.id || 'PER-UDC-B4',
        role: actor.role || 'B4_UDC_ENTREPRENEUR',
        office: actor.office || 'Baghaichhari UDC'
      },
      application_payload: {
        ...applicationData,
        client_request_id: clientRequestId,
        local_id: localId
      },
      sync_status: 'PENDING_SYNC', // PENDING_SYNC | SYNCING | SYNCED | CONFLICT | FAILED
      retry_count: 0,
      last_sync_attempt: null,
      server_application_id: null,
      conflict_data: null,
      error_message: null
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Retrieve all records currently in the IndexedDB queue
   * @returns {Promise<Array>}
   */
  async getAllQueue() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        // Sort newest first
        const records = (req.result || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Update an existing record in the queue (e.g. status, error, conflict diff)
   * @param {string} localId - Temporary UUID
   * @param {Object} updates - Fields to merge
   */
  async updateQueueItem(localId, updates = {}) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(localId);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) {
          reject(new Error(`Record ${localId} not found in offline store`));
          return;
        }

        const merged = {
          ...item,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const putReq = store.put(merged);
        putReq.onsuccess = () => resolve(merged);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  /**
   * Delete an item from the queue
   * @param {string} localId 
   */
  async removeQueueItem(localId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(localId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Calculate summary statistics for the Sync Center
   */
  async getQueueStats() {
    const items = await this.getAllQueue();
    const stats = {
      pending: 0,
      syncing: 0,
      synced: 0,
      conflict: 0,
      failed: 0,
      total: items.length
    };

    for (const item of items) {
      if (item.sync_status === 'PENDING_SYNC') stats.pending++;
      else if (item.sync_status === 'SYNCING') stats.syncing++;
      else if (item.sync_status === 'SYNCED') stats.synced++;
      else if (item.sync_status === 'CONFLICT') stats.conflict++;
      else if (item.sync_status === 'FAILED') stats.failed++;
    }

    return stats;
  }
};

export default offlineDb;
