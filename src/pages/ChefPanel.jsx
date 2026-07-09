import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LangSwitch from '../components/LangSwitch';
import StaffMenuPanel from '../components/StaffMenuPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSocket } from '../hooks/useSocket';
import { useStaffNotifications } from '../hooks/useStaffNotifications';
import { useStaffLiveSync } from '../hooks/useStaffLiveSync';
import { usePushNotifications } from '../hooks/usePushNotifications';
import SoundToggle from '../components/SoundToggle';
import PushToggle from '../components/PushToggle';
import NotifyPermissionBanner from '../components/NotifyPermissionBanner';
import { playNewOrderSound } from '../utils/notificationSound';
import { useChefFontSize } from '../hooks/useChefFontSize';
import { patchOrderStatus, removeOrder, upsertOrder } from '../utils/orders';

export default function ChefPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { user, establishments, logout } = useAuth();
  const navigate = useNavigate();
  const estId = establishments[0]?._id;
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const { size: fontSize, stepDown, stepUp, canStepDown, canStepUp } = useChefFontSize();
  const socket = useSocket(estId, 'chef');
  useStaffNotifications();
  usePushNotifications(estId);

  const load = useCallback(() => {
    if (estId) api.orders.list(estId).then(setOrders);
  }, [estId]);

  useStaffLiveSync(load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    const onOrderNew = (order) => {
      if (order?._id) {
        setOrders((prev) => upsertOrder(prev, order));
        if (order.status === 'new') playNewOrderSound();
      } else load();
    };

    const onOrderUpdated = (order) => {
      if (!order?._id) return load();
      if (['paid', 'cancelled', 'delivered'].includes(order.status)) {
        setOrders((prev) => removeOrder(prev, order._id));
      } else {
        setOrders((prev) => upsertOrder(prev, order));
      }
    };

    socket.on('order:new', onOrderNew);
    socket.on('order:updated', onOrderUpdated);
    return () => {
      socket.off('order:new', onOrderNew);
      socket.off('order:updated', onOrderUpdated);
    };
  }, [socket, estId, load]);

  const updateStatus = async (orderId, status) => {
    setOrders((prev) => patchOrderStatus(prev, orderId, status));
    try {
      await api.orders.updateStatus(estId, orderId, status);
      if (status === 'ready') {
        setOrders((prev) => removeOrder(prev, orderId));
      }
    } catch {
      load();
    }
  };

  const requestStatusChange = (order, status) => {
    setConfirm({ order, status });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { order, status } = confirm;
    setConfirm(null);
    await updateStatus(order._id, status);
  };

  const formatOrderItems = (order) =>
    order.items
      .map((item) => `${localized(item.name, lang)} × ${item.quantity}`)
      .join(', ');

  const activeOrders = orders.filter((o) => ['new', 'preparing'].includes(o.status));

  if (!estId) {
    return (
      <div className="empty-state">
        <p>Нет назначенного заведения</p>
      </div>
    );
  }

  const confirmTitle =
    confirm?.status === 'preparing'
      ? t('chef.confirmStartTitle', { table: confirm.order.tableNumber })
      : confirm?.status === 'ready'
        ? t('chef.confirmReadyTitle', { table: confirm.order.tableNumber })
        : '';

  const confirmMessage = confirm ? formatOrderItems(confirm.order) : '';

  return (
    <div className={`page chef-panel chef-font-${fontSize}`}>
      <header className="header staff-header">
        <div className="container header-inner">
          <div className="header-brand">
            <div className="logo staff-logo">{t('chef.title').toUpperCase()}</div>
            <div className="logo-sub staff-name">{user?.name}</div>
          </div>
          <div className="header-actions staff-header-actions">
            <div className="chef-font-controls" title={t('chef.fontSize')}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={!canStepDown}
                onClick={stepDown}
                aria-label={t('chef.fontSmaller')}
              >
                A−
              </button>
              <span className="chef-font-label">{t(`chef.font.${fontSize}`)}</span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={!canStepUp}
                onClick={stepUp}
                aria-label={t('chef.fontLarger')}
              >
                A+
              </button>
            </div>
            <div className="staff-notify-toggles">
              <SoundToggle />
              <PushToggle establishmentId={estId} />
            </div>
            <LangSwitch />
            <button className="btn btn-sm btn-secondary staff-logout-btn" onClick={() => { logout(); navigate('/login'); }}>
              <span className="staff-logout-text">{t('auth.logout')}</span>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '16px 0 20px' }}>
        <NotifyPermissionBanner establishmentId={estId} />
        <div className="category-tabs staff-tabs" style={{ marginBottom: 16 }}>
          <button className={`category-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
            {t('chef.newOrders')}
          </button>
          <button className={`category-tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
            {t('admin.menuManagement')}
          </button>
        </div>

        <div className="panel-tab-pane" hidden={tab !== 'orders'}>
          <h2 className="chef-section-title">{t('chef.newOrders')}</h2>
          {activeOrders.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">👨‍🍳</div>
              <p>—</p>
            </div>
          ) : (
            activeOrders.map((order) => (
              <div key={order._id} className={`order-card chef-order-card order-card-${order.status}`}>
                <div className="order-card-header">
                  <span className="order-card-table chef-order-table">
                    {t('menu.table')} {order.tableNumber}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="chef-order-time">
                  {new Date(order.createdAt).toLocaleTimeString()}
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="order-item-line chef-order-item">
                    <span>
                      <strong className="chef-dish-name">{localized(item.name, lang)}</strong>
                      <span className="chef-dish-qty"> × {item.quantity}</span>
                      {item.comment && <div className="order-item-comment chef-item-comment">{item.comment}</div>}
                    </span>
                  </div>
                ))}
                <div className="order-actions chef-order-actions">
                  {order.status === 'new' && (
                    <button
                      type="button"
                      className="btn btn-primary chef-action-btn"
                      onClick={() => requestStatusChange(order, 'preparing')}
                    >
                      {t('chef.startCooking')}
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      type="button"
                      className="btn btn-accent chef-action-btn"
                      onClick={() => requestStatusChange(order, 'ready')}
                    >
                      {t('chef.markReady')}
                    </button>
                  )}
                </div>
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
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={
          confirm?.status === 'preparing' ? t('chef.startCooking') : t('chef.markReady')
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
        danger={confirm?.status === 'ready'}
      />
    </div>
  );
}
