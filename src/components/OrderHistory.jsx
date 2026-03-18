import React, { useState, useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Calendar, DollarSign, User, 
  Clock, ChevronDown, ChevronUp, Package, Search, Filter,
  CheckCircle2, Truck, XCircle, Timer
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Timer },
  READY: { label: 'Listo', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: CheckCircle2 },
  DELIVERED: { label: 'Entregado', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: Truck },
  TRASHED: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: XCircle },
};

const OrderHistory = () => {
  const { orders } = useOrders();
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'total', 'status'
  const [sortDir, setSortDir] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = order.id?.toString().toLowerCase().includes(term);
        const matchesName = (order.customerName || '').toLowerCase().includes(term);
        if (!matchesId && !matchesName) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      switch (sortBy) {
        case 'date': {
          const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
          const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
          return dateA - dateB;
        }
        case 'name':
          return (a.customerName || '').localeCompare(b.customerName || '');
        case 'total':
          return (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [filteredOrders, sortBy, sortDir]);

  // Group orders by date
  const grouped = useMemo(() => {
    const groups = {};
    sortedOrders.forEach(order => {
      const dateStr = new Date(order.createdAt || order.created_at || Date.now())
        .toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(order);
    });
    return groups;
  }, [sortedOrders]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortButton = ({ field, label, icon: Icon }) => {
    const isActive = sortBy === field;
    return (
      <button
        onClick={() => handleSort(field)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          border: isActive ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
          background: isActive ? 'rgba(229,62,62,0.08)' : 'var(--bg-color)',
          color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: isActive ? '600' : '400',
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap'
        }}
      >
        <Icon size={14} />
        {label}
        {isActive && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    );
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const totalFiltered = sortedOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  return (
    <div>
      {/* Search + Filters bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o # orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              fontSize: '13px',
              fontFamily: 'inherit',
              background: 'var(--bg-color)',
              color: 'var(--text-main)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'READY', 'DELIVERED', 'TRASHED'].map(st => {
            const isActive = statusFilter === st;
            const conf = STATUS_CONFIG[st];
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 12px',
                  border: isActive 
                    ? `1px solid ${st === 'ALL' ? 'var(--primary-color)' : conf?.color}` 
                    : '1px solid var(--border-color)',
                  background: isActive 
                    ? (st === 'ALL' ? 'rgba(229,62,62,0.08)' : conf?.bg) 
                    : 'transparent',
                  color: isActive 
                    ? (st === 'ALL' ? 'var(--primary-color)' : conf?.color) 
                    : 'var(--text-muted)',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: isActive ? '600' : '400',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {st === 'ALL' ? 'Todos' : conf?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <Filter size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Ordenar:</span>
        <SortButton field="date" label="Fecha" icon={Calendar} />
        <SortButton field="name" label="Cliente" icon={User} />
        <SortButton field="total" label="Monto" icon={DollarSign} />
        <SortButton field="status" label="Estado" icon={ArrowUpDown} />

        {/* Results count */}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{sortedOrders.length}</span> órdenes
          {statusFilter !== 'ALL' && ` • $${totalFiltered.toFixed(2)}`}
        </div>
      </div>

      {/* Grouped Orders */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
          background: 'var(--bg-container)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <Package size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', marginBottom: '4px' }}>No hay órdenes</p>
          <p style={{ fontSize: '13px' }}>
            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Las órdenes aparecerán aquí cuando se creen'}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateOrders]) => {
          const dayTotal = dateOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
          return (
            <div key={date} style={{ marginBottom: '28px' }}>
              {/* Date header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                padding: '0 4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--primary-color)" />
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0, textTransform: 'capitalize' }}>
                    {date}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-container)',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {dateOrders.length} {dateOrders.length === 1 ? 'orden' : 'órdenes'}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                  ${dayTotal.toFixed(2)}
                </span>
              </div>

              {/* Orders list */}
              <div style={{
                background: 'var(--bg-container)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                {dateOrders.map((order, idx) => {
                  const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConf.icon;
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <div key={order.id}>
                      {/* Order row */}
                      <div
                        onClick={() => toggleExpand(order.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '14px 18px',
                          cursor: 'pointer',
                          borderBottom: idx !== dateOrders.length - 1 || isExpanded ? '1px solid var(--border-color)' : 'none',
                          transition: 'background 0.15s',
                          gap: '12px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Status icon */}
                        <div style={{
                          padding: '8px',
                          borderRadius: '10px',
                          background: statusConf.bg,
                          color: statusConf.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <StatusIcon size={18} />
                        </div>

                        {/* Order info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>#{order.id}</span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              background: statusConf.bg,
                              color: statusConf.color,
                              fontWeight: '500'
                            }}>
                              {statusConf.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              {order.customerName || 'Cliente'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} />
                              {formatTime(order.createdAt || order.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Total */}
                        <span style={{ fontWeight: '700', fontSize: '15px', marginRight: '8px' }}>
                          ${(parseFloat(order.total) || 0).toFixed(2)}
                        </span>

                        {/* Expand icon */}
                        {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{
                          padding: '16px 18px 16px 58px',
                          background: 'rgba(0,0,0,0.15)',
                          borderBottom: idx !== dateOrders.length - 1 ? '1px solid var(--border-color)' : 'none',
                          animation: 'fadeIn 0.2s ease'
                        }}>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Detalle del pedido
                          </p>
                          {(order.items && order.items.length > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {order.items.map((item, i) => (
                                <div key={i} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  background: 'var(--bg-color)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-color)'
                                }}>
                                  <div>
                                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{item.name}</span>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <p style={{ fontSize: '11px', color: 'var(--primary-color)', margin: '2px 0 0', fontWeight: '500' }}>
                                        + {item.modifiers.map(m => m.name || m).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                      x{item.quantity || 1}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                                      ${(parseFloat(item.price || item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Sin detalles de artículos
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default OrderHistory;
