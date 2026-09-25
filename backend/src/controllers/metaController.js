const {
  ROLES,
  ROLE_METADATA,
  CASE_STATES,
  CASE_STATE_METADATA,
  PROVENANCE_SOURCES,
  ROLE_PERMISSIONS
} = require('../utils/constants');

class MetaController {
  getMetadata(req, res) {
    res.json({
      success: true,
      roles: ROLE_METADATA,
      case_states: CASE_STATE_METADATA,
      provenance_sources: PROVENANCE_SOURCES,
      permissions: ROLE_PERMISSIONS
    });
  }

  getHealth(req, res) {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'ADLASB Digital Legal Aid System API',
      version: '1.0.0'
    });
  }
}

module.exports = new MetaController();
