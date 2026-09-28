const express = require('express');
const router = express.Router();
const personRepository = require('../repositories/personRepository');
const { getDb } = require('../db/connection');
const idGenerator = require('../utils/idGenerator');
const { ROLES } = require('../utils/constants');

// GET /api/people - List all people with associated roles
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const people = personRepository.list();
    const userRoles = db.prepare('SELECT * FROM user_roles').all();
    const roleMap = {};
    for (const ur of userRoles) {
      roleMap[ur.user_id] = ur;
    }

    const enriched = people.map(p => {
      const ur = roleMap[p.id];
      let resolvedRole = ur?.role_id;
      if (!resolvedRole) {
        if (p.socio_economic_profile?.role_code) {
          resolvedRole = p.socio_economic_profile.role_code;
        } else if (p.socio_economic_profile?.is_representative) {
          resolvedRole = 'AUTHORIZED_REPRESENTATIVE';
        } else if (p.socio_economic_profile?.lawyer) {
          resolvedRole = ROLES.B5_PANEL_LAWYER;
        } else if (p.socio_economic_profile?.staff) {
          resolvedRole = p.socio_economic_profile?.role_code || ROLES.B1_DLAO_OFFICER;
        } else {
          resolvedRole = 'CITIZEN_APPLICANT';
        }
      }

      return {
        ...p,
        role_id: resolvedRole,
        office: ur?.office || p.district ? `DLAO ${p.district}` : 'DLAO Dhaka'
      };
    });

    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/people/register - Register a new person with role
