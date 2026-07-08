import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { TableStatusBadge } from './TablesGrid';
import WaiterOrderForm from './WaiterOrderForm';
import { patchOrderStatus, removeOrder } from '../utils/orders';

export default function TableDetailPanel({
  estId,
  tableId,
  tableNumber,
  onClose,
  onOrderChange,
  onTablesChange,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mode, setMode] = useState('orders');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback((silent = false) => {
    if (!estId || !tableId) return;
    if (!silent) setInitialLoading(true);
    api.tables
      .detail(estId, tableId)
      .then(setData)
      .finally(() => setInitialLoading(false));
  }, [estId, tableId]);

  useEffect(() => {
    setData(null);
    load(false);
  }, [load]);

  const updateStatus = async (orderId, status) => {
    setData((prev) => {
      if (!prev) return prev;
      if (status === 'paid') {
        return { ...prev, orders: removeOrder(prev.orders, orderId) };
      }
      return { ...prev, orders: patchOrderStatus(prev.orders, orderId, status) };
    });
    onOrderChange?.(orderId, status);
    try {
      await api.orders.updateStatus(estId, orderId, status);
    } catch {
      load(true);
    }
  };

  const clearTable = async () => {
    setData((prev) =>
      prev ? { ...prev, table: { ...prev.table, occupancyStatus: 'free' }, orders: [] } : prev
    );
    try {
      const updated = await api.tables.clear(estId, tableId);
      onTablesChange?.((prev) =>
        prev.map((t) => (t._id === tableId ? updated : t))
      );
    } catch {
      load(true);
    }
  };

  const handleConfirm = async () => {
    const action = confirm;
    setConfirm(null);
    if (!action) return;
    if (action.type === 'status') await updateStatus(action.orderId, action.status);
    if (action.type === 'clear') await clearTable();
  };

  if (!tableId) return null;

  const orders = data?.orders || [];
  const table = data?.table;

  return (
    <div className="table-detail-overlay" onClick={onClose}>
      <div
        className={`table-detail-panel card${mode === 'new' ? ' table-detail-panel--form' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="table-detail-header">
          <div>
            <h2>
              {t('menu.table')} {tableNumber}
            </h2>
            {table && <TableStatusBadge status={table.occupancyStatus} />}
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="category-tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`category-tab ${mode === 'orders' ? 'active' : ''}`}
            onClick={() => setMode('orders')}
          >
            {t('waiter.activeOrders')}
          </button>
          <button
            type="button"
            className={`category-tab ${mode === 'new' ? 'active' : ''}`}
            onClick={() => setMode('new')}
          >
            {t('waiter.addOrder')}
          </button>
        </div>

        {mode === 'new' ? (
          <WaiterOrderForm
            estId={estId}
            tableId={tableId}
            tableNumber={tableNumber}
            onCancel={() => setMode('orders')}
            onSuccess={() => {
              setMode('orders');
              load(true);
            }}
          />
        ) : initialLoading ? (
          <p className="panel-loading">{t('common.loading')}</p>
        ) : orders.length === 0 ? (
          <p className="empty-state" style={{ padding: '24px 0' }}>
            {t('tables.noOrders')}
          </p>
        ) : (
          <div className="table-detail-orders">
            {orders.map((order) => (
              <div key={order._id} className={`order-card order-card-${order.status}`}>
                <div className="order-card-header">
                  <div>
                    <StatusBadge status={order.status} />
                    {order.source === 'waiter' && (
                      <span className="order-source-badge">{t('tables.fromWaiter')}</span>
                    )}
                    {order.source === 'client' && (
                      <span className="order-source-badge">{t('tables.fromClient')}</span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="order-item-line">
                    <span>
                      {localized(item.name, lang)} × {item.quantity}
                    </span>
                    <span>{item.price * item.quantity} ₸</span>
                  </div>
                ))}
                <div style={{ fontWeight: 700, textAlign: 'right', marginTop: 8 }}>
                  {order.total} ₸
                </div>
                {order.status === 'ready' && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      setConfirm({
                        type: 'status',
                        orderId: order._id,
                        status: 'delivered',
                        title: t('waiter.confirmDelivered', { table: tableNumber }),
                      })
                    }
                  >
                    {t('waiter.markDelivered')}
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button
                    className="btn btn-accent btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      setConfirm({
                        type: 'status',
                        orderId: order._id,
                        status: 'paid',
                        title: t('waiter.confirmPaid', { table: tableNumber }),
                      })
                    }
                  >
                    {t('waiter.closeOrder')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {table && table.occupancyStatus !== 'free' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 16, width: '100%' }}
            onClick={() =>
              setConfirm({
                type: 'clear',
                title: t('waiter.confirmClear', { table: tableNumber }),
              })
            }
          >
            {t('tables.clear')}
          </button>
        )}

        <ConfirmDialog
          open={!!confirm}
          title={confirm?.title}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
          danger={confirm?.type === 'clear' || confirm?.status === 'paid'}
        />
      </div>
    </div>
  );
}
