import { useTranslation } from 'react-i18next';
import { localized } from '../api';

export default function MenuItemFormFields({ form, setForm, categories, showCategory = true }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <>
      {showCategory && (
        <div className="form-group">
          <label>{t('menu.categories')}</label>
          <select
            className="form-input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {localized(c.name, lang)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>{t('admin.nameRu')}</label>
          <input
            className="form-input"
            value={form.name.ru}
            onChange={(e) => setForm({ ...form, name: { ...form.name, ru: e.target.value } })}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('admin.nameKz')}</label>
          <input
            className="form-input"
            value={form.name.kk}
            onChange={(e) => setForm({ ...form, name: { ...form.name, kk: e.target.value } })}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t('admin.descriptionRu')}</label>
          <textarea
            className="form-input"
            rows={3}
            value={form.description.ru}
            onChange={(e) =>
              setForm({ ...form, description: { ...form.description, ru: e.target.value } })
            }
            placeholder={t('admin.descriptionPlaceholder')}
          />
        </div>
        <div className="form-group">
          <label>{t('admin.descriptionKz')}</label>
          <textarea
            className="form-input"
            rows={3}
            value={form.description.kk}
            onChange={(e) =>
              setForm({ ...form, description: { ...form.description, kk: e.target.value } })
            }
            placeholder={t('admin.descriptionPlaceholder')}
          />
        </div>
      </div>
      <div className="form-group">
        <label>{t('common.total')} (₸)</label>
        <input
          className="form-input"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
          min={0}
        />
      </div>
    </>
  );
}
