import { useTranslation } from 'react-i18next';

export default function LangSwitch({ variant = 'default' }) {
  const { i18n, t } = useTranslation();

  const setLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div className={`lang-switch ${variant === 'sidebar' ? 'lang-switch-sidebar' : ''}`}>
      {variant === 'sidebar' && (
        <span className="lang-switch-label">{t('common.language')}</span>
      )}
      <div className="lang-switch-buttons">
        <button
          type="button"
          className={`lang-btn ${i18n.language === 'ru' ? 'active' : ''}`}
          onClick={() => setLang('ru')}
        >
          RU
        </button>
        <button
          type="button"
          className={`lang-btn ${i18n.language === 'kk' ? 'active' : ''}`}
          onClick={() => setLang('kk')}
        >
          KZ
        </button>
      </div>
    </div>
  );
}
