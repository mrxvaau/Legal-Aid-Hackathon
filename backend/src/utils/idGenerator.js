const crypto = require('crypto');

function generateId(prefix = 'GEN') {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${dateStr}-${random}`;
}

function generateShortId(prefix = 'ID') {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
}

module.exports = {
  applicationId: () => generateId('APP'),
  caseId: () => generateId('CASE'),
  personId: () => generateShortId('PER'),
  taskId: () => generateShortId('TSK'),
  referralId: () => generateShortId('REF'),
  incidentId: () => generateShortId('INC'),
  evidenceId: () => generateId('EV'),
  provenanceId: () => generateShortId('PRV'),
  auditId: () => generateShortId('AUD')
};

