import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import api from '../services/api';

const PRIORITY_BADGES = {
  URGENT: { bg: '#FEE2E2', text: '#991B1B' },
  HIGH: { bg: '#FFEDD5', text: '#9A3412' },
  MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
  LOW: { bg: '#F1F5F9', text: '#475569' }
};

export default function TasksCard({ caseId, tasks = [], onRefresh }) {
  const { language, t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    title_bn: '',
    description: '',
    assigned_to_role: 'B5_PANEL_LAWYER',
    due_date: '',
    priority: 'MEDIUM'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createCaseTask(caseId, formData);
      setShowAddForm(false);
      setFormData({
        title: '',
        title_bn: '',
        description: '',
        assigned_to_role: 'B5_PANEL_LAWYER',
        due_date: '',
        priority: 'MEDIUM'
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-box">
      <div className="card-header">
        <div>
          <h3 className="card-title">✅ {t('tasks.title')}</h3>
          <p className="card-subtitle">Accountability tracking and hearing SLA compliance</p>
        </div>
        <button
          className="btn-secondary-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? t('common.cancel') : `+ ${t('tasks.createTask')}`}
        </button>
      </div>

      {error && <div className="inline-error">⚠️ {error}</div>}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="inline-form-box">
          <div className="form-grid-2">
            <div>
              <label className="form-label">{t('tasks.taskTitle')} (EN) *</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Submit Progress Report"
              />
            </div>
            <div>
              <label className="form-label">{t('tasks.taskTitle')} (BN)</label>
              <input
                type="text"
                className="form-input"
                value={formData.title_bn}
                onChange={(e) => setFormData({ ...formData, title_bn: e.target.value })}
                placeholder="e.g. অগ্রগতি প্রতিবেদন দাখিল"
              />
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '10px' }}>
            <div>
              <label className="form-label">{t('tasks.assignedRole')} *</label>
              <select
                className="form-input"
                value={formData.assigned_to_role}
                onChange={(e) => setFormData({ ...formData, assigned_to_role: e.target.value })}
              >
                <option value="B1_DLAO_OFFICER">B1 DLAO Officer</option>
                <option value="B2_LEGAL_AID_OFFICER">B2 Legal Aid Officer / Mediator</option>
                <option value="B5_PANEL_LAWYER">B5 Panel Lawyer</option>
                <option value="B7_DLAO_ADMIN">B7 DLAO Admin / Support Staff</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select
                className="form-input"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="form-label">{t('tasks.dueDate')}</label>
              <input
                type="date"
                className="form-input"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label className="form-label">Description / Instructions</label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Action items, required legal filings, or court expectations..."
            />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm" disabled={submitting}>
              {submitting ? 'Creating...' : t('common.save')}
            </button>
          </div>
        </form>
      )}

      <div className="task-list">
        {tasks.length === 0 ? (
          <p className="empty-hint">{t('common.none')}</p>
        ) : (
          tasks.map((task) => {
            const pStyle = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM;
            const displayTitle = language === 'bn' && task.title_bn ? task.title_bn : task.title;

            return (
              <div key={task.id} className="task-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    className={`task-status-pill ${task.status === 'COMPLETED' ? 'completed' : 'pending'}`}
                  >
                    {task.status === 'COMPLETED' ? '✓ DONE' : '⏳ PENDING'}
                  </span>
                  <span className="task-title-text">{displayTitle}</span>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: pStyle.bg,
                      color: pStyle.text
                    }}
                  >
                    {task.priority}
                  </span>
                </div>

                <div className="task-meta">
                  <span>Assigned to: <strong>{task.assigned_to_role}</strong></span>
                  {task.due_date && <span>📅 Due: {task.due_date}</span>}
                </div>

                {task.description && <p className="task-desc">{task.description}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
