import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api';
import LangSwitch from '../components/LangSwitch';
import StatusBadge from '../components/StatusBadge';
import { useClientSocket } from '../hooks/useSocket';

export default function ClientMenu() {
  const { token } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [message, setMessage] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const socket = useClientSocket(data?.establishment?.id);

  const loadMenu = useCallback(async () => {
    try {
      const menuData = await api.client.getMenu(token);
      setData(menuData);
      if (menuData.categories.length) {
        setActiveCategory(menuData.categories[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadOrders = useCallback(async () => {
    try {
      const ords = await api.client.getOrders(token);
      setOrders(ords);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    loadMenu();
    loadOrders();
  }, [loadMenu, loadOrders]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      api.client.heartbeat(token).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const onUpdate = () => loadOrders();
    const onMenuUpdate = (updatedItem) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i._id === updatedItem._id ? updatedItem : i)),
        };
      });
    };

    socket.on('order:updated', onUpdate);
    socket.on('order:new', onUpdate);
    socket.on('order:ready', onUpdate);
    socket.on('menu:updated', onMenuUpdate);

    return () => {
      socket.off('order:updated', onUpdate);
      socket.off('order:new', onUpdate);
      socket.off('order:ready', onUpdate);
      socket.off('menu:updated', onMenuUpdate);
    };
  }, [socket, loadOrders]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1, comment: '' }];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const updateComment = (menuItemId, comment) => {
    setCart((prev) => prev.map((c) => (c.menuItemId === menuItemId ? { ...c, comment } : c)));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    setOrdering(true);
    try {
      await api.client.placeOrder(token, {
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          comment: c.comment,
        })),
      });
      setCart([]);
      setShowCart(false);
      setMessage(t('menu.orderPlaced'));
      loadOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setOrdering(false);
    }
  };

  const callWaiter = async () => {
    try {
      await api.client.callWaiter(token);
      setMessage(t('menu.waiterCalled'));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  const filteredItems = data.items.filter((item) => {
    const catId = item.category?._id || item.category;
    return !activeCategory || catId === activeCategory;
  });

  const activeOrders = orders.filter((o) =>
    ['new', 'preparing', 'ready', 'delivered'].includes(o.status)
  );
  const bannerStatus = activeOrders.some((o) => o.status === 'ready')
    ? 'ready'
    : activeOrders.some((o) => o.status === 'preparing')
      ? 'preparing'
      : activeOrders.some((o) => o.status === 'new')
        ? 'new'
        : null;
  const menuTheme = ['classic', 'bistro', 'night'].includes(data.establishment.menuTheme)
    ? data.establishment.menuTheme
    : 'classic';

  return (
    <div
      className={`page client-menu-page client-menu-theme-${menuTheme}`}
      style={{ paddingBottom: cartCount > 0 ? 96 : 0 }}
    >
      <header className="header client-menu-header">
        <div className="container header-inner">
          <div>
            {data.establishment.logo && (
              <img src={data.establishment.logo} alt="" style={{ height: 28, marginBottom: 6, objectFit: 'contain' }} />
            )}
            <div className="logo">{data.establishment.name.toUpperCase()}</div>
            <div className="logo-sub">
              {t('menu.table')} {data.table.number}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => setShowOrders(!showOrders)}>
              {t('menu.yourOrders')}
            </button>
            <button className="icon-btn" onClick={callWaiter} title={t('menu.callWaiter')}>
              ···
            </button>
            <LangSwitch />
          </div>
        </div>
      </header>

      {message && (
        <div className="container" style={{ paddingTop: 12 }}>
          <div className="success-msg">{message}</div>
        </div>
      )}

      {activeOrders.length > 0 && !showOrders && bannerStatus && (
        <button
          type="button"
          className={`client-order-banner client-order-banner-${bannerStatus}`}
          onClick={() => setShowOrders(true)}
        >
          <span>
            {t('menu.yourOrders')}: {activeOrders.length} — {t(`orderStatus.${bannerStatus}`)}
          </span>
          <span>→</span>
        </button>
      )}

      {showOrders && (
        <div className="container" style={{ padding: '12px 16px' }}>
          {orders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{t('menu.emptyCart')}</p>
          ) : (
            orders.map((order) => (
              <div key={order._id} className={`order-card order-card-${order.status}`}>
                <div className="order-card-header">
                  <StatusBadge status={order.status} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="order-item-line">
                    <span>
                      {localized(item.name, lang)} × {item.quantity}
                      {item.comment && <div className="order-item-comment">{item.comment}</div>}
                    </span>
                    <span>
                      {item.price * item.quantity} {t('common.currency')}
                    </span>
                  </div>
                ))}
                <div style={{ fontWeight: 700, marginTop: 8, textAlign: 'right' }}>
                  {t('common.total')}: {order.total} {t('common.currency')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <main className="container client-menu-shell">
        <section className="client-menu-intro">
          <span className="client-menu-intro-kicker">
            {lang === 'kk' ? `ҮСТЕЛ ${data.table.number}` : `СТОЛ ${data.table.number}`}
          </span>
          <h1>{lang === 'kk' ? 'Мәзір' : 'Меню'}</h1>
          {data.establishment.address && <p>{data.establishment.address}</p>}
        </section>

        <div className="category-tabs client-menu-categories">
          {data.categories.map((cat) => (
            <button
              key={cat._id}
              className={`category-tab ${activeCategory === cat._id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat._id)}
            >
              {localized(cat.name, lang)}
            </button>
          ))}
        </div>

        <div className="grid-2 client-menu-grid">
          {filteredItems.map((item) => (
            <button
              key={item._id}
              type="button"
              className="menu-item menu-item-clickable"
              onClick={() => setSelectedItem(item)}
            >
              {item.image ? (
                <img src={item.image} alt="" className="menu-item-image" />
              ) : (
                <div className="menu-item-image placeholder">—</div>
              )}
              <div className="menu-item-body">
                <div className="menu-item-name">{localized(item.name, lang)}</div>
                {localized(item.description, lang) && (
                  <div className="menu-item-desc">{localized(item.description, lang)}</div>
                )}
                <div className="menu-item-footer">
                  <span className="menu-item-price">
                    {item.price} {t('common.currency')}
                  </span>
                  {item.isAvailable !== false ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                    >
                      +
                    </button>
                  ) : (
                    <span className="menu-item-unavailable">{t('menu.unavailable')}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {cartCount > 0 && (
        <div className="cart-bar client-menu-cart-bar">
          <div className="cart-bar-info">
            <strong>{t('menu.cart')} ({cartCount})</strong>
            <div className="cart-bar-total">{cartTotal} {t('common.currency')}</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCart(true)}>
            {t('menu.placeOrder')}
          </button>
        </div>
      )}

      {selectedItem && (
        <div className="dish-detail-overlay" onClick={() => setSelectedItem(null)}>
          <div className="dish-detail-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dish-detail-close"
              onClick={() => setSelectedItem(null)}
              aria-label={t('common.back')}
            >
              ✕
            </button>
            {selectedItem.image ? (
              <img src={selectedItem.image} alt="" className="dish-detail-image" />
            ) : (
              <div className="dish-detail-image placeholder">—</div>
            )}
            <div className="dish-detail-body">
              <h2 className="dish-detail-name">{localized(selectedItem.name, lang)}</h2>
              <div className="dish-detail-price">
                {selectedItem.price} {t('common.currency')}
              </div>
              {localized(selectedItem.description, lang) ? (
                <p className="dish-detail-desc">{localized(selectedItem.description, lang)}</p>
              ) : (
                <p className="dish-detail-desc muted">{t('admin.noDescription')}</p>
              )}
            </div>
            <div className="dish-detail-footer">
              {selectedItem.isAvailable !== false ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    addToCart(selectedItem);
                    setSelectedItem(null);
                    setMessage(t('menu.addedToCart'));
                    setTimeout(() => setMessage(''), 2000);
                  }}
                >
                  {t('menu.addToCart')}
                </button>
              ) : (
                <span className="menu-item-unavailable">{t('menu.unavailable')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-panel-title">{t('menu.cart')}</div>
            {cart.map((item) => (
              <div key={item.menuItemId} className="cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{localized(item.name, lang)}</div>
                  <div style={{ color: 'var(--accent)' }}>
                    {item.price} {t('common.currency')}
                  </div>
                  <label className="cart-item-comment-label">{t('menu.itemComment')}</label>
                  <input
                    className="form-input"
                    style={{ marginTop: 4, fontSize: '0.8125rem', padding: '8px 10px' }}
                    placeholder={t('menu.commentPlaceholder')}
                    value={item.comment}
                    onChange={(e) => updateComment(item.menuItemId, e.target.value)}
                  />
                </div>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => updateQty(item.menuItemId, -1)}>
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.menuItemId, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
            <div style={{ fontWeight: 700, fontSize: '1.125rem', margin: '16px 0', textAlign: 'right' }}>
              {t('common.total')}: {cartTotal} {t('common.currency')}
            </div>
            <button className="btn btn-primary btn-block" onClick={placeOrder} disabled={ordering}>
              {ordering ? t('common.loading') : t('menu.placeOrder')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
