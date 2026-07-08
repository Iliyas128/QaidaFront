import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api';

export default function WaiterOrderForm({ estId, tableId, tableNumber, onSuccess, onCancel }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [comment, setComment] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!estId) return;
    Promise.all([api.menu.categories(estId), api.menu.items(estId)])
      .then(([cats, its]) => {
        const available = its.filter((i) => i.isAvailable !== false);
        setCategories(cats);
        setItems(available);
        if (cats.length) setActiveCategory(cats[0]._id);
      })
      .finally(() => setInitialLoading(false));
  }, [estId]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const submit = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    setError('');
    try {
      await api.orders.create(estId, {
        tableId,
        items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        comment,
      });
      setCart([]);
      setComment('');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const catId = item.category?._id || item.category;
    return !activeCategory || catId === activeCategory;
  });

  if (initialLoading) return <p className="panel-loading">{t('common.loading')}</p>;

  return (
    <div className="waiter-order-form">
      <p className="waiter-order-form-hint">
        {t('waiter.orderForTable', { number: tableNumber })}
      </p>

      <div className="category-tabs waiter-order-tabs">
        {categories.map((cat) => (
          <button
            key={cat._id}
            type="button"
            className={`category-tab ${activeCategory === cat._id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat._id)}
          >
            {localized(cat.name, lang)}
          </button>
        ))}
      </div>

      <div className="waiter-order-items">
        {filteredItems.map((item) => (
          <div key={item._id} className="waiter-order-item">
            <div className="waiter-order-item-info">
              <div className="waiter-order-item-name">{localized(item.name, lang)}</div>
              <div className="waiter-order-item-price">
                {item.price} {t('common.currency')}
              </div>
            </div>
            <button
              type="button"
              className="waiter-order-add-btn"
              onClick={() => addToCart(item)}
              aria-label={t('menu.addToCart')}
            >
              +
            </button>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="waiter-order-cart">
          <h3 className="waiter-order-cart-title">{t('menu.cart')}</h3>

          {cart.map((c) => (
            <div key={c.menuItemId} className="waiter-order-cart-row">
              <div className="waiter-order-cart-top">
                <span className="waiter-order-cart-name">{localized(c.name, lang)}</span>
                <span className="waiter-order-cart-price">
                  {c.price * c.quantity} {t('common.currency')}
                </span>
              </div>
              <div className="waiter-order-cart-actions">
                <div className="waiter-order-qty">
                  <button
                    type="button"
                    className="waiter-order-qty-btn"
                    onClick={() => updateQty(c.menuItemId, -1)}
                    aria-label="−"
                  >
                    −
                  </button>
                  <span className="waiter-order-qty-value">{c.quantity}</span>
                  <button
                    type="button"
                    className="waiter-order-qty-btn"
                    onClick={() => updateQty(c.menuItemId, 1)}
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="waiter-order-total">
            {t('common.total')}: {total} {t('common.currency')}
          </div>

          <textarea
            className="form-input waiter-order-comment"
            placeholder={t('menu.commentPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />

          {error && <p className="waiter-order-error">{error}</p>}

          <div className="waiter-order-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? t('common.loading') : t('waiter.placeOrder')}
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
