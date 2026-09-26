const { getDb } = require('../db/connection');

class ReportService {
  /**
   * Generate an automated summary report of DLAO case operations
   */
  getCaseSummaryReport(actor = { id: 'SYSTEM', role: 'B7_DLAO_ADMIN' }) {
    const db = getDb();

    // 1. Total Case Count
    const totalCasesRow = db.prepare('SELECT count(*) as count FROM cases').get();
    const totalCases = totalCasesRow ? totalCasesRow.count : 0;

    // 2. Counts by Status
    const statusRows = db.prepare(`
      SELECT status, count(*) as count 
      FROM cases 
      GROUP BY status
      ORDER BY count DESC
    `).all();
    const casesByStatus = {};
    for (const r of statusRows) {
      casesByStatus[r.status] = r.count;
    }

    // 3. Counts by Category
    const categoryRows = db.prepare(`
      SELECT category, count(*) as count 
      FROM cases 
      GROUP BY category
      ORDER BY count DESC
    `).all();
    const casesByCategory = {};
    for (const r of categoryRows) {
      casesByCategory[r.category] = r.count;
    }

    // 4. Counts by Priority
    const priorityRows = db.prepare(`
      SELECT priority, count(*) as count 
      FROM cases 
      GROUP BY priority
      ORDER BY count DESC
    `).all();
    const casesByPriority = {};
    for (const r of priorityRows) {
      casesByPriority[r.priority] = r.count;
    }

    // 5. Lawyer Inactivity / Accountability Summary
    const lawyerStatusRows = db.prepare(`
      SELECT lawyer_status, count(*) as count 
      FROM cases 
      WHERE assigned_lawyer_id IS NOT NULL
      GROUP BY lawyer_status
    `).all();
    const lawyerAccountabilitySummary = {};
    for (const r of lawyerStatusRows) {
      lawyerAccountabilitySummary[r.lawyer_status] = r.count;
    }

    // 6. Overdue Tasks List
    const overdueTasks = db.prepare(`
      SELECT 
        t.id,
        t.case_id,
        t.title,
        t.assigned_to_role,
        t.assigned_to_user_id,
        t.due_date,
        t.priority,
        t.status,
        c.case_number,
        c.title AS case_title
      FROM tasks t
      LEFT JOIN cases c ON t.case_id = c.id
      WHERE t.status != 'COMPLETED' 
        AND t.status != 'CANCELLED' 
        AND t.due_date IS NOT NULL 
        AND date(t.due_date) < date('now')
      ORDER BY t.due_date ASC
    `).all();

    // 7. Open Tasks Count
    const openTasksRow = db.prepare(`
      SELECT count(*) as count 
      FROM tasks 
      WHERE status IN ('PENDING', 'IN_PROGRESS')
    `).get();

    return {
      report_name: 'DLAO Operations & Case Portfolio Summary',
      generated_at: new Date().toISOString(),
      generated_by: {
        actor_id: actor.id,
        role: actor.role,
        office: actor.office || 'DLAO Central Registry'
      },
      summary_metrics: {
        total_cases: totalCases,
        open_tasks_count: openTasksRow ? openTasksRow.count : 0,
        overdue_tasks_count: overdueTasks.length
      },
      cases_by_status: casesByStatus,
      cases_by_category: casesByCategory,
      cases_by_priority: casesByPriority,
      lawyer_accountability_summary: lawyerAccountabilitySummary,
      overdue_tasks: overdueTasks,
      operational_notice: 'Generated automatically from existing relational case records and task deadlines. No physical dossier lookup required.'
    };
  }
}

module.exports = new ReportService();
