import { useState, useEffect } from 'react';
import { useParams, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function EstablishmentDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [establishment, setEstablishment] = useState(null);

  useEffect(() => {
    api.establishments.get(id).then(setEstablishment);
  }, [id]);

  if (!establishment) return <p>{t('common.loading')}</p>;

  const tabs = [
    { to: `/admin/establishments/${id}`, end: true, label: t('admin.dashboard') },
    { to: `/admin/establishments/${id}/tables`, label: t('admin.tables') },
    { to: `/admin/establishments/${id}/menu`, label: t('admin.menuManagement') },
    { to: `/admin/establishments/${id}/staff`, label: t('admin.staff') },
    { to: `/admin/establishments/${id}/orders`, label: t('admin.orders') },
    { to: `/admin/establishments/${id}/stats`, label: t('admin.stats') },
    { to: `/admin/establishments/${id}/finance`, label: t('admin.finance') },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1>{establishment.name}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{establishment.address}</p>
      </div>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `category-tab ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ establishment, estId: id }} />
    </div>
  );
}
