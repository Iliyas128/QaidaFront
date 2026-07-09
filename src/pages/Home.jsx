import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangSwitch from '../components/LangSwitch';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="panel-loading">{t('common.loading')}</p>;
  }

  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'chef') return <Navigate to="/chef" replace />;
  if (user?.role === 'waiter') return <Navigate to="/waiter" replace />;

  return (
    <div className="page">
      <header className="header">
        <div className="container header-inner">
          <div className="logo">E-CAFE</div>
          <LangSwitch />
        </div>
      </header>
      <main className="home-hero">
        <h1>{t('app.name')}</h1>
        <p>{t('app.tagline')}</p>
        <div className="home-actions">
          <Link to="/login" className="btn btn-primary">
            {t('auth.login')}
          </Link>
          <Link to="/register" className="btn btn-secondary">
            {t('auth.register')}
          </Link>
        </div>
      </main>
    </div>
  );
}
