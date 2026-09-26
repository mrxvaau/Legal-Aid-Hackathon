const applicationService = require('../services/applicationService');
const duplicateDetectionService = require('../services/duplicateDetectionService');
const { validateApplicationPayload } = require('../validators/schemas');

class ApplicationController {
  createApplication(req, res, next) {
    try {
      const errors = validateApplicationPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
      }

      const actor = req.user;
      const application = applicationService.createApplication(req.body, actor);
      res.status(201).json({ success: true, data: application });
    } catch (err) {
      next(err);
    }
  }

  getApplication(req, res, next) {
    try {
      const { id } = req.params;
      const application = applicationService.getApplication(id);
      if (!application) {
        return res.status(404).json({ success: false, message: `Application ${id} not found` });
      }
      res.json({ success: true, data: application });
    } catch (err) {
      next(err);
    }
  }

  listApplications(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        intake_office: req.query.intake_office
      };
      const applications = applicationService.listApplications(filters);
      res.json({ success: true, data: applications, count: applications.length });
    } catch (err) {
      next(err);
    }
  }

  checkDuplicate(req, res, next) {
    try {
      const actor = req.user;
      const result = duplicateDetectionService.checkDuplicate(req.body, actor);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ApplicationController();
