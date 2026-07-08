import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function StaffPage() {
  const { estId } = useOutletContext();
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'waiter' });

  const load = () => api.staff.list(estId).then(setStaff);
  useEffect(() => { load(); }, [estId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.staff.create(estId, form);
    setForm({ name: '', email: '', password: '', role: 'waiter' });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>{t('admin.staff')}</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + {t('admin.addStaff')}
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('admin.addStaff')}</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>{t('auth.name')}</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('auth.password')}</label>
                <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="waiter">{t('roles.waiter')}</option>
                  <option value="chef">{t('roles.chef')}</option>
                </select>
              </div>
              <button className="btn btn-primary">{t('common.save')}</button>
            </form>
          </div>
        </div>
      )}

      {staff.map((s) => (
        <div key={s._id} className="table-row">
          <div>
            <strong>{s.name}</strong>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.email}</div>
          </div>
          <span className="badge badge-new">{t(`roles.${s.role}`)}</span>
        </div>
      ))}
    </div>
  );
}
