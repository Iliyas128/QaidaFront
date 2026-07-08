import { useTranslation } from 'react-i18next';

export const STATUS_CLASS = {
  free: 'table-cell-free',
  occupied: 'table-cell-occupied',
  calling: 'table-cell-calling',
  has_order: 'table-cell-order-new',
  order_new: 'table-cell-order-new',
  order_preparing: 'table-cell-order-preparing',
  order_ready: 'table-cell-order-ready',
  order_delivered: 'table-cell-order-delivered',
};

export function TableStatusBadge({ status }) {
  const { t } = useTranslation();
  const key = status === 'has_order' ? 'order_new' : status;
  return (
    <span className={`table-status-badge ${STATUS_CLASS[status] || ''}`}>
      {t(`tables.status.${key}`, { defaultValue: t(`tables.status.${status}`) })}
    </span>
  );
}

export default function TablesGrid({
  tables,
  onClear,
  showClear = false,
  onSelect,
  selectedId,
}) {
  const { t } = useTranslation();

  if (!tables.length) {
    return <p className="empty-state" style={{ padding: '32px 0' }}>—</p>;
  }

  return (
    <div className="tables-grid">
      {tables.map((table) => (
        <div
          key={table._id}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          className={`table-cell ${STATUS_CLASS[table.occupancyStatus] || 'table-cell-free'}${selectedId === table._id ? ' table-cell-selected' : ''}${onSelect ? ' table-cell-clickable' : ''}`}
          onClick={onSelect ? () => onSelect(table) : undefined}
          onKeyDown={
            onSelect
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelect(table);
                }
              : undefined
          }
        >
          <div className="table-cell-number">{table.number}</div>
          <TableStatusBadge status={table.occupancyStatus} />
          {table.activeOrderCount > 0 && (
            <div className="table-cell-meta">
              {t('tables.orders')}: {table.activeOrderCount}
            </div>
          )}
          {showClear && !onSelect && table.occupancyStatus !== 'free' && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginTop: 12, width: '100%' }}
              onClick={(e) => {
                e.stopPropagation();
                onClear(table._id);
              }}
            >
              {t('tables.clear')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
