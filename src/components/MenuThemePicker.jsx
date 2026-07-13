import { useEffect, useState } from 'react';
import { api } from '../api';

const THEMES = [
  {
    id: 'classic',
    name: { ru: 'Классический', kk: 'Классикалық' },
    description: {
      ru: 'Чистый чёрно-белый каталог с акцентом на фотографии.',
      kk: 'Фотосуреттерге басымдық беретін таза ақ-қара каталог.',
    },
  },
  {
    id: 'bistro',
    name: { ru: 'Тёплое бистро', kk: 'Жылы бистро' },
    description: {
      ru: 'Кремовая палитра, журнальная типографика и уютные карточки.',
      kk: 'Крем түстері, журналдық типографика және жайлы карточкалар.',
    },
  },
  {
    id: 'night',
    name: { ru: 'Ночной бар', kk: 'Түнгі бар' },
    description: {
      ru: 'Контрастная тёмная тема с яркими акцентами и крупными ценами.',
      kk: 'Жарқын екпіндері мен ірі бағалары бар контрастты қараңғы тақырып.',
    },
  },
];

function ThemePreview({ theme }) {
  return (
    <div className={`menu-theme-preview menu-theme-preview-${theme}`} aria-hidden="true">
      <div className="menu-theme-preview-top">
        <span />
        <i />
      </div>
      <div className="menu-theme-preview-title" />
      <div className="menu-theme-preview-tabs"><span /><span /><span /></div>
      <div className="menu-theme-preview-grid">
        <div><i /><span /><b /></div>
        <div><i /><span /><b /></div>
        <div><i /><span /><b /></div>
      </div>
    </div>
  );
}

export default function MenuThemePicker({ establishmentId, initialTheme = 'classic', lang = 'ru' }) {
  const [theme, setTheme] = useState(initialTheme);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTheme(initialTheme);
    setMessage('');
  }, [establishmentId, initialTheme]);

  const chooseTheme = async (nextTheme) => {
    if (saving || nextTheme === theme) return;
    const previous = theme;
    setTheme(nextTheme);
    setSaving(nextTheme);
    setMessage('');
    try {
      await api.establishments.update(establishmentId, { menuTheme: nextTheme });
      setMessage(lang === 'kk' ? 'Дизайн сақталды' : 'Дизайн сохранён');
    } catch (error) {
      setTheme(previous);
      setMessage(error.message);
    } finally {
      setSaving('');
    }
  };

  return (
    <section className="menu-theme-picker card">
      <div className="menu-theme-picker-heading">
        <div>
          <span className="menu-theme-picker-kicker">QR MENU</span>
          <h3>{lang === 'kk' ? 'Мәзір дизайны' : 'Дизайн меню'}</h3>
          <p>
            {lang === 'kk'
              ? 'Қонақтар QR-кодты ашқанда көретін стильді таңдаңыз.'
              : 'Выберите стиль, который гости увидят после открытия QR-кода.'}
          </p>
        </div>
        {message && <span className="menu-theme-picker-message">{message}</span>}
      </div>

      <div className="menu-theme-options">
        {THEMES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`menu-theme-option ${theme === option.id ? 'selected' : ''}`}
            aria-pressed={theme === option.id}
            onClick={() => chooseTheme(option.id)}
          >
            <ThemePreview theme={option.id} />
            <span className="menu-theme-option-copy">
              <strong>{option.name[lang] || option.name.ru}</strong>
              <small>{option.description[lang] || option.description.ru}</small>
              <em>
                {saving === option.id
                  ? (lang === 'kk' ? 'Сақталуда…' : 'Сохраняем…')
                  : theme === option.id
                    ? (lang === 'kk' ? 'Таңдалды' : 'Выбран')
                    : (lang === 'kk' ? 'Таңдау' : 'Выбрать')}
              </em>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
