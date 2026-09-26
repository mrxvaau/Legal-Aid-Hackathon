const applicationRepository = require('../repositories/applicationRepository');
const personRepository = require('../repositories/personRepository');
const applicationService = require('./applicationService');
const auditService = require('./auditService');
const { AUDIT_ACTIONS } = require('../utils/constants');

class SyncService {
  /**
   * Synchronize an application from the offline client queue
   * @param {Object} payload - Offline application payload with local_id & client_request_id
   * @param {Object} actor - Authenticated actor performing sync (e.g. UDC Entrepreneur)
   * @returns {Object} sync result or conflict payload
   */
  syncApplication(payload, actor = { id: 'UDC_ENTREPRENEUR', role: 'B4_UDC_ENTREPRENEUR' }) {
    // 1. Idempotency Check: if this client_request_id was already processed, return existing
    if (payload.client_request_id) {
      const existing = applicationRepository.findByClientRequestId(payload.client_request_id);
      if (existing) {
        return {
          success: true,
          synced: true,
          idempotent: true,
          local_id: payload.local_id,
          application_id: existing.id,
          application: existing,
          message: 'Already synchronized (idempotent replay)'
        };
      }
    }

    // 2. Conflict Check: if this sync is an update to an existing application
    if (payload.target_application_id) {
      const serverApp = applicationRepository.findById(payload.target_application_id);
      if (!serverApp) {
        throw new Error(`Target application ${payload.target_application_id} not found on server`);
      }

      // Check version and conflicting field states
      const baseVersion = payload.base_version || 1;
      const isOutdated = (serverApp.version || 1) > baseVersion;

      // Identify conflicting field values between local payload and current server state
      const conflictingFields = [];

      if (payload.applicant && payload.applicant.phone && payload.applicant.phone !== serverApp.applicant_phone) {
        conflictingFields.push({
          field: 'phone',
          label: 'Contact Phone Number',
          local: payload.applicant.phone,
          server: serverApp.applicant_phone
        });
      }

      if (payload.applicant && payload.applicant.district && payload.applicant.district !== serverApp.applicant_district) {
        conflictingFields.push({
          field: 'district',
          label: 'District',
          local: payload.applicant.district,
          server: serverApp.applicant_district
        });
      }

      if (payload.summary && payload.summary !== serverApp.summary) {
        conflictingFields.push({
          field: 'summary',
          label: 'Application Narrative / Grievance',
          local: payload.summary,
          server: serverApp.summary
        });
      }

      // If server is newer and has conflicting fields, trigger explicit conflict resolution
      if (isOutdated && conflictingFields.length > 0) {
        return {
          conflict: true,
          synced: false,
          local_id: payload.local_id,
          target_application_id: payload.target_application_id,
          server_version: {
            id: serverApp.id,
            version: serverApp.version,
            updated_at: serverApp.updated_at,
            summary: serverApp.summary,
            category: serverApp.category,
            applicant_phone: serverApp.applicant_phone,
            applicant_district: serverApp.applicant_district,
            status: serverApp.status
          },
          local_version: {
            local_id: payload.local_id,
            base_version: payload.base_version,
            summary: payload.summary,
            category: payload.category,
            phone: payload.applicant ? payload.applicant.phone : null,
            district: payload.applicant ? payload.applicant.district : null
          },
          conflicting_fields: conflictingFields,
          message: 'Conflict detected: Server has been modified since offline record was captured.'
        };
      }

      // No conflict: apply update to existing application
      const updated = applicationRepository.update(serverApp.id, {
        summary: payload.summary || serverApp.summary,
        summary_bn: payload.summary_bn || serverApp.summary_bn,
        category: payload.category || serverApp.category,
        intake_office: payload.intake_office || serverApp.intake_office
      });

      // Update applicant person if phone or district changed
      if (payload.applicant && serverApp.applicant_id) {
        personRepository.update(serverApp.applicant_id, {
          phone: payload.applicant.phone,
          district: payload.applicant.district
        });
      }

      auditService.recordAuditEvent({
        application_id: serverApp.id,
        action: AUDIT_ACTIONS.OFFLINE_SYNC_COMPLETED,
        actor_id: actor.id || 'PER-UDC-B4',
        actor_role: actor.role || 'B4_UDC_ENTREPRENEUR',
        payload_after: updated,
        notes: `Offline modification synchronized for application ${serverApp.id} (device temp ID: ${payload.local_id})`
      });

      return {
        success: true,
        synced: true,
        local_id: payload.local_id,
        application_id: updated.id,
        application: updated,
        message: 'Offline changes successfully synchronized with server'
      };
    }

    // 3. New Application Sync
    const newApp = applicationService.createApplication(payload, actor);

    auditService.recordAuditEvent({
      application_id: newApp.id,
      action: AUDIT_ACTIONS.OFFLINE_SYNC_COMPLETED,
      actor_id: actor.id || 'PER-UDC-B4',
      actor_role: actor.role || 'B4_UDC_ENTREPRENEUR',
      payload_after: newApp,
      notes: `New offline intake synchronized from local device ${payload.local_id || 'unknown'} -> official Application ID ${newApp.id}`
    });

    return {
      success: true,
      synced: true,
      local_id: payload.local_id,
      application_id: newApp.id,
      application: newApp,
      message: 'Offline intake successfully registered as official Application record'
    };
  }

