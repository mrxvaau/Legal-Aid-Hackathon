const { CASE_STATES, ROLES, PROVENANCE_SOURCES } = require('../utils/constants');

function validateApplicationPayload(body) {
  const errors = [];
  if (!body.summary) errors.push('summary is required');
  if (!body.applicant_id && !body.applicant) {
    errors.push('Either applicant_id or applicant object with full_name is required');
  }
  if (body.applicant && !body.applicant.full_name) {
    errors.push('applicant.full_name is required');
  }
  if (body.applicant && (!body.applicant.district || !body.applicant.division)) {
    errors.push('applicant district and division are required');
  }
  return errors;
}

function validateCasePayload(body) {
  const errors = [];
  if (!body.application_id) errors.push('application_id is required');
  if (body.status && !Object.values(CASE_STATES).includes(body.status)) {
    errors.push(`status must be one of: ${Object.values(CASE_STATES).join(', ')}`);
  }
  return errors;
}

function validateTaskPayload(body) {
  const errors = [];
  if (!body.title) errors.push('title is required');
  if (!body.assigned_to_role) errors.push('assigned_to_role is required');
  return errors;
}

function validateReferralPayload(body) {
  const errors = [];
  if (!body.referral_type) errors.push('referral_type is required');
  if (!body.referring_office) errors.push('referring_office is required');
  if (!body.receiving_office) errors.push('receiving_office is required');
  if (!body.reason) errors.push('reason is required');
  return errors;
}

function validateIncidentPayload(body) {
  const errors = [];
  if (!body.incident_type) errors.push('incident_type is required');
  if (!body.incident_date) errors.push('incident_date is required');
  if (!body.location) errors.push('location is required');
  if (!body.description) errors.push('description is required');
  return errors;
}

function validatePersonLinkPayload(body) {
  const errors = [];
  if (!body.person_id && !body.person) {
    errors.push('Either person_id or person object is required');
  }
  if (!body.role_in_case) {
    errors.push('role_in_case is required');
  }
  return errors;
}

module.exports = {
  validateApplicationPayload,
  validateCasePayload,
  validateTaskPayload,
  validateReferralPayload,
  validateIncidentPayload,
  validatePersonLinkPayload
};
