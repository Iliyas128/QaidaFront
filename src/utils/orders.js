export function upsertOrder(list, order) {
  if (!order?._id) return list;
  const idx = list.findIndex((o) => o._id === order._id);
  if (idx === -1) return [order, ...list];
  const next = [...list];
  next[idx] = order;
  return next;
}

export function patchOrderStatus(list, orderId, status) {
  return list.map((o) => (o._id === orderId ? { ...o, status } : o));
}

export function removeOrder(list, orderId) {
  return list.filter((o) => o._id !== orderId);
}

const STATUS_TO_OCCUPANCY = {
  new: 'order_new',
  preparing: 'order_preparing',
  ready: 'order_ready',
  delivered: 'order_delivered',
};

export function tableIdOf(value) {
  if (!value) return null;
  return String(value._id || value);
}

export function upsertTable(list, table) {
  if (!table?._id) return list;
  const sid = tableIdOf(table);
  const idx = list.findIndex((t) => tableIdOf(t) === sid);
  if (idx === -1) return [...list, table].sort((a, b) => a.number - b.number);
  const next = [...list];
  next[idx] = { ...next[idx], ...table };
  return next;
}

export function patchTableFromOrder(tables, order, action = 'update') {
  const sid = tableIdOf(order.table);
  if (!sid) return tables;

  const idx = tables.findIndex((t) => tableIdOf(t) === sid);
  if (idx === -1) return tables;

  const prev = tables[idx];
  const next = [...tables];

  if (['paid', 'cancelled'].includes(order.status)) {
    const count = Math.max(0, (prev.activeOrderCount || 1) - 1);
    next[idx] = {
      ...prev,
      activeOrderCount: count,
      occupancyStatus: count > 0 ? prev.occupancyStatus : 'free',
    };
    return next;
  }

  const occupancyStatus = STATUS_TO_OCCUPANCY[order.status] || prev.occupancyStatus;
  const activeOrderCount =
    action === 'add'
      ? (prev.activeOrderCount || 0) + 1
      : Math.max(prev.activeOrderCount || 0, 1);

  next[idx] = {
    ...prev,
    number: order.tableNumber ?? prev.number,
    occupancyStatus,
    activeOrderCount,
  };
  return next;
}
