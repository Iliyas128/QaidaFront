import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { useSocket } from '../../hooks/useSocket';

export default function OrdersPage() {
  const { estId } = useOutletContext();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [orders, setOrders] = useState([]);
  const socket = useSocket(estId, 'admin');

  const load = () => api.orders.list(estId).then(setOrders);
  useEffect(() => { load(); }, [estId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('order:new', load);
    socket.on('order:updated', load);
    return () => {
      socket.off('order:new', load);
      socket.off('order:updated', load);
    };
  }, [socket, estId]);

  const updateStatus = async (orderId, status) => {
    await api.orders.updateStatus(estId, orderId, status);
    load();
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>{t('admin.orders')}</h2>
      {orders.length === 0 ? (
        <div className="empty-state"><p>—</p></div>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="order-card">
            <div className="order-card-header">
              <span className="order-card-table">{t('menu.table')} {order.tableNumber}</span>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              {new Date(order.createdAt).toLocaleString()}
            </div>
            {order.items.map((item, i) => (
              <div key={i} className="order-item-line">
                <span>
                  {localized(item.name, lang)} × {item.quantity}
                  {item.comment && <div className="order-item-comment">{item.comment}</div>}
                </span>
                <span>{item.price * item.quantity} ₸</span>
              </div>
            ))}
            <div style={{ fontWeight: 700, textAlign: 'right', marginTop: 8 }}>
              {order.total} ₸
            </div>
            {order.status !== 'paid' && order.status !== 'cancelled' && (
              <div className="order-actions">
                {order.status === 'ready' && (
                  <button className="btn btn-sm btn-primary" onClick={() => updateStatus(order._id, 'delivered')}>
                    {t('waiter.markDelivered')}
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button className="btn btn-sm btn-accent" onClick={() => updateStatus(order._id, 'paid')}>
                    {t('waiter.closeOrder')}
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
