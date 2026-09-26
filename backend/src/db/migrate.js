const fs = require('fs');
const path = require('path');
const { getDb } = require('./connection');
const { ROLES, ROLE_METADATA, ROLE_PERMISSIONS } = require('../utils/constants');

function ensureColumn(db, table, column, definition) {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    if (tableInfo.length > 0 && !tableInfo.some(col => col.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (e) {
    // Table may not exist yet, schema.sql will create it with full columns
  }
}

function migrate(dbInstance = null) {
  const db = dbInstance || getDb();
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Pre-schema incremental column additions for existing databases
  ensureColumn(db, 'cases', 'filing_date', "TEXT DEFAULT (datetime('now'))");
  ensureColumn(db, 'cases', 'lawyer_last_active_at', 'TEXT');
  ensureColumn(db, 'cases', 'lawyer_status', "TEXT DEFAULT 'ACTIVE'");
  ensureColumn(db, 'cases', 'deadline_alert_level', "TEXT DEFAULT 'NORMAL'");
  ensureColumn(db, 'cases', 'citizen_inquiry_code', 'TEXT');

  ensureColumn(db, 'incident_links', 'is_sensitive_evidence', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'incident_links', 'evidence_privacy_level', "TEXT DEFAULT 'STANDARD'");
  ensureColumn(db, 'incident_links', 'redacted_summary', 'TEXT');

  ensureColumn(db, 'referrals', 'target_authority_type', "TEXT DEFAULT 'DLAO'");
  ensureColumn(db, 'referrals', 'acknowledgement_status', "TEXT DEFAULT 'UNACKNOWLEDGED'");
  ensureColumn(db, 'referrals', 'assigned_officer_id', 'TEXT');
  ensureColumn(db, 'referrals', 'acknowledged_at', 'TEXT');

  ensureColumn(db, 'provenance_log', 'is_secondhand_report', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'provenance_log', 'reported_for_person_id', 'TEXT');

  ensureColumn(db, 'applications', 'client_request_id', 'TEXT');
  ensureColumn(db, 'applications', 'version', 'INTEGER DEFAULT 1');
  ensureColumn(db, 'applications', 'sync_status', "TEXT DEFAULT 'SYNCED'");

  // Execute schema tables, triggers, and indexes
  db.exec(schemaSql);
  try {
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_client_req ON applications(client_request_id) WHERE client_request_id IS NOT NULL').run();
  } catch (e) {}

  // Populate roles and permissions
  const insertRoleStmt = db.prepare(`
    INSERT INTO roles (role_id, role_code, name_en, name_bn, description, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(role_id) DO UPDATE SET
      role_code = excluded.role_code,
      name_en = excluded.name_en,
      name_bn = excluded.name_bn,
      description = excluded.description,
      permissions_json = excluded.permissions_json
  `);

  const tx = db.transaction(() => {
    for (const [roleKey, roleMeta] of Object.entries(ROLE_METADATA)) {
      const permissions = ROLE_PERMISSIONS[roleKey] || [];
      insertRoleStmt.run(
        roleKey,
        roleMeta.code,
        roleMeta.nameEn,
        roleMeta.nameBn,
        roleMeta.description,
        JSON.stringify(permissions)
      );
    }
  });

  tx();
  return true;
}

if (require.main === module) {
  try {
    migrate();
    console.log('Database migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

module.exports = { migrate };
