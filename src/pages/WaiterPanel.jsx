import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LangSwitch from '../components/LangSwitch';
import StaffMenuPanel from '../components/StaffMenuPanel';
import TablesGrid from '../components/TablesGrid';
import TableDetailPanel from '../components/TableDetailPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSocket } from '../hooks/useSocket';
import { useStaffNotifications } from '../hooks/useStaffNotifications';
import { useStaffLiveSync } from '../hooks/useStaffLiveSync';
import { usePushNotifications } from '../hooks/usePushNotifications';
import SoundToggle from '../components/SoundToggle';
import PushToggle from '../components/PushToggle';
import NotifyPermissionBanner from '../components/NotifyPermissionBanner';
import {
  playNewOrderSound,
  playOrderReadySound,
  playWaiterCallSound,
} from '../utils/notificationSound';
import {
  patchOrderStatus,
  patchTableFromOrder,
  removeOrder,
  upsertOrder,
  upsertTable,
} from '../utils/orders';

export default function WaiterPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { user, establishments, logout } = useAuth();
  const navigate = useNavigate();
  const estId = establishments[0]?._id;
  const [tab, setTab] = useState('tables');
  const [orders, setOrders] = useState([]);
  const [calls, setCalls] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const socket = useSocket(estId, 'waiter');
  useStaffNotifications();
  usePushNotifications(estId);

  const loadOrders = useCallback(() => {
    if (estId) api.orders.list(estId).then(setOrders);
  }, [estId]);

  const loadCalls = useCallback(() => {
    if (estId) api.waiterCalls.list(estId).then(setCalls);
  }, [estId]);

  const loadTables = useCallback(() => {
    if (estId) api.tables.status(estId).then(setTables);
  }, [estId]);

  const refreshAll = useCallback(() => {
    loadOrders();
    loadCalls();
    loadTables();
  }, [loadOrders, loadCalls, loadTables]);

  useStaffLiveSync(refreshAll);

  useEffect(() => {
    loadOrders();
    loadCalls();
    loadTables();
  }, [loadOrders, loadCalls, loadTables]);

  useEffect(() => {
    if (!socket) return;

    const onOrderNew = (order) => {
        if (order?._id) {
        setOrders((prev) => upsertOrder(prev, order));
        setTables((prev) => patchTableFromOrder(prev, order, 'add'));
        playNewOrderSound();
      } else loadOrders();
    };

    const onOrderUpdated = (order) => {
      if (!order?._id) return loadOrders();
      if (['paid', 'cancelled'].includes(order.status)) {
        setOrders((prev) => removeOrder(prev, order._id));
      } else {
        setOrders((prev) => upsertOrder(prev, order));
      }
      setTables((prev) => patchTableFromOrder(prev, order));
    };

    const onOrderReady = (order) => {
      onOrderUpdated(order);
      playOrderReadySound();
    };

    const onWaiterCall = (call) => {
      if (call?._id) {
        setCalls((prev) => [call, ...prev.filter((c) => c._id !== call._id)]);
        playWaiterCallSound();
      } else loadCalls();
      loadTables();
    };

    const onWaiterAck = (call) => {
      if (call?._id) setCalls((prev) => prev.filter((c) => c._id !== call._id));
      else loadCalls();
    };

    const onTableUpdated = (table) => {
      if (table?._id) setTables((prev) => upsertTable(prev, table));
      else loadTables();
    };

    socket.on('order:new', onOrderNew);
    socket.on('order:updated', onOrderUpdated);
    socket.on('order:ready', onOrderReady);
    socket.on('waiter:call', onWaiterCall);
    socket.on('waiter:acknowledged', onWaiterAck);
    socket.on('table:updated', onTableUpdated);

    return () => {
      socket.off('order:new', onOrderNew);
      socket.off('order:updated', onOrderUpdated);
      socket.off('order:ready', onOrderReady);
      socket.off('waiter:call', onWaiterCall);
      socket.off('waiter:acknowledged', onWaiterAck);
      socket.off('table:updated', onTableUpdated);
    };
  }, [socket, estId, loadOrders, loadCalls, loadTables]);

  const updateStatus = async (orderId, status) => {
    setOrders((prev) => patchOrderStatus(prev, orderId, status));
    try {
      await api.orders.updateStatus(estId, orderId, status);
      if (status === 'paid') {
        setOrders((prev) => removeOrder(prev, orderId));
      }
    } catch {
      loadOrders();
    }
  };

  const acknowledgeCall = async (callId) => {
    setCalls((prev) => prev.filter((c) => c._id !== callId));
    try {
      await api.waiterCalls.acknowledge(estId, callId);
    } catch {
      loadCalls();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const clearTable = async (tableId) => {
    setTables((prev) =>
      prev.map((t) =>
        t._id === tableId ? { ...t, occupancyStatus: 'free', activeOrderCount: 0 } : t
      )
    );
    try {
      const updated = await api.tables.clear(estId, tableId);
      setTables((prev) => upsertTable(prev, updated));
    } catch {
      loadTables();
    }
  };

  const handleConfirm = async () => {
    const action = confirm;
    setConfirm(null);
    if (!action) return;
    if (action.type === 'status') await updateStatus(action.orderId, action.status);
    if (action.type === 'clear') await clearTable(action.tableId);
    if (action.type === 'call') await acknowledgeCall(action.callId);
  };

  const activeOrders = orders.filter((o) => ['new', 'preparing', 'ready', 'delivered'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'ready');

  if (!estId) {
    return (
      <div className="empty-state card" style={{ margin: '24px 16px' }}>
        <p>{t('waiter.noEstablishment')}</p>
        <p style={{ marginTop: 12, fontSize: '0.8125rem', textTransform: 'none', letterSpacing: 0 }}>
          {t('waiter.noEstablishmentHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header staff-header">
        <div className="container header-inner">
          <div className="header-brand">
            <div className="logo staff-logo">{t('waiter.title').toUpperCase()}</div>
            <div className="logo-sub staff-name">{user?.name}</div>
          </div>
          <div className="header-actions staff-header-actions">
            {(calls.length > 0 || readyOrders.length > 0) && <span className="notification-dot" />}
            <div className="staff-notify-toggles">
              <SoundToggle />
              <PushToggle establishmentId={estId} />
            </div>
            <LangSwitch />
            <button className="btn btn-sm btn-secondary staff-logout-btn" onClick={handleLogout}>
              <span className="staff-logout-text">{t('auth.logout')}</span>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '16px 0 20px' }}>
        <NotifyPermissionBanner establishmentId={estId} />
        <div className="category-tabs staff-tabs" style={{ marginBottom: 16 }}>
          <button className={`category-tab ${tab === 'tables' ? 'active' : ''}`} onClick={() => setTab('tables')}>
            {t('tables.title')}
          </button>
          <button className={`category-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
            {t('waiter.activeOrders')}
          </button>
          <button className={`category-tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
            {t('admin.menuManagement')}
          </button>
        </div>

        <div className="panel-tab-pane" hidden={tab !== 'tables'}>
          <p style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {t('tables.tapHint')}
          </p>
          <TablesGrid
            tables={tables}
            onClear={clearTable}
            onSelect={setSelectedTable}
            selectedId={selectedTable?._id}
          />
          {selectedTable && (
            <TableDetailPanel
              estId={estId}
              tableId={selectedTable._id}
              tableNumber={selectedTable.number}
              onClose={() => setSelectedTable(null)}
              onOrderChange={(orderId, status) => updateStatus(orderId, status)}
              onTablesChange={setTables}
            />
          )}
        </div>

        <div className="panel-tab-pane" hidden={tab !== 'orders'}>
          {calls.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ marginBottom: 12 }}>{t('waiter.waiterCalls')}</h2>
              {calls.map((call) => (
                <div key={call._id} className="order-card" style={{ borderColor: 'var(--warning)' }}>
                  <div className="order-card-header">
                    <span className="order-card-table">🔔 {t('menu.table')} {call.tableNumber}</span>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() =>
                        setConfirm({
                          type: 'call',
                          callId: call._id,
                          title: t('waiter.confirmAcknowledge', { table: call.tableNumber }),
                        })
                      }
                    >
                      {t('waiter.acknowledge')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {readyOrders.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ marginBottom: 12 }}>{t('waiter.readyOrders')}</h2>
              {readyOrders.map((order) => (
                <div key={order._id} className="order-card" style={{ borderColor: 'var(--success)' }}>
                  <div className="order-card-header">
                    <span className="order-card-table">{t('menu.table')} {order.tableNumber}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  {order.items.map((item, i) => (
                    <div key={i} className="order-item-line">
                      <span>{localized(item.name, lang)} × {item.quantity}</span>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      setConfirm({
                        type: 'status',
                        orderId: order._id,
                        status: 'delivered',
                        title: t('waiter.confirmDelivered', { table: order.tableNumber }),
                      })
                    }
                  >
                    {t('waiter.markDelivered')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginBottom: 12 }}>{t('waiter.activeOrders')}</h2>
          {activeOrders.length === 0 ? (
            <div className="empty-state card"><p>—</p></div>
          ) : (
            activeOrders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-card-header">
                  <span className="order-card-table">{t('menu.table')} {order.tableNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="order-item-line">
                    <span>{localized(item.name, lang)} × {item.quantity}</span>
                    <span>{item.price * item.quantity} ₸</span>
                  </div>
                ))}
                <div style={{ fontWeight: 700, textAlign: 'right', marginTop: 8 }}>{order.total} ₸</div>
                {order.status === 'delivered' && (
                  <button
                    className="btn btn-accent btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      setConfirm({
                        type: 'status',
                        orderId: order._id,
                        status: 'paid',
                        title: t('waiter.confirmPaid', { table: order.tableNumber }),
                      })
                    }
                  >
                    {t('waiter.closeOrder')}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="panel-tab-pane" hidden={tab !== 'menu'}>
          <StaffMenuPanel estId={estId} />
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        danger={confirm?.type === 'clear' || confirm?.status === 'paid'}
      />
    </div>
  );
}
