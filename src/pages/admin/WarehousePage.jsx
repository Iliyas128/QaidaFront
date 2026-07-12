import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../../api';

const DOCUMENT_LABELS = {
  receipt: 'Приход',
  transfer: 'Перемещение',
  writeoff: 'Списание',
  return: 'Возврат поставщику',
  inventory: 'Инвентаризация',
  adjustment: 'Корректировка',
  production: 'Производство',
  purchase_order: 'Заказ поставщику',
  sale_writeoff: 'Списание по продаже',
};

const STATUS_LABELS = {
  draft: 'Черновик',
  posting: 'Проводится',
  posted: 'Проведён',
  cancelled: 'Отменён',
};

const UNITS = { kg: 'кг', l: 'л', pcs: 'шт.' };

const emptyLine = () => ({ stockItemId: '', quantity: '', unitCost: '', operation: 'in' });
const emptyRecipeLine = () => ({ stockItemId: '', grossQuantity: '', wastePercent: 0 });

function number(value, digits = 3) {
  return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: digits });
}

function InlineError({ message }) {
  if (!message) return null;
  return <div className="warehouse-alert warehouse-alert-error">{message}</div>;
}

function LineEditor({ lines, setLines, items, showCost = true, showOperation = false }) {
  const update = (index, key, value) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  };

  return (
    <div className="warehouse-lines">
      {lines.map((line, index) => (
        <div className="warehouse-line" key={index}>
          <select
            className="form-input"
            required
            value={line.stockItemId}
            onChange={(event) => update(index, 'stockItemId', event.target.value)}
          >
            <option value="">Выберите позицию</option>
            {items.map((item) => (
              <option key={item._id} value={item._id}>{localized(item.name, 'ru')}</option>
            ))}
          </select>
          {showOperation && (
            <select
              className="form-input"
              value={line.operation || 'in'}
              onChange={(event) => update(index, 'operation', event.target.value)}
            >
              <option value="in">Оприходовать</option>
              <option value="out">Списать</option>
              <option value="set">Установить остаток</option>
            </select>
          )}
          <input
            className="form-input"
            type="number"
            min="0"
            step="0.001"
            required
            placeholder="Количество"
            value={line.quantity}
            onChange={(event) => update(index, 'quantity', event.target.value)}
          />
          {showCost && (
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Цена за единицу"
              value={line.unitCost}
              onChange={(event) => update(index, 'unitCost', event.target.value)}
            />
          )}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={lines.length === 1}
            onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
          >
            Убрать
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setLines((current) => [...current, emptyLine()])}>
        + Позиция
      </button>
    </div>
  );
}

export default function WarehousePage() {
  const { estId } = useOutletContext();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState({ warehouses: [], stocks: [], summary: {} });
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [movementItem, setMovementItem] = useState('');
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouseRows, itemRows, supplierRows, recipeRows, documentRows, menuRows] = await Promise.all([
        api.warehouse.warehouses(estId),
        api.warehouse.items(estId),
        api.warehouse.suppliers(estId),
        api.warehouse.recipes(estId),
        api.warehouse.documents(estId),
        api.menu.items(estId),
      ]);
      setWarehouses(warehouseRows);
      setItems(itemRows);
      setSuppliers(supplierRows);
      setRecipes(recipeRows);
      setDocuments(documentRows);
      setMenuItems(menuRows);
      setOverview(await api.warehouse.overview(estId, selectedWarehouse));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [estId, selectedWarehouse]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!movementItem) {
      setMovements([]);
      return;
    }
    api.warehouse.movements(estId, {
      stockItemId: movementItem,
      ...(selectedWarehouse ? { warehouseId: selectedWarehouse } : {}),
    }).then(setMovements).catch((loadError) => setError(loadError.message));
  }, [estId, movementItem, selectedWarehouse]);

  const withAction = async (action) => {
    setError('');
    try {
      await action();
      await reload();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const tabs = [
    ['overview', 'Остатки'],
    ['items', 'Номенклатура'],
    ['documents', 'Документы'],
    ['inventory', 'Инвентаризация'],
    ['purchases', 'Закупки'],
    ['recipes', 'Техкарты'],
    ['suppliers', 'Поставщики'],
    ['warehouses', 'Склады'],
  ];

  return (
    <div className="warehouse-page">
      <div className="warehouse-title-row">
        <div>
          <h2>Склад и производство</h2>
          <p>Остатки, себестоимость, закупки и списание ингредиентов по продажам.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={reload}>Обновить</button>
      </div>

      <InlineError message={error} />

      <div className="category-tabs warehouse-tabs">
        {tabs.map(([value, label]) => (
          <button key={value} type="button" className={`category-tab ${tab === value ? 'active' : ''}`} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="empty-state card"><p>Загрузка склада…</p></div> : (
        <>
          {tab === 'overview' && (
            <OverviewTab
              overview={overview}
              warehouses={warehouses}
              selectedWarehouse={selectedWarehouse}
              setSelectedWarehouse={setSelectedWarehouse}
              movementItem={movementItem}
              setMovementItem={setMovementItem}
              movements={movements}
              lang={lang}
            />
          )}
          {tab === 'items' && <ItemsTab items={items} lang={lang} onAction={withAction} estId={estId} />}
          {tab === 'documents' && (
            <DocumentsTab
              documents={documents}
              warehouses={warehouses}
              suppliers={suppliers}
              items={items}
              estId={estId}
              onAction={withAction}
              lang={lang}
            />
          )}
          {tab === 'inventory' && (
            <InventoryTab warehouses={warehouses} estId={estId} onAction={withAction} lang={lang} />
          )}
          {tab === 'purchases' && (
            <PurchasesTab warehouses={warehouses} suppliers={suppliers} estId={estId} onAction={withAction} lang={lang} />
          )}
          {tab === 'recipes' && (
            <RecipesTab recipes={recipes} menuItems={menuItems} items={items} warehouses={warehouses} estId={estId} onAction={withAction} lang={lang} />
          )}
          {tab === 'suppliers' && <SuppliersTab suppliers={suppliers} items={items} estId={estId} onAction={withAction} lang={lang} />}
          {tab === 'warehouses' && <WarehousesTab warehouses={warehouses} estId={estId} onAction={withAction} />}
        </>
      )}
    </div>
  );
}

function OverviewTab({ overview, warehouses, selectedWarehouse, setSelectedWarehouse, movementItem, setMovementItem, movements, lang }) {
  const summary = overview.summary || {};
  return (
    <div>
      <div className="warehouse-toolbar card">
        <label>
          Склад
          <select className="form-input" value={selectedWarehouse} onChange={(event) => setSelectedWarehouse(event.target.value)}>
            <option value="">Все склады</option>
            {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
          </select>
        </label>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{summary.totalItems || 0}</div><div className="stat-label">Позиций</div></div>
        <div className="stat-card"><div className="stat-value">{number(summary.inventoryValue, 2)} ₸</div><div className="stat-label">Стоимость запасов</div></div>
        <div className="stat-card"><div className="stat-value warehouse-warning-text">{summary.lowStock || 0}</div><div className="stat-label">Ниже минимума</div></div>
        <div className="stat-card"><div className="stat-value warehouse-danger-text">{summary.negativeStock || 0}</div><div className="stat-label">Отрицательных</div></div>
      </div>
      <div className="card warehouse-table-card">
        <div className="warehouse-table-header"><h3>Текущие остатки</h3><span>Средневзвешенная себестоимость</span></div>
        <div className="warehouse-table-scroll">
          <table className="warehouse-table">
            <thead><tr><th>Позиция</th><th>Остаток</th><th>Мин.</th><th>Себестоимость</th><th>Стоимость</th><th>Рекомендовано заказать</th></tr></thead>
            <tbody>
              {overview.stocks.map((row) => (
                <tr key={row.item._id} className={row.isNegative ? 'warehouse-row-danger' : row.isLow ? 'warehouse-row-warning' : ''}>
                  <td><button className="warehouse-link" type="button" onClick={() => setMovementItem(row.item._id)}>{localized(row.item.name, lang)}</button></td>
                  <td>{number(row.quantity)} {UNITS[row.item.baseUnit]}</td>
                  <td>{number(row.item.minStock)} {UNITS[row.item.baseUnit]}</td>
                  <td>{number(row.averageCost, 2)} ₸</td>
                  <td>{number(row.value, 2)} ₸</td>
                  <td>{row.suggestedOrder > 0 ? `${number(row.suggestedOrder)} ${UNITS[row.item.baseUnit]}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {movementItem && (
        <div className="card warehouse-table-card">
          <div className="warehouse-table-header"><h3>Движение позиции</h3><button type="button" className="btn btn-sm btn-secondary" onClick={() => setMovementItem('')}>Закрыть</button></div>
          {movements.length ? movements.map((movement) => (
            <div className="table-row" key={movement._id}>
              <div><strong>{movement.document?.number || 'Документ'}</strong><div className="warehouse-muted">{new Date(movement.occurredAt).toLocaleString()} · {movement.warehouse?.name}</div></div>
              <div className={movement.quantityDelta < 0 ? 'warehouse-danger-text' : 'warehouse-positive-text'}>{movement.quantityDelta > 0 ? '+' : ''}{number(movement.quantityDelta)} · {number(movement.valueDelta, 2)} ₸</div>
            </div>
          )) : <div className="empty-state"><p>Движений пока нет.</p></div>}
        </div>
      )}
    </div>
  );
}

function ItemsTab({ items, lang, estId, onAction }) {
  const [form, setForm] = useState({ nameRu: '', nameKk: '', sku: '', type: 'ingredient', baseUnit: 'kg', minStock: '', maxStock: '', shelfLifeDays: '' });
  const submit = (event) => {
    event.preventDefault();
    onAction(async () => {
      await api.warehouse.createItem(estId, {
        name: { ru: form.nameRu, kk: form.nameKk }, sku: form.sku, type: form.type, baseUnit: form.baseUnit,
        minStock: Number(form.minStock || 0), maxStock: Number(form.maxStock || 0), shelfLifeDays: Number(form.shelfLifeDays || 0),
      });
      setForm({ nameRu: '', nameKk: '', sku: '', type: 'ingredient', baseUnit: 'kg', minStock: '', maxStock: '', shelfLifeDays: '' });
    });
  };
  return (
    <div className="warehouse-two-column">
      <form className="card" onSubmit={submit}>
        <h3 className="card-title">Новая позиция</h3>
        <div className="form-row"><label className="form-group">Название RU<input className="form-input" required value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} /></label><label className="form-group">Название KZ<input className="form-input" value={form.nameKk} onChange={(e) => setForm({ ...form, nameKk: e.target.value })} /></label></div>
        <div className="form-row"><label className="form-group">Тип<select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="ingredient">Ингредиент</option><option value="product">Товар</option><option value="semi_finished">Полуфабрикат</option></select></label><label className="form-group">Единица<select className="form-input" value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })}><option value="kg">кг</option><option value="l">л</option><option value="pcs">шт.</option></select></label></div>
        <label className="form-group">Артикул<input className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
        <div className="form-row"><label className="form-group">Минимальный запас<input className="form-input" type="number" min="0" step="0.001" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></label><label className="form-group">Максимальный запас<input className="form-input" type="number" min="0" step="0.001" value={form.maxStock} onChange={(e) => setForm({ ...form, maxStock: e.target.value })} /></label></div>
        <label className="form-group">Срок хранения, дней<input className="form-input" type="number" min="0" value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit">Добавить</button>
      </form>
      <div className="card warehouse-table-card"><h3 className="card-title">Номенклатура</h3>{items.map((item) => <div className="table-row" key={item._id}><div><strong>{localized(item.name, lang)}</strong><div className="warehouse-muted">{item.sku || 'Без артикула'} · {UNITS[item.baseUnit]} · срок {item.shelfLifeDays || 0} дн.</div></div><div>{number(item.minStock)} / {number(item.maxStock)}</div></div>)}</div>
    </div>
  );
}

function DocumentsTab({ documents, warehouses, suppliers, items, estId, onAction, lang }) {
  const defaultWarehouse = warehouses.find((row) => row.isDefault)?._id || warehouses[0]?._id || '';
  const [form, setForm] = useState({ type: 'receipt', warehouseId: defaultWarehouse, targetWarehouseId: '', supplierId: '', notes: '' });
  const [lines, setLines] = useState([emptyLine()]);
  useEffect(() => { if (!form.warehouseId && defaultWarehouse) setForm((current) => ({ ...current, warehouseId: defaultWarehouse })); }, [defaultWarehouse, form.warehouseId]);
  const submit = (event) => {
    event.preventDefault();
    onAction(async () => {
      await api.warehouse.createDocument(estId, { ...form, post: true, lines: lines.map((line) => ({ ...line, quantity: Number(line.quantity), unitCost: Number(line.unitCost || 0) })) });
      setLines([emptyLine()]); setForm((current) => ({ ...current, notes: '' }));
    });
  };
  const showCost = ['receipt', 'adjustment', 'production'].includes(form.type);
  return (
    <div>
      <form className="card" onSubmit={submit} style={{ marginBottom: 20 }}>
        <h3 className="card-title">Новый документ</h3>
        <div className="warehouse-document-head">
          <label className="form-group">Тип<select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['receipt', 'transfer', 'writeoff', 'return', 'adjustment', 'production'].map((type) => <option key={type} value={type}>{DOCUMENT_LABELS[type]}</option>)}</select></label>
          <label className="form-group">Склад<select className="form-input" required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}><option value="">Выберите</option>{warehouses.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></label>
          {form.type === 'transfer' && <label className="form-group">Склад назначения<select className="form-input" required value={form.targetWarehouseId} onChange={(e) => setForm({ ...form, targetWarehouseId: e.target.value })}><option value="">Выберите</option>{warehouses.filter((row) => row._id !== form.warehouseId).map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></label>}
          {['receipt', 'return'].includes(form.type) && <label className="form-group">Поставщик<select className="form-input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">Без поставщика</option>{suppliers.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></label>}
        </div>
        <LineEditor lines={lines} setLines={setLines} items={items} showCost={showCost} showOperation={form.type === 'adjustment' || form.type === 'production'} />
        <label className="form-group" style={{ marginTop: 16 }}>Комментарий<input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button className="btn btn-primary" type="submit">Создать и провести</button>
      </form>
      <div className="card warehouse-table-card"><h3 className="card-title">История документов</h3>{documents.map((document) => <div className="table-row warehouse-document-row" key={document._id}><div><strong>{DOCUMENT_LABELS[document.type]} · {document.number}</strong><div className="warehouse-muted">{new Date(document.documentDate).toLocaleString()} · {document.warehouse?.name || 'Несколько складов'} · {document.lines.length} поз.</div></div><div className="warehouse-row-actions"><span className={`warehouse-status warehouse-status-${document.status}`}>{STATUS_LABELS[document.status]}</span>{document.status === 'draft' && <button className="btn btn-sm btn-primary" type="button" onClick={() => onAction(() => api.warehouse.postDocument(estId, document._id))}>Провести</button>}{document.status === 'posted' && document.type === 'purchase_order' && <button className="btn btn-sm btn-primary" type="button" onClick={() => onAction(() => api.warehouse.receiveDocument(estId, document._id, { warehouseId: document.warehouse?._id }))}>Принять</button>}{document.status === 'posted' && document.type !== 'sale_writeoff' && <button className="btn btn-sm btn-secondary" type="button" onClick={() => onAction(() => api.warehouse.cancelDocument(estId, document._id))}>Отменить</button>}</div></div>)}</div>
    </div>
  );
}

function InventoryTab({ warehouses, estId, onAction, lang }) {
  const [warehouseId, setWarehouseId] = useState(warehouses.find((row) => row.isDefault)?._id || warehouses[0]?._id || '');
  const [actual, setActual] = useState({});
  const [selectedStocks, setSelectedStocks] = useState([]);
  useEffect(() => {
    if (!warehouseId && warehouses.length) {
      setWarehouseId(warehouses.find((row) => row.isDefault)?._id || warehouses[0]._id);
    }
  }, [warehouseId, warehouses]);
  useEffect(() => {
    if (!warehouseId) return;
    api.warehouse.overview(estId, warehouseId).then((data) => setSelectedStocks(data.stocks));
  }, [estId, warehouseId]);
  const submit = async (event) => {
    event.preventDefault();
    await onAction(async () => {
      await api.warehouse.createDocument(estId, {
        type: 'inventory', warehouseId, post: true, notes: 'Инвентаризация',
        lines: selectedStocks.map((row) => ({ stockItemId: row.item._id, quantity: Number(actual[row.item._id] ?? row.quantity), actualQuantity: Number(actual[row.item._id] ?? row.quantity) })),
      });
      setActual({});
    });
    const data = await api.warehouse.overview(estId, warehouseId);
    setSelectedStocks(data.stocks);
  };
  return (
    <form className="card" onSubmit={submit}>
      <div className="warehouse-table-header"><div><h3>Новая инвентаризация</h3><p>Введите фактическое количество. После проведения система создаст корректирующие движения.</p></div><select className="form-input warehouse-select" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>{warehouses.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></div>
      <div className="warehouse-table-scroll"><table className="warehouse-table"><thead><tr><th>Позиция</th><th>По учёту</th><th>Фактически</th><th>Разница</th></tr></thead><tbody>{selectedStocks.map((row) => { const fact = Number(actual[row.item._id] ?? row.quantity); return <tr key={row.item._id}><td>{localized(row.item.name, lang)}</td><td>{number(row.quantity)} {UNITS[row.item.baseUnit]}</td><td><input className="form-input warehouse-count-input" type="number" min="0" step="0.001" value={actual[row.item._id] ?? row.quantity} onChange={(e) => setActual({ ...actual, [row.item._id]: e.target.value })} /></td><td className={fact - row.quantity < 0 ? 'warehouse-danger-text' : 'warehouse-positive-text'}>{number(fact - row.quantity)} {UNITS[row.item.baseUnit]}</td></tr>; })}</tbody></table></div>
      <button className="btn btn-primary" type="submit" disabled={!warehouseId || !selectedStocks.length}>Провести инвентаризацию</button>
    </form>
  );
}

function PurchasesTab({ warehouses, suppliers, estId, onAction, lang }) {
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses.find((row) => row.isDefault)?._id || warehouses[0]?._id || '');
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    if (!warehouseId && warehouses.length) {
      setWarehouseId(warehouses.find((row) => row.isDefault)?._id || warehouses[0]._id);
    }
  }, [warehouseId, warehouses]);
  useEffect(() => {
    if (!warehouseId) return;
    api.warehouse.overview(estId, warehouseId).then((data) => {
      setSuggestions(data.stocks.filter((row) => row.suggestedOrder > 0));
    });
  }, [estId, warehouseId]);
  const createOrder = () => {
    const supplier = suppliers.find((row) => row._id === supplierId);
    return onAction(() => api.warehouse.createDocument(estId, {
      type: 'purchase_order', warehouseId, supplierId: supplierId || null, post: true, notes: 'Автозаказ до максимального остатка',
      lines: suggestions.map((row) => {
        const priceRow = supplier?.products?.find((product) => (product.stockItem?._id || product.stockItem) === row.item._id);
        return { stockItemId: row.item._id, quantity: row.suggestedOrder, unitCost: priceRow?.price || row.averageCost };
      }),
    }));
  };
  return (
    <div className="card warehouse-table-card">
      <div className="warehouse-table-header"><div><h3>Рекомендации по закупке</h3><p>Количество рассчитано до максимального уровня запаса.</p></div><div className="warehouse-purchase-controls"><select className="form-input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>{warehouses.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select><select className="form-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Поставщик не выбран</option>{suppliers.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></div></div>
      {suggestions.length ? <><div className="warehouse-table-scroll"><table className="warehouse-table"><thead><tr><th>Позиция</th><th>Остаток</th><th>Максимум</th><th>Заказать</th></tr></thead><tbody>{suggestions.map((row) => <tr key={row.item._id}><td>{localized(row.item.name, lang)}</td><td>{number(row.quantity)} {UNITS[row.item.baseUnit]}</td><td>{number(row.item.maxStock)} {UNITS[row.item.baseUnit]}</td><td><strong>{number(row.suggestedOrder)} {UNITS[row.item.baseUnit]}</strong></td></tr>)}</tbody></table></div><button className="btn btn-primary" type="button" disabled={!warehouseId} onClick={createOrder}>Создать заказ поставщику</button></> : <div className="empty-state"><p>Запасы находятся в пределах заданных уровней.</p></div>}
    </div>
  );
}

function RecipesTab({ recipes, menuItems, items, warehouses, estId, onAction, lang }) {
  const [form, setForm] = useState({ menuItemId: '', warehouseId: warehouses.find((row) => row.isDefault)?._id || warehouses[0]?._id || '', yieldQuantity: 1, validFrom: new Date().toISOString().slice(0, 10), notes: '' });
  const [ingredients, setIngredients] = useState([emptyRecipeLine()]);
  const submit = (event) => { event.preventDefault(); onAction(async () => { await api.warehouse.createRecipe(estId, { ...form, ingredients: ingredients.map((line) => ({ ...line, grossQuantity: Number(line.grossQuantity), wastePercent: Number(line.wastePercent || 0) })) }); setIngredients([emptyRecipeLine()]); }); };
  const updateLine = (index, key, value) => setIngredients((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  return (
    <div className="warehouse-two-column">
      <form className="card" onSubmit={submit}><h3 className="card-title">Новая версия техкарты</h3><label className="form-group">Блюдо<select className="form-input" required value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: e.target.value })}><option value="">Выберите блюдо</option>{menuItems.map((row) => <option key={row._id} value={row._id}>{localized(row.name, lang)}</option>)}</select></label><div className="form-row"><label className="form-group">Склад списания<select className="form-input" required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>{warehouses.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></label><label className="form-group">Выход блюда<input className="form-input" type="number" min="0.001" step="0.001" value={form.yieldQuantity} onChange={(e) => setForm({ ...form, yieldQuantity: e.target.value })} /></label></div><label className="form-group">Действует с<input className="form-input" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></label><div className="warehouse-lines">{ingredients.map((line, index) => <div className="warehouse-recipe-line" key={index}><select className="form-input" required value={line.stockItemId} onChange={(e) => updateLine(index, 'stockItemId', e.target.value)}><option value="">Ингредиент</option>{items.map((row) => <option key={row._id} value={row._id}>{localized(row.name, lang)}</option>)}</select><input className="form-input" type="number" min="0.0001" step="0.001" required placeholder="Брутто" value={line.grossQuantity} onChange={(e) => updateLine(index, 'grossQuantity', e.target.value)} /><input className="form-input" type="number" min="0" max="100" step="0.1" placeholder="Потери %" value={line.wastePercent} onChange={(e) => updateLine(index, 'wastePercent', e.target.value)} /><button className="btn btn-sm btn-secondary" type="button" disabled={ingredients.length === 1} onClick={() => setIngredients((current) => current.filter((_, i) => i !== index))}>Убрать</button></div>)}</div><button className="btn btn-sm btn-secondary" type="button" onClick={() => setIngredients((current) => [...current, emptyRecipeLine()])}>+ Ингредиент</button><button className="btn btn-primary" type="submit" style={{ marginLeft: 8 }}>Сохранить версию</button></form>
      <div className="card warehouse-table-card"><h3 className="card-title">Действующие техкарты</h3>{recipes.map((recipe) => <div className="warehouse-recipe-card" key={recipe._id}><div className="warehouse-table-header"><strong>{localized(recipe.menuItem?.name, lang)} · v{recipe.version}</strong><span>{new Date(recipe.validFrom).toLocaleDateString()}</span></div>{recipe.ingredients.map((line) => <div className="table-row" key={line._id}><span>{localized(line.stockItem?.name, lang)}</span><span>{number(line.grossQuantity)} {UNITS[line.stockItem?.baseUnit]} · потери {number(line.wastePercent, 1)}%</span></div>)}</div>)}</div>
    </div>
  );
}

function SuppliersTab({ suppliers, items, estId, onAction, lang }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', leadTimeDays: '' });
  const [products, setProducts] = useState([{ stockItem: '', price: '', minPrice: '', maxPrice: '' }]);
  const updateProduct = (index, key, value) => setProducts((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const submit = (event) => { event.preventDefault(); onAction(async () => { await api.warehouse.createSupplier(estId, { ...form, leadTimeDays: Number(form.leadTimeDays || 0), products: products.filter((row) => row.stockItem).map((row) => ({ ...row, price: Number(row.price || 0), minPrice: Number(row.minPrice || 0), maxPrice: Number(row.maxPrice || 0) })) }); setForm({ name: '', phone: '', email: '', leadTimeDays: '' }); setProducts([{ stockItem: '', price: '', minPrice: '', maxPrice: '' }]); }); };
  return <div className="warehouse-two-column"><form className="card" onSubmit={submit}><h3 className="card-title">Новый поставщик</h3><label className="form-group">Название<input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="form-group">Телефон<input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label className="form-group">Email<input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="form-group">Срок поставки, дней<input className="form-input" type="number" min="0" value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} /></label><h4 className="card-title">Прайс-лист</h4>{products.map((row, index) => <div className="warehouse-supplier-product" key={index}><select className="form-input" value={row.stockItem} onChange={(e) => updateProduct(index, 'stockItem', e.target.value)}><option value="">Товар</option>{items.map((item) => <option key={item._id} value={item._id}>{localized(item.name, lang)}</option>)}</select><input className="form-input" type="number" min="0" step="0.01" placeholder="Цена" value={row.price} onChange={(e) => updateProduct(index, 'price', e.target.value)} /><input className="form-input" type="number" min="0" step="0.01" placeholder="Макс. цена" value={row.maxPrice} onChange={(e) => updateProduct(index, 'maxPrice', e.target.value)} /></div>)}<button className="btn btn-sm btn-secondary" type="button" onClick={() => setProducts((current) => [...current, { stockItem: '', price: '', minPrice: '', maxPrice: '' }])}>+ Товар</button><button className="btn btn-primary" style={{ marginLeft: 8 }} type="submit">Добавить</button></form><div className="card"><h3 className="card-title">Поставщики</h3>{suppliers.map((row) => <div className="table-row" key={row._id}><div><strong>{row.name}</strong><div className="warehouse-muted">{row.phone || row.email || 'Контакты не указаны'} · {row.products?.length || 0} поз. в прайсе</div></div><span>{row.leadTimeDays || 0} дн.</span></div>)}</div></div>;
}

function WarehousesTab({ warehouses, estId, onAction }) {
  const [form, setForm] = useState({ name: '', code: '', isDefault: false });
  const submit = (event) => { event.preventDefault(); onAction(async () => { await api.warehouse.createWarehouse(estId, form); setForm({ name: '', code: '', isDefault: false }); }); };
  return <div className="warehouse-two-column"><form className="card" onSubmit={submit}><h3 className="card-title">Новый склад</h3><label className="form-group">Название<input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="form-group">Код<input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label><label className="warehouse-checkbox"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Основной склад</label><button className="btn btn-primary" type="submit">Добавить</button></form><div className="card"><h3 className="card-title">Склады</h3>{warehouses.map((row) => <div className="table-row" key={row._id}><div><strong>{row.name}</strong><div className="warehouse-muted">{row.code || 'Без кода'}</div></div>{row.isDefault && <span className="warehouse-status warehouse-status-posted">Основной</span>}</div>)}</div></div>;
}
