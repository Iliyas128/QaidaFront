import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function StaffLeaderboard({ title, rows, t }) {
  if (!rows?.length) return null;

  return (
    <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
      <h3 className="card-title">{title}</h3>
      <table className="stats-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('auth.name')}</th>
            <th>{t('admin.orderCount')}</th>
            <th>{t('admin.revenue')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row._id}>
              <td>{i + 1}</td>
              <td>{row.name}</td>
              <td>{row.orders}</td>
              <td>{Math.round(row.revenue).toLocaleString()} ₸</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StatsPage() {
  const { estId } = useOutletContext();
  const { t } = useTranslation();
  const [range, setRange] = useState(defaultRange);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(() => {
    api.stats(estId, range).then(setStats);
  }, [estId, range]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!stats) return <p className="panel-loading">{t('common.loading')}</p>;

  const s = stats.summary;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('admin.stats')}</h2>

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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{Math.round(s.totalRevenue || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.revenue')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(s.totalExpenses || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.expenses')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(s.totalSalaries || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.salaries')}</div>
        </div>
        <div className="stat-card stat-card-profit">
          <div className="stat-value">{Math.round(s.netProfit || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.netProfit')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{s.orderCount || 0}</div>
          <div className="stat-label">{t('admin.orderCount')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(s.avgOrder || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.avgOrder')}</div>
        </div>
      </div>

      {stats.daily?.length > 0 && (
        <div className="card" style={{ marginBottom: 24, overflowX: 'auto' }}>
          <h3 className="card-title">{t('admin.dailyBreakdown')}</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('admin.date')}</th>
                <th>{t('admin.revenue')}</th>
                <th>{t('admin.expenses')}</th>
                <th>{t('admin.salaries')}</th>
                <th>{t('admin.netProfit')}</th>
                <th>{t('admin.orderCount')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.daily.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td>{Math.round(row.revenue).toLocaleString()} ₸</td>
                  <td>{Math.round(row.expenses).toLocaleString()} ₸</td>
                  <td>{Math.round(row.salaries).toLocaleString()} ₸</td>
                  <td className={row.profit >= 0 ? 'stats-positive' : 'stats-negative'}>
                    {Math.round(row.profit).toLocaleString()} ₸
                  </td>
                  <td>{row.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.topItems?.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">{t('admin.topItems')}</h3>
          {stats.topItems.map((item, i) => (
            <div key={i} className="table-row">
              <span>{item._id}</span>
              <span>
                {item.quantity} {t('admin.pcs')} · {Math.round(item.revenue).toLocaleString()} ₸
              </span>
            </div>
          ))}
        </div>
      )}

      <StaffLeaderboard title={t('admin.topWaiters')} rows={stats.topWaiters} t={t} />
      <StaffLeaderboard title={t('admin.topChefs')} rows={stats.topChefs} t={t} />
    </div>
  );
}
