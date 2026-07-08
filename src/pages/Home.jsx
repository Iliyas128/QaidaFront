import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangSwitch from '../components/LangSwitch';

export default function Home() {
  const { t } = useTranslation();

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
