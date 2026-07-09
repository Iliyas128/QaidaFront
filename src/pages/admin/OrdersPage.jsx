import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { useSocket } from '../../hooks/useSocket';
import { useStaffLiveSync } from '../../hooks/useStaffLiveSync';

function groupByDate(orders) {
  const groups = [];
  let currentDate = null;
  orders.forEach((order) => {
    const date = new Date(order.createdAt).toLocaleDateString();
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ type: 'date', date, key: `d-${date}` });
    }
    groups.push({ type: 'order', order, key: order._id });
  });
  return groups;
}

export default function OrdersPage() {
  const { estId } = useOutletContext();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [tab, setTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const socket = useSocket(estId, 'admin');

  const load = useCallback(() => {
    const scope = tab === 'history' ? 'history' : tab === 'all' ? 'all' : undefined;
    api.orders.list(estId, { scope }).then(setOrders);
  }, [estId, tab]);

  useStaffLiveSync(load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:new', load);
    socket.on('order:updated', load);
    return () => {
      socket.off('order:new', load);
      socket.off('order:updated', load);
    };
  }, [socket, load]);

  const grouped = useMemo(() => groupByDate(orders), [orders]);

  const updateStatus = async (orderId, status) => {
    await api.orders.updateStatus(estId, orderId, status);
    load();
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('admin.orders')}</h2>

      <div className="category-tabs staff-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`category-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          {t('admin.ordersActive')}
        </button>
        <button
          type="button"
          className={`category-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          {t('admin.ordersHistory')}
        </button>
        <button
          type="button"
          className={`category-tab ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          {t('admin.ordersAll')}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state card">
          <p>{tab === 'active' ? t('admin.ordersEmptyActive') : t('admin.ordersEmptyHistory')}</p>
        </div>
      ) : (
        grouped.map((entry) =>
          entry.type === 'date' ? (
            <div key={entry.key} className="orders-date-divider">
              {entry.date}
            </div>
          ) : (
            <div key={entry.key} className="order-card">
              <div className="order-card-header">
                <span className="order-card-table">
                  {t('menu.table')} {entry.order.tableNumber}
                </span>
                <StatusBadge status={entry.order.status} />
              </div>
              <div className="order-card-meta">
                {new Date(entry.order.createdAt).toLocaleString()}
                {entry.order.source === 'client' && (
                  <span className="order-source-badge">{t('tables.fromClient')}</span>
                )}
                {entry.order.source === 'waiter' && (
                  <span className="order-source-badge">{t('tables.fromWaiter')}</span>
                )}
              </div>
              {entry.order.items.map((item, i) => (
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
              <div style={{ fontWeight: 700, textAlign: 'right', marginTop: 8 }}>
                {entry.order.total} {t('common.currency')}
              </div>
              {tab === 'active' && entry.order.status === 'ready' && (
                <div className="order-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => updateStatus(entry.order._id, 'delivered')}
                  >
                    {t('waiter.markDelivered')}
                  </button>
                </div>
              )}
              {tab === 'active' && entry.order.status === 'delivered' && (
                <div className="order-actions">
                  <button
                    className="btn btn-sm btn-accent"
                    onClick={() => updateStatus(entry.order._id, 'paid')}
                  >
                    {t('waiter.closeOrder')}
                  </button>
                </div>
              )}
            </div>
          )
        )
      )}
    </div>
  );
}
