const fs = require('fs');
const path = require('path');
const { getDb } = require('./connection');
const { ROLES, ROLE_METADATA, ROLE_PERMISSIONS } = require('../utils/constants');

function migrate(dbInstance = null) {
  const db = dbInstance || getDb();
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema tables and indexes
  db.exec(schemaSql);

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
