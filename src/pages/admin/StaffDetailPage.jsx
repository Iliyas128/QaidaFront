import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../../api';
import StatusBadge from '../../components/StatusBadge';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function StaffDetailPage() {
  const { id: estId, staffId } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [payForm, setPayForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.staff.stats(estId, staffId, range).then((res) => {
      setData(res);
      setPayForm({
        payMode: res.staff.payMode || 'fixed',
        baseSalary: res.staff.baseSalary || 0,
        commissionPercent: res.staff.commissionPercent || 0,
      });
    });
  }, [estId, staffId, range]);

  useEffect(() => {
    load();
  }, [load]);

  const savePay = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.staff.update(estId, staffId, payForm);
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!data || !payForm) return <p className="panel-loading">{t('common.loading')}</p>;

  const { staff, summary, daily, orders, salaryPayments } = data;

  return (
    <div>
      <Link
        to={`/admin/establishments/${estId}/staff`}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 16, display: 'inline-block' }}
      >
        ← {t('admin.staff')}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{staff.name}</h2>
        <span className="badge badge-new">{t(`roles.${staff.role}`)}</span>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{staff.email}</p>

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

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title">{t('admin.paySettings')}</h3>
        <form onSubmit={savePay}>
          <div className="form-group">
            <label>{t('admin.payMode')}</label>
            <select
              className="form-input stats-select"
              value={payForm.payMode}
              onChange={(e) => setPayForm((f) => ({ ...f, payMode: e.target.value }))}
            >
              <option value="fixed">{t('admin.payModeFixed')}</option>
              <option value="percent">{t('admin.payModePercent')}</option>
              <option value="fixed_percent">{t('admin.payModeBoth')}</option>
            </select>
          </div>
          {(payForm.payMode === 'fixed' || payForm.payMode === 'fixed_percent') && (
            <div className="form-group">
              <label>{t('admin.baseSalary')}</label>
              <input
                className="form-input stats-date-input"
                type="number"
                min="0"
                value={payForm.baseSalary}
                onChange={(e) => setPayForm((f) => ({ ...f, baseSalary: e.target.value }))}
              />
              <span className="form-hint">{t('admin.baseSalaryHint')}</span>
            </div>
          )}
          {(payForm.payMode === 'percent' || payForm.payMode === 'fixed_percent') && (
            <div className="form-group">
              <label>{t('admin.commissionPercent')}</label>
              <input
                className="form-input stats-date-input"
                type="number"
                min="0"
                max="100"
                value={payForm.commissionPercent}
                onChange={(e) => setPayForm((f) => ({ ...f, commissionPercent: e.target.value }))}
              />
              <span className="form-hint">{t('admin.commissionHint')}</span>
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{summary.orderCount}</div>
          <div className="stat-label">{t('admin.staffOrders')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.paidOrderCount}</div>
          <div className="stat-label">{t('admin.staffPaidOrders')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(summary.totalRevenue).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.staffRevenue')}</div>
        </div>
        {(staff.payMode === 'percent' || staff.payMode === 'fixed_percent') && (
          <div className="stat-card">
            <div className="stat-value">{Math.round(summary.commissionEarned).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.commissionEarned')}</div>
          </div>
        )}
        {(staff.payMode === 'fixed' || staff.payMode === 'fixed_percent') && (
          <div className="stat-card">
            <div className="stat-value">{Math.round(summary.baseSalaryAccrued).toLocaleString()} ₸</div>
            <div className="stat-label">{t('admin.baseSalaryAccrued')}</div>
          </div>
        )}
        <div className="stat-card stat-card-profit">
          <div className="stat-value">{Math.round(summary.estimatedEarnings).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.estimatedEarnings')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(summary.salaryPaid).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.salaryPaid')}</div>
        </div>
        <div className="stat-card">
          <div
            className={`stat-value ${summary.balance >= 0 ? 'stats-positive' : 'stats-negative'}`}
            style={{ fontSize: '1.25rem' }}
          >
            {Math.round(summary.balance).toLocaleString()} ₸
          </div>
          <div className="stat-label">{t('admin.salaryBalance')}</div>
        </div>
      </div>

      {daily.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
          <h3 className="card-title">{t('admin.dailyBreakdown')}</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('admin.date')}</th>
                <th>{t('admin.orderCount')}</th>
                <th>{t('admin.revenue')}</th>
                {(staff.payMode === 'percent' || staff.payMode === 'fixed_percent') && (
                  <th>{t('admin.commissionEarned')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {daily.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{row.orders}</td>
                  <td>{Math.round(row.revenue).toLocaleString()} ₸</td>
                  {(staff.payMode === 'percent' || staff.payMode === 'fixed_percent') && (
                    <td>{Math.round(row.commission).toLocaleString()} ₸</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {salaryPayments.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">{t('admin.salaryPayments')}</h3>
          {salaryPayments.map((r) => (
            <div key={r._id} className="table-row">
              <div>
                <strong>{new Date(r.date).toLocaleDateString()}</strong>
                {r.description && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{r.description}</div>
                )}
              </div>
              <span style={{ fontWeight: 700 }}>{r.amount.toLocaleString()} ₸</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">{t('admin.staffOrderHistory')}</h3>
        {orders.length === 0 ? (
          <p className="empty-state" style={{ padding: '16px 0' }}>
            {t('admin.ordersEmptyHistory')}
          </p>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="order-card" style={{ marginBottom: 12 }}>
              <div className="order-card-header">
                <span className="order-card-table">
                  {t('menu.table')} {order.tableNumber}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <div className="order-card-meta">{new Date(order.createdAt).toLocaleString()}</div>
              {order.items.map((item, i) => (
                <div key={i} className="order-item-line">
                  <span>
                    {localized(item.name, lang)} × {item.quantity}
                  </span>
                  <span>
                    {item.price * item.quantity} {t('common.currency')}
                  </span>
                </div>
              ))}
              <div style={{ fontWeight: 700, textAlign: 'right', marginTop: 8 }}>
                {order.total} {t('common.currency')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
