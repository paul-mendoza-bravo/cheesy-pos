import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrdersContext';
import { LogOut, User } from 'lucide-react';

const RoleSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { orders } = useOrders();

  const roles = [
    { path: '/pos', label: 'Caja', allowed: ['ayudante', 'admin'] },
    { path: '/kitchen', label: 'Cocina', allowed: ['parillero', 'admin'] },
    { path: '/delivery', label: 'Repartidor', allowed: ['repartidor', 'admin'] },
    { path: '/admin', label: 'Admin', allowed: ['marketer', 'admin'] }
  ];

  if (!currentUser) return null;

  const visibleRoles = roles.filter(r => r.allowed.includes(currentUser.role) || currentUser.role === 'admin');

  const pendingKitchen = orders.filter(o => o.status === 'PENDING').length;
  const readyDelivery = orders.filter(o => o.status === 'READY').length;

  const getBadgeCount = (path) => {
    if (path === '/kitchen') return pendingKitchen;
    if (path === '/delivery') return readyDelivery;
    return 0;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: 'var(--bg-container)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        flex: 1
      }}>
        {visibleRoles.map(role => {
          const badgeCount = getBadgeCount(role.path);
          return (
          <button
            key={role.path}
            className={`btn ${location.pathname === role.path ? 'btn-primary' : ''}`}
            onClick={() => navigate(role.path)}
            style={{ position: 'relative', whiteSpace: 'nowrap', flexShrink: 0, borderRadius: '20px', fontSize: '12px', padding: '6px 12px' }}
          >
            {role.label}
            {badgeCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white',
                fontSize: '11px', fontWeight: 'bold', minWidth: '18px', height: '18px', padding: '0 5px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)', border: '2px solid var(--bg-container)'
              }}>
                {badgeCount}
              </span>
            )}
          </button>
        )})}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500' }}>
          <User size={14} color="var(--primary-color)" />
          <span>{currentUser.id}</span>
        </div>
        <button 
          onClick={logout} 
          className="btn" 
          style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }}
          title="Cerrar Sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
};

export default RoleSwitcher;