  /**
   * Explicitly resolve synchronization conflict
   * @param {Object} resolution - { application_id, resolution_strategy, merged_data, local_id }
   * @param {Object} actor - Authenticated user resolving conflict (UDC or DLAO Officer)
   */
  resolveConflict(resolution, actor = { id: 'PER-OFFICER-B1', role: 'B1_DLAO_OFFICER' }) {
    const { application_id, resolution_strategy, merged_data, local_id } = resolution;

    const serverApp = applicationRepository.findById(application_id);
    if (!serverApp) {
      throw new Error(`Application ${application_id} not found for conflict resolution`);
    }

    let finalFields = {};
    if (resolution_strategy === 'KEEP_LOCAL') {
      finalFields = {
        summary: merged_data.summary || serverApp.summary,
        summary_bn: merged_data.summary_bn || serverApp.summary_bn,
        category: merged_data.category || serverApp.category
      };
      if (merged_data.phone || merged_data.district) {
        personRepository.update(serverApp.applicant_id, {
          phone: merged_data.phone,
          district: merged_data.district
        });
      }
    } else if (resolution_strategy === 'KEEP_SERVER') {
      // Retain current server values as ground truth
      finalFields = {
        summary: serverApp.summary,
        summary_bn: serverApp.summary_bn,
        category: serverApp.category
      };
    } else if (resolution_strategy === 'MERGE') {
      finalFields = {
        summary: merged_data.summary || serverApp.summary,
        summary_bn: merged_data.summary_bn || serverApp.summary_bn,
        category: merged_data.category || serverApp.category
      };
      if (merged_data.phone || merged_data.district) {
        personRepository.update(serverApp.applicant_id, {
          phone: merged_data.phone || serverApp.applicant_phone,
          district: merged_data.district || serverApp.applicant_district
        });
      }
    } else {
      throw new Error(`Invalid resolution strategy: ${resolution_strategy}. Must be KEEP_LOCAL, KEEP_SERVER, or MERGE.`);
    }

    const updatedApp = applicationRepository.update(application_id, finalFields);

    // Record immutable audit event for conflict resolution decision
    auditService.recordAuditEvent({
      application_id: application_id,
      action: AUDIT_ACTIONS.OFFLINE_SYNC_CONFLICT_RESOLVED,
      actor_id: actor.id || 'PER-OFFICER-B1',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_before: {
        server_state: {
          summary: serverApp.summary,
          phone: serverApp.applicant_phone,
          district: serverApp.applicant_district,
          version: serverApp.version
        }
      },
      payload_after: {
        strategy: resolution_strategy,
        resolved_state: updatedApp,
        local_id: local_id || null
      },
      notes: `Offline sync conflict resolved for Application ${application_id} using decision strategy: ${resolution_strategy}`
    });

    return {
      success: true,
      resolved: true,
      application_id: application_id,
      resolution_strategy,
      application: updatedApp,
      message: `Conflict successfully resolved using ${resolution_strategy}`
    };
  }
}

module.exports = new SyncService();