router.post('/register', (req, res, next) => {
  try {
    const {
      role_category, // 'citizen' | 'officer' | 'lawyer'
      full_name,
      full_name_bn,
      phone,
      national_id,
      division = 'Dhaka',
      district = 'Dhaka',
      gender = 'UNKNOWN',
      // Citizen specific
      is_representative = false,
      represented_person = null,
      // Officer specific
      staff_id = null,
      sub_role = null,
      office = null,
      // Lawyer specific
      bar_id = null,
      practice_area = null
    } = req.body;

    if (!full_name || full_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    const db = getDb();
    const personId = idGenerator.personId();

    let socioProfile = {};
    let assignedRoleId = 'CITIZEN_APPLICANT';
    let assignedOffice = office || `DLAO ${district}`;

    if (role_category === 'citizen') {
      assignedRoleId = is_representative ? 'AUTHORIZED_REPRESENTATIVE' : 'CITIZEN_APPLICANT';
      socioProfile = {
        role: 'citizen',
        is_representative: !!is_representative,
        represented_person: represented_person || null
      };
    } else if (role_category === 'officer') {
      assignedRoleId = sub_role || ROLES.B1_DLAO_OFFICER;
      socioProfile = {
        staff: true,
        staff_id: staff_id || personId,
        role_code: assignedRoleId,
        sub_role: assignedRoleId
      };
    } else if (role_category === 'lawyer') {
      assignedRoleId = ROLES.B5_PANEL_LAWYER;
      socioProfile = {
        lawyer: true,
        bar_id: bar_id || `BAR-${Date.now().toString().slice(-4)}`,
        practice_area: practice_area || 'General'
      };
    }

    // Insert into people table using existing person repository logic
    const createdPerson = personRepository.create({
      id: personId,
      national_id: national_id && national_id.trim() !== '' ? national_id.trim() : null,
      full_name: full_name.trim(),
      full_name_bn: full_name_bn && full_name_bn.trim() !== '' ? full_name_bn.trim() : null,
      gender,
      phone: phone && phone.trim() !== '' ? phone.trim() : null,
      district,
      division,
      socio_economic_profile: socioProfile
    });

    // Also register in user_roles for role mapping consistency
    try {
      db.prepare(`
        INSERT OR REPLACE INTO user_roles (id, user_id, user_name, role_id, office)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `UR-${personId}`,
        personId,
        full_name.trim(),
        assignedRoleId,
        assignedOffice
      );
    } catch (e) {
      // Ignored if roles table FK or constraint prevents, socioProfile stores role
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        ...createdPerson,
        role_id: assignedRoleId,
        office: assignedOffice,
        staff_id: socioProfile.staff_id || null,
        bar_id: socioProfile.bar_id || null
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/people/lookup - Lookup person by identifier & role category
router.post('/lookup', (req, res, next) => {
  try {
    const { role_category, identifier } = req.body;
    if (!identifier || identifier.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required (Phone, NID, Staff ID, or Panel ID)'
      });
    }

    const queryTerm = identifier.trim().toLowerCase();
    const db = getDb();
    const allPeople = personRepository.list();
    const userRoles = db.prepare('SELECT * FROM user_roles').all();
    const roleMap = {};
    for (const ur of userRoles) {
      roleMap[ur.user_id] = ur;
    }

    // Match candidate
    let matchedPerson = null;
    let matchedRole = null;

    for (const p of allPeople) {
      const ur = roleMap[p.id];
      const pRole = ur?.role_id || p.socio_economic_profile?.role_code || (p.socio_economic_profile?.lawyer ? 'B5_PANEL_LAWYER' : (p.socio_economic_profile?.is_representative ? 'AUTHORIZED_REPRESENTATIVE' : 'CITIZEN_APPLICANT'));

      // Check role category alignment
      let matchesRoleCategory = false;
      if (role_category === 'citizen') {
        matchesRoleCategory = pRole === 'CITIZEN_APPLICANT' || pRole === 'AUTHORIZED_REPRESENTATIVE' || !p.socio_economic_profile?.staff;
      } else if (role_category === 'officer') {
        matchesRoleCategory = [
          ROLES.B1_DLAO_OFFICER,
          ROLES.B2_LEGAL_AID_OFFICER,
          ROLES.B3_HELPLINE_AGENT,
          ROLES.B4_UDC_ENTREPRENEUR,
          ROLES.B6_RECEIVING_DLAO,
          ROLES.B7_DLAO_ADMIN
        ].includes(pRole) || p.socio_economic_profile?.staff;
      } else if (role_category === 'lawyer') {
        matchesRoleCategory = pRole === ROLES.B5_PANEL_LAWYER || p.socio_economic_profile?.lawyer;
      } else {
        matchesRoleCategory = true;
      }

      if (!matchesRoleCategory) continue;

      // Match identifier against phone, NID, ID, staff_id, bar_id
      const idMatch = p.id && p.id.toLowerCase() === queryTerm;
      const nidMatch = p.national_id && p.national_id.toLowerCase() === queryTerm;
      const phoneMatch = p.phone && (
        p.phone.toLowerCase() === queryTerm ||
        p.phone.toLowerCase().replace(/[^0-9]/g, '') === queryTerm.replace(/[^0-9]/g, '') ||
        (queryTerm.length >= 8 && p.phone.toLowerCase().includes(queryTerm))
      );
      const staffIdMatch = p.socio_economic_profile?.staff_id && p.socio_economic_profile.staff_id.toLowerCase() === queryTerm;
      const barIdMatch = p.socio_economic_profile?.bar_id && p.socio_economic_profile.bar_id.toLowerCase() === queryTerm;
      const nameMatch = p.full_name && p.full_name.toLowerCase() === queryTerm;

      if (idMatch || nidMatch || phoneMatch || staffIdMatch || barIdMatch || nameMatch) {
        matchedPerson = p;
        matchedRole = pRole;
        break;
      }
    }

    if (!matchedPerson) {
      return res.status(404).json({
        success: false,
        not_found: true,
        message: 'পাওয়া যায়নি — অনুগ্রহ করে নিবন্ধন করুন / Not found — please register'
      });
    }

    res.json({
      success: true,
      data: {
        ...matchedPerson,
        role_id: matchedRole,
        office: roleMap[matchedPerson.id]?.office || `DLAO ${matchedPerson.district}`
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
