const syncService = require('../services/syncService');
const aiAssistantService = require('../services/aiAssistantService');

class SyncController {
  syncApplication(req, res, next) {
    try {
      const actor = req.user;
      const result = syncService.syncApplication(req.body, actor);

      if (result.conflict) {
        return res.status(409).json(result);
      }

      const statusCode = result.idempotent ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  }

  resolveConflict(req, res, next) {
    try {
      const actor = req.user;
      const result = syncService.resolveConflict(req.body, actor);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  aiPreAssess(req, res, next) {
    try {
      const result = aiAssistantService.preAssess(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SyncController();
