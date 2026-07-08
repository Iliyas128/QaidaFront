import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api';

export default function StaffMenuPanel({ estId }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    if (!estId) return;
    try {
      const [cats, its] = await Promise.all([
        api.menu.categories(estId),
        api.menu.items(estId),
      ]);
      setCategories(cats);
      setItems(its);
    } finally {
      setInitialLoading(false);
    }
  }, [estId]);

  useEffect(() => {
    load();
  }, [load]);

  const setAvailability = async (item, isAvailable) => {
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, isAvailable } : i))
    );
    try {
      await api.menu.setAvailability(estId, item._id, isAvailable);
    } catch {
      load();
    }
  };

  if (initialLoading && !items.length) {
    return <p className="panel-loading">{t('common.loading')}</p>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('admin.menuManagement')}</h2>
      {categories.map((cat) => {
        const catItems = items.filter((i) => (i.category?._id || i.category) === cat._id);
        if (!catItems.length) return null;
        return (
          <div key={cat._id} className="card" style={{ marginBottom: 16 }}>
            <h3>{localized(cat.name, lang)}</h3>
            {catItems.map((item) => (
              <div key={item._id} className="table-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: 'var(--bg-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      🍽️
                    </div>
                  )}
                  <div>
                    <strong>{localized(item.name, lang)}</strong>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {item.price} {t('common.currency')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className={`badge ${item.isAvailable ? 'badge-ready' : 'badge-preparing'}`}
                  >
                    {item.isAvailable ? t('menu.inStock') : t('menu.unavailable')}
                  </span>
                  <button
                    className={`btn btn-sm ${item.isAvailable ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => setAvailability(item, !item.isAvailable)}
                  >
                    {item.isAvailable ? t('menu.markUnavailable') : t('menu.markAvailable')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
