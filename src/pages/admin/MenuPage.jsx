import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../../api';
import MenuItemFormFields from '../../components/MenuItemFormFields';
import MenuThemePicker from '../../components/MenuThemePicker';

const emptyItemForm = () => ({
  category: '',
  name: { ru: '', kk: '' },
  description: { ru: '', kk: '' },
  price: '',
});

export default function MenuPage() {
  const { estId, establishment } = useOutletContext();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [catName, setCatName] = useState({ ru: '', kk: '' });
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [allEstablishments, setAllEstablishments] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState('');
  const [importMode, setImportMode] = useState('append');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const otherEstablishments = allEstablishments.filter((e) => e._id !== estId);

  const load = async () => {
    const [cats, its, ests] = await Promise.all([
      api.menu.categories(estId),
      api.menu.items(estId),
      api.establishments.list(),
    ]);
    setCategories(cats);
    setItems(its);
    setAllEstablishments(ests);
  };

  useEffect(() => {
    load();
  }, [estId]);

  const createCategory = async (e) => {
    e.preventDefault();
    await api.menu.createCategory(estId, { name: catName, sortOrder: categories.length });
    setCatName({ ru: '', kk: '' });
    setShowCatForm(false);
    load();
  };

  const createItem = async (e) => {
    e.preventDefault();
    await api.menu.createItem(estId, {
      ...itemForm,
      price: parseFloat(itemForm.price),
      category: itemForm.category,
      isAvailable: true,
    });
    setItemForm(emptyItemForm());
    setShowItemForm(false);
    load();
  };

  const openEditItem = (item) => {
    setEditingItem({
      _id: item._id,
      category: item.category?._id || item.category,
      name: { ru: item.name?.ru || '', kk: item.name?.kk || '' },
      description: { ru: item.description?.ru || '', kk: item.description?.kk || '' },
      price: String(item.price ?? ''),
    });
  };

  const saveEditItem = async (e) => {
    e.preventDefault();
    await api.menu.updateItem(estId, editingItem._id, {
      name: editingItem.name,
      description: editingItem.description,
      price: parseFloat(editingItem.price),
      category: editingItem.category,
    });
    setEditingItem(null);
    load();
  };

  const setAvailability = async (item, isAvailable) => {
    await api.menu.setAvailability(estId, item._id, isAvailable);
    load();
  };

  const uploadImage = async (itemId, file) => {
    try {
      setUploadError('');
      await api.menu.uploadImage(estId, itemId, file);
      load();
    } catch (err) {
      setUploadError(err.message);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importSource) return;
    setImporting(true);
    setImportMessage('');
    try {
      const result = await api.menu.importFrom(estId, {
        sourceEstablishmentId: importSource,
        mode: importMode,
      });
      setImportMessage(result.message);
      setShowImport(false);
      setImportSource('');
      load();
    } catch (err) {
      setImportMessage(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <MenuThemePicker
        establishmentId={estId}
        initialTheme={establishment?.menuTheme || 'classic'}
        lang={lang}
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setShowCatForm(true)}>
          + {t('admin.createCategory')}
        </button>
        <button className="btn btn-secondary" onClick={() => setShowItemForm(true)}>
          + {t('admin.createItem')}
        </button>
        {otherEstablishments.length > 0 && (
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            {t('admin.importMenu')}
          </button>
        )}
      </div>
      {uploadError && <div className="error-msg">{uploadError}</div>}
      {importMessage && <div className="success-msg" style={{ marginBottom: 16 }}>{importMessage}</div>}

      {showCatForm && (
        <div className="modal-overlay" onClick={() => setShowCatForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('admin.createCategory')}</h2>
            <form onSubmit={createCategory}>
              <div className="form-group">
                <label>RU</label>
                <input className="form-input" value={catName.ru} onChange={(e) => setCatName({ ...catName, ru: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>KZ</label>
                <input className="form-input" value={catName.kk} onChange={(e) => setCatName({ ...catName, kk: e.target.value })} required />
              </div>
              <button className="btn btn-primary">{t('common.save')}</button>
            </form>
          </div>
        </div>
      )}

      {showItemForm && (
        <div className="modal-overlay" onClick={() => setShowItemForm(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('admin.createItem')}</h2>
            <form onSubmit={createItem}>
              <MenuItemFormFields
                form={itemForm}
                setForm={setItemForm}
                categories={categories}
              />
              <button className="btn btn-primary">{t('common.save')}</button>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('admin.editItem')}</h2>
            <form onSubmit={saveEditItem}>
              <MenuItemFormFields
                form={editingItem}
                setForm={setEditingItem}
                categories={categories}
              />
              <button className="btn btn-primary">{t('common.save')}</button>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('admin.importMenu')}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              {t('admin.importMenuHint')}
            </p>
            <form onSubmit={handleImport}>
              <div className="form-group">
                <label>{t('admin.importFrom')}</label>
                <select
                  className="form-input"
                  value={importSource}
                  onChange={(e) => setImportSource(e.target.value)}
                  required
                >
                  <option value="">—</option>
                  {otherEstablishments.map((est) => (
                    <option key={est._id} value={est._id}>
                      {est.name}{est.address ? ` — ${est.address}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('admin.importMode')}</label>
                <select
                  className="form-input"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                >
                  <option value="append">{t('admin.importModeAppend')}</option>
                  <option value="replace">{t('admin.importModeReplace')}</option>
                </select>
                <span className="form-hint">
                  {importMode === 'replace'
                    ? t('admin.importModeReplaceHint')
                    : t('admin.importModeAppendHint')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn-primary" disabled={importing}>
                  {importing ? t('common.loading') : t('admin.importMenu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat._id} className="card" style={{ marginBottom: 16 }}>
          <h3>{localized(cat.name, lang)}</h3>
          <div className="grid-2" style={{ marginTop: 12 }}>
            {items.filter((i) => (i.category?._id || i.category) === cat._id).map((item) => (
              <div key={item._id} className="menu-item admin-menu-item">
                {item.image ? (
                  <img src={item.image} alt="" className="menu-item-image" />
                ) : (
                  <div className="menu-item-image placeholder">🍽️</div>
                )}
                <div className="menu-item-body">
                  <div className="menu-item-name">{localized(item.name, lang)}</div>
                  {localized(item.description, lang) ? (
                    <div className="menu-item-desc">{localized(item.description, lang)}</div>
                  ) : (
                    <div className="menu-item-desc muted">{t('admin.noDescription')}</div>
                  )}
                  <div className="menu-item-price">{item.price} ₸</div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${item.isAvailable ? 'badge-ready' : 'badge-preparing'}`}>
                      {item.isAvailable ? t('menu.inStock') : t('menu.unavailable')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEditItem(item)}>
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${item.isAvailable ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => setAvailability(item, !item.isAvailable)}
                    >
                      {item.isAvailable ? t('menu.markUnavailable') : t('menu.markAvailable')}
                    </button>
                    <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                      📷
                      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadImage(item._id, e.target.files[0])} />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
