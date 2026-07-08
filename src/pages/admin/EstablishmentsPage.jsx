import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function EstablishmentsPage() {
  const { t } = useTranslation();
  const { reload } = useAuth();
  const [establishments, setEstablishments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await api.establishments.list();
    setEstablishments(data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.establishments.create({ name, address, phone });
      setName('');
      setAddress('');
      setPhone('');
      setShowForm(false);
      await load();
      await reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>{t('admin.establishments')}</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + {t('admin.createEstablishment')}
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('admin.createEstablishment')}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>{t('auth.name')}</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>{t('admin.address')}</label>
                <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('admin.phone')}</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn-primary" disabled={loading}>
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid-2">
        {establishments.map((est) => (
          <Link key={est._id} to={`/admin/establishments/${est._id}`} className="card" style={{ display: 'block' }}>
            <h3>{est.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{est.address}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
