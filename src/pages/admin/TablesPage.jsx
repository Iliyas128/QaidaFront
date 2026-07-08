import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import TablesGrid from '../../components/TablesGrid';
import { useSocket } from '../../hooks/useSocket';
import { patchTableFromOrder, upsertTable } from '../../utils/orders';

export default function TablesPage() {
  const { estId } = useOutletContext();
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [qrModal, setQrModal] = useState(null);
  const socket = useSocket(estId, 'admin');

  const load = useCallback(
    () => api.tables.status(estId).then(setTables).catch(() => api.tables.list(estId).then(setTables)),
    [estId]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    const onTableUpdated = (table) => {
      if (table?._id) setTables((prev) => upsertTable(prev, table));
      else load();
    };

    const onOrderNew = (order) => {
      if (order?._id) setTables((prev) => patchTableFromOrder(prev, order, 'add'));
    };

    const onOrderUpdated = (order) => {
      if (order?._id) setTables((prev) => patchTableFromOrder(prev, order));
    };

    socket.on('table:updated', onTableUpdated);
    socket.on('order:new', onOrderNew);
    socket.on('order:updated', onOrderUpdated);

    return () => {
      socket.off('table:updated', onTableUpdated);
      socket.off('order:new', onOrderNew);
      socket.off('order:updated', onOrderUpdated);
    };
  }, [socket, load]);

  const createTable = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const result = await api.tables.create(estId, { number: parseInt(number, 10) });
      setNumber('');
      setQrModal(result);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const showQr = async (tableId) => {
    const result = await api.tables.getQr(estId, tableId);
    setQrModal(result);
  };

  const clearTable = async (tableId) => {
    await api.tables.clear(estId, tableId);
    load();
  };

  return (
    <div>
      <h2>{t('admin.tables')}</h2>

      <div className="section-label" style={{ marginTop: 24 }}>{t('tables.title')}</div>
      <TablesGrid tables={tables} onClear={clearTable} showClear />

      <form onSubmit={createTable} style={{ display: 'flex', gap: 8, marginBottom: 16, marginTop: 32 }}>
        <input
          className="form-input"
          type="number"
          placeholder="№"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
          min={1}
          style={{ maxWidth: 100, border: '1px solid var(--border)', padding: '12px 14px' }}
        />
        <button className="btn btn-primary">{t('admin.createTable')}</button>
      </form>
      {error && <div className="error-msg">{error}</div>}

      <div className="grid-3" style={{ marginTop: 24 }}>
        {tables.map((table) => (
          <div key={table._id} className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('menu.table')} {table.number}
            </h3>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => showQr(table._id)}>
              {t('admin.qrCode')}
            </button>
          </div>
        ))}
      </div>

      {qrModal && (
        <div className="modal-overlay" onClick={() => setQrModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2 className="modal-title">{t('admin.qrCode')}</h2>
            {qrModal.qrCodeDataUrl && (
              <img src={qrModal.qrCodeDataUrl} alt="QR" style={{ margin: '0 auto 16px', maxWidth: 280 }} />
            )}
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {qrModal.qrUrl}
            </p>
            <a href={qrModal.qrCodeDataUrl} download={`table-${qrModal.table?.number || 'qr'}.png`} className="btn btn-primary" style={{ marginTop: 16 }}>
              {t('admin.downloadQr')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
