import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LangSwitch from '../components/LangSwitch';

export default function Login() {
  const { t } = useTranslation();
  const { login, logout, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const goByRole = (role) => {
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'chef') navigate('/chef', { replace: true });
    else if (role === 'waiter') navigate('/waiter', { replace: true });
    else navigate('/', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (user) logout();
      const loggedIn = await login(email.trim(), password);
      goByRole(loggedIn.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <p className="panel-loading">{t('common.loading')}</p>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <LangSwitch />
        </div>
        <h1 className="auth-title">{t('auth.loginTitle')}</h1>
        <p className="auth-subtitle">E-CAFE</p>
        {user && (
          <div className="auth-current-user">
            <p style={{ marginBottom: 8 }}>
              {t('auth.loggedInAs')} <strong>{user.name}</strong> ({t(`roles.${user.role}`)})
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => goByRole(user.role)}
              >
                {t('auth.continueAs')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => logout()}
              >
                {t('auth.switchAccount')}
              </button>
            </div>
          </div>
        )}
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              className="form-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? t('common.loading') : t('auth.login')}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" style={{ color: 'var(--text)', fontWeight: 600 }}>{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
