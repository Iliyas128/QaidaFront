import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { establishments } = useAuth();

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>{t('admin.dashboard')}</h1>
      {establishments.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-state-icon">🏪</div>
          <p>{t('admin.createEstablishment')}</p>
          <Link to="/admin/establishments" className="btn btn-primary" style={{ marginTop: 16 }}>
            {t('admin.createEstablishment')}
          </Link>
        </div>
      ) : (
        <div className="grid-2">
          {establishments.map((est) => (
            <Link key={est._id} to={`/admin/establishments/${est._id}`} className="card" style={{ display: 'block' }}>
              {est.logo && <img src={est.logo} alt="" style={{ height: 48, marginBottom: 12 }} />}
              <h3>{est.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>{est.address}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
