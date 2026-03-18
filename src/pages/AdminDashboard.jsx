import React, { useState } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BarChart3, DollarSign, ListOrdered, CheckCircle2, Trash2, ArchiveRestore, Users, Check, X, LogOut, Settings, Beef, Calendar, ClipboardList } from 'lucide-react';
import OrderHistory from '../components/OrderHistory';

const AdminDashboard = () => {
  const { orders, deleteOrder, restoreOrder, permanentlyDeleteOrder } = useOrders();
  const { currentUser, pendingUsers, approveUser, rejectUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [viewTab, setViewTab] = useState('active'); // 'active' or 'trash'

  // Filter orders based on their trashed status
  const activeOrders = orders.filter(o => o.status !== 'TRASHED');
  const trashedOrders = orders.filter(o => o.status === 'TRASHED');

  // Stats only apply to non-trashed orders
  const deliveredOrders = activeOrders.filter(o => o.status === 'DELIVERED');
  const totalSales = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = activeOrders.length;
  const completedOrders = deliveredOrders.length;

  // Count burgers sold - items in delivered orders that are hamburguesas
  const burgersSold = deliveredOrders.reduce((count, order) => {
    const burgers = (order.items || []).filter(item =>
      item.category === 'Hamburguesas' || item.name?.toLowerCase().includes('mexa') || item.name?.toLowerCase().includes('bbq') || item.name?.toLowerCase().includes('clásica') || item.name?.toLowerCase().includes('clasica')
    );
    return count + burgers.reduce((s, b) => s + (b.quantity || 1), 0);
  }, 0);

  // Today's date string
  const todayStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ background: 'var(--bg-container)', padding: '12px', borderRadius: '50%', color }}>
        <Icon size={24} />
      </div>
      <div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        <h3 style={{ fontSize: '24px', fontWeight: '700' }}>{value}</h3>
      </div>
    </div>
  );

  const handleDelete = (orderId) => {
    if (window.confirm(`¿Mover la orden #${orderId} a la papelera?`)) {
      deleteOrder(orderId);
    }
  };

  const handleRestore = (orderId) => {
    if (window.confirm(`¿Restaurar la orden #${orderId} a pendientes?`)) {
      restoreOrder(orderId);
    }
  };

  const handlePermanentDelete = (orderId) => {
    if (window.confirm(`¿ELIMINAR PERMANENTEMENTE la orden #${orderId}? Esta acción no se puede deshacer.`)) {
      permanentlyDeleteOrder(orderId);
    }
  };

  const displayedOrders = viewTab === 'active' ? activeOrders : trashedOrders;

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={28} color="var(--primary-color)" />
            <h1 style={{ fontSize: '24px', margin: 0 }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <Calendar size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{todayStr}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Hola, <strong>{currentUser?.id}</strong></span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => navigate('/admin/users')} className="btn" style={{ padding: '8px', border: 'none', background: 'var(--bg-container)', color: 'var(--text-main)', borderRadius: '50%' }} title="Administrar Perfiles">
              <Settings size={16} />
            </button>
            <button onClick={logout} className="btn" style={{ padding: '8px', border: 'none', background: 'var(--bg-container)', color: 'var(--primary-color)', borderRadius: '50%' }} title="Cerrar Sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ADMIN ONLY: Pantalla de Aprobación de Usuarios */}
      {currentUser?.role === 'admin' && pendingUsers.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--bg-container)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Usuarios Pendientes de Aprobación ({pendingUsers.length})</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingUsers.map(user => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontWeight: '600' }}>{user.id}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px', background: 'var(--bg-container)', padding: '2px 6px', borderRadius: '4px' }}>Esperando..</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn" 
                    onClick={() => approveUser(user.id)}
                    style={{ padding: '6px 12px', border: 'none', background: 'var(--success-bg)', color: 'var(--success-color)', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Check size={14} /> Aprobar
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => rejectUser(user.id)}
                    style={{ padding: '6px 12px', border: 'none', background: 'var(--focus-ring)', color: 'var(--primary-color)', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={14} /> Denegar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controles de vista (Active / Trash / History) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'flex', background: 'var(--bg-container)', borderRadius: 'var(--border-radius-md)', padding: '4px', gap: '2px' }}>
          <button 
            className="btn"
            style={{ 
              background: viewTab === 'active' ? 'var(--bg-color)' : 'transparent', 
              boxShadow: viewTab === 'active' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              fontSize: '12px',
              padding: '6px 12px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
            onClick={() => setViewTab('active')}
          >
            <ListOrdered size={14} />
            Activas
          </button>
          <button 
            className="btn"
            style={{ 
              background: viewTab === 'history' ? 'var(--bg-color)' : 'transparent', 
              boxShadow: viewTab === 'history' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              fontSize: '12px',
              padding: '6px 12px',
              color: viewTab === 'history' ? 'var(--primary-color)' : 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
            onClick={() => setViewTab('history')}
          >
            <ClipboardList size={14} />
            Historial
          </button>
          <button 
            className="btn"
            style={{ 
              background: viewTab === 'trash' ? 'var(--bg-color)' : 'transparent', 
              boxShadow: viewTab === 'trash' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              fontSize: '12px',
              padding: '6px 12px',
              color: viewTab === 'trash' ? 'var(--primary-color)' : 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
            onClick={() => setViewTab('trash')}
          >
            <Trash2 size={14} />
            Papelera ({trashedOrders.length})
          </button>
        </div>
      </div>

      {/* History tab */}
      {viewTab === 'history' && <OrderHistory />}

      {/* Active / Trash tabs */}
      {viewTab !== 'history' && (
        <>
          {viewTab === 'active' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <StatCard 
                title="Ventas del Día" 
                value={`$${totalSales.toFixed(2)}`} 
                icon={DollarSign} 
                color="var(--success-color)" 
              />
              <StatCard 
                title="Órdenes Totales" 
                value={totalOrders} 
                icon={ListOrdered} 
                color="var(--primary-color)" 
              />
              <StatCard 
                title="Completadas" 
                value={completedOrders} 
                icon={CheckCircle2} 
                color="var(--text-main)" 
              />
              <StatCard 
                title="Burgers Vendidas" 
                value={burgersSold} 
                icon={Beef} 
                color="#f97316" 
              />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                {viewTab === 'active' ? 'Órdenes Recientes' : 'Papelera de Reciclaje'}
              </h2>
            </div>
            
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {displayedOrders.map((order, idx) => (
                <div key={order.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px',
                  borderBottom: idx !== displayedOrders.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <div>
                    <span style={{ fontWeight: '600', textDecoration: order.status === 'TRASHED' ? 'line-through' : 'none' }}>#{order.id}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px' }}>{order.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-container)' }}>
                      {order.status}
                    </span>
                    <span style={{ fontWeight: '600', minWidth: '60px', textAlign: 'right', opacity: order.status === 'TRASHED' ? 0.5 : 1 }}>
                      ${(parseFloat(order.total) || 0).toFixed(2)}
                    </span>
                    
                    {viewTab === 'active' ? (
                      <button 
                        className="btn" 
                        style={{ 
                          padding: '12px', 
                          border: 'none', 
                          background: 'var(--focus-ring)', 
                          color: 'var(--primary-color)', 
                          marginLeft: '8px',
                          borderRadius: 'var(--border-radius-md)'
                        }}
                        onClick={() => handleDelete(order.id)}
                        title="Mover a papelera"
                      >
                        <Trash2 size={20} />
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '12px', 
                            border: 'none', 
                            background: 'var(--success-bg)', 
                            color: 'var(--success-color)', 
                            borderRadius: 'var(--border-radius-md)'
                          }}
                          onClick={() => handleRestore(order.id)}
                          title="Restaurar Orden"
                        >
                          <ArchiveRestore size={20} />
                        </button>
                        <button 
                          className="btn" 
                          style={{ 
                            padding: '12px', 
                            border: 'none', 
                            background: 'rgba(239,68,68,0.15)', 
                            color: '#ef4444', 
                            borderRadius: 'var(--border-radius-md)'
                          }}
                          onClick={() => handlePermanentDelete(order.id)}
                          title="Eliminar definitivamente"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                    
                  </div>
                </div>
              ))}
              {displayedOrders.length === 0 && (
                 <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                   {viewTab === 'active' ? 'No hay órdenes activas.' : 'La papelera está vacía.'}
                 </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
