const { getDb } = require('../db/connection');

class TaskRepository {
  create(task) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, case_id, title, title_bn, description, assigned_to_role,
        assigned_to_user_id, due_date, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.case_id,
      task.title,
      task.title_bn || null,
      task.description || null,
      task.assigned_to_role,
      task.assigned_to_user_id || null,
      task.due_date || null,
      task.priority || 'MEDIUM',
      task.status || 'PENDING'
    );

    return this.findById(task.id);
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  }

  update(id, updates) {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const status = updates.status !== undefined ? updates.status : current.status;
    const completedAt = updates.completed_at !== undefined ? updates.completed_at : (status === 'COMPLETED' ? new Date().toISOString() : current.completed_at);
    const completedBy = updates.completed_by !== undefined ? updates.completed_by : current.completed_by;

    db.prepare(`
      UPDATE tasks
      SET status = ?, completed_at = ?, completed_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, completedAt, completedBy, id);

    return this.findById(id);
  }

  listByCaseId(caseId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM tasks
      WHERE case_id = ?
      ORDER BY 
        CASE priority 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END,
        created_at DESC
    `).all(caseId);
  }
}

module.exports = new TaskRepository();
