import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function StatsPage() {
  const { estId } = useOutletContext();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.stats(estId, {}).then(setStats);
  }, [estId]);

  if (!stats) return <p>{t('common.loading')}</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('admin.stats')}</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{Math.round(stats.summary.totalRevenue || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.revenue')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.summary.orderCount || 0}</div>
          <div className="stat-label">{t('admin.orderCount')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(stats.summary.avgOrder || 0).toLocaleString()} ₸</div>
          <div className="stat-label">{t('admin.avgOrder')}</div>
        </div>
      </div>

      {stats.topItems?.length > 0 && (
        <div className="card">
          <h3 className="card-title">{t('admin.topItems')}</h3>
          {stats.topItems.map((item, i) => (
            <div key={i} className="table-row">
              <span>{item._id}</span>
              <span>{item.quantity} шт · {Math.round(item.revenue)} ₸</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
