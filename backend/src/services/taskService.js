const taskRepository = require('../repositories/taskRepository');
const auditService = require('./auditService');
const idGenerator = require('../utils/idGenerator');
const { AUDIT_ACTIONS } = require('../utils/constants');

class TaskService {
  createTask({
    case_id,
    title,
    title_bn = null,
    description = null,
    assigned_to_role,
    assigned_to_user_id = null,
    due_date = null,
    priority = 'MEDIUM',
    actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }
  }) {
    if (!case_id) throw new Error('case_id is required to create a task');
    if (!title) throw new Error('Task title is required');
    if (!assigned_to_role) throw new Error('assigned_to_role is required');

    const id = idGenerator.taskId();
    const task = taskRepository.create({
      id,
      case_id,
      title,
      title_bn,
      description,
      assigned_to_role,
      assigned_to_user_id,
      due_date,
      priority,
      status: 'PENDING'
    });

    auditService.recordAuditEvent({
      case_id,
      action: AUDIT_ACTIONS.TASK_CREATED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_after: task,
      notes: `Task created: "${title}" assigned to ${assigned_to_role}`
    });

    return task;
  }

  updateTask(id, updates, actor = { id: 'SYSTEM', role: 'B1_DLAO_OFFICER' }) {
    const previous = taskRepository.findById(id);
    if (!previous) throw new Error(`Task ${id} not found`);

    const updated = taskRepository.update(id, updates);

    auditService.recordAuditEvent({
      case_id: previous.case_id,
      action: AUDIT_ACTIONS.TASK_UPDATED,
      actor_id: actor.id || 'SYSTEM',
      actor_role: actor.role || 'B1_DLAO_OFFICER',
      payload_before: previous,
      payload_after: updated,
      notes: `Task ${id} status updated to ${updated.status}`
    });

    return updated;
  }

  getTasksForCase(caseId) {
    return taskRepository.listByCaseId(caseId);
  }
}

module.exports = new TaskService();
