import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

const CATEGORY_KEYS = {
  products: 'catProducts',
  rent: 'catRent',
  utilities: 'catUtilities',
  other: 'catOther',
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function FinancePage() {
  const { estId } = useOutletContext();
  const { t } = useTranslation();
  const [range, setRange] = useState(defaultRange);
  const [summary, setSummary] = useState(null);
  const [staff, setStaff] = useState([]);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: 'products',
    description: '',
    staffId: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.stats(estId, range).then((data) => setSummary(data.summary));
    api.finance.list(estId, range).then(setRecords);
  }, [estId, range]);

  useEffect(() => {
    api.staff.list(estId).then(setStaff);
  }, [estId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitFinance = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.finance.create(estId, {
        type: form.type,
        amount: Number(form.amount),
        category: form.category,
        description: form.description,
        staffId: form.type === 'salary' ? form.staffId : undefined,
        date: form.date,
      });
      setForm((f) => ({ ...f, amount: '', description: '' }));
      load();
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async (id) => {
    await api.finance.delete(estId, id);
    load();
  };

  const s = summary || {};

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('admin.finance')}</h2>

      <div className="stats-filters card" style={{ marginBottom: 20 }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('admin.dateFrom')}</label>
            <input
              className="form-input stats-date-input"
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('admin.dateTo')}</label>
            <input
              className="form-input stats-date-input"
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{Math.round(s.totalExpenses || 0).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.expenses')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(s.totalSalaries || 0).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.salaries')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(s.salaryBase || 0).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.baseSalary')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(s.salaryCommissions || 0).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.commissionEarned')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(s.salaryPaid || 0).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.salaryPaid')}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title">{t('admin.addFinanceRecord')}</h3>
        <form onSubmit={submitFinance}>
          <div className="form-row">
            <div className="form-group">
              <label>{t('admin.recordType')}</label>
              <select
                className="form-input stats-select"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="expense">{t('admin.expense')}</option>
                <option value="salary">{t('admin.salary')}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('admin.amount')}</label>
              <input
                className="form-input stats-date-input"
                type="number"
                min="1"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>
          {form.type === 'expense' ? (
            <div className="form-group">
              <label>{t('admin.expenseCategory')}</label>
              <select
                className="form-input stats-select"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="products">{t('admin.catProducts')}</option>
                <option value="rent">{t('admin.catRent')}</option>
                <option value="utilities">{t('admin.catUtilities')}</option>
                <option value="other">{t('admin.catOther')}</option>
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>{t('admin.staffMember')}</label>
              <select
                className="form-input stats-select"
                value={form.staffId}
                required
                onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
              >
                <option value="">—</option>
                {staff.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({t(`roles.${m.role}`)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>{t('admin.description')}</label>
            <input
              className="form-input stats-date-input"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t('admin.descriptionPlaceholder')}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.date')}</label>
            <input
              className="form-input stats-date-input"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t('common.loading') : t('common.add')}
          </button>
        </form>
      </div>

      {records.length > 0 ? (
        <div className="card">
          <h3 className="card-title">{t('admin.financeHistory')}</h3>
          {records.map((r) => (
            <div key={r._id} className="table-row">
              <div>
                <strong>
                  {r.type === 'salary' ? t('admin.salary') : t('admin.expense')}
                  {r.staff?.name ? ` — ${r.staff.name}` : ''}
                </strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {new Date(r.date).toLocaleDateString()}
                  {r.description ? ` · ${r.description}` : ''}
                  {r.category && r.type === 'expense'
                    ? ` · ${t(`admin.${CATEGORY_KEYS[r.category] || 'catOther'}`)}`
                    : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 700 }}>{r.amount.toLocaleString()} ₸</span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => removeRecord(r._id)}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <p>{t('admin.financeEmpty')}</p>
        </div>
      )}
    </div>
  );
}
