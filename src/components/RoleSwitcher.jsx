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

  const userRoles = currentUser.role ? currentUser.role.split(',') : [];
  const visibleRoles = roles.filter(r => r.allowed.some(allowed => userRoles.includes(allowed)) || userRoles.includes('admin'));

  const pendingKitchen = orders.filter(o => o.status === 'PENDING').length;
  const readyDelivery = orders.filter(o => o.status === 'READY').length;

  const getBadgeCount = (path) => {
    if (path === '/kitchen') return pendingKitchen;
    if (path === '/delivery') return readyDelivery;
    return 0;
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      background: 'var(--paper)',
      borderBottom: '1px solid var(--rule)',
    }}>
      {/* Tab pills */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        flex: 1,
      }}>
        {visibleRoles.map(role => {
          const isActive = location.pathname === role.path;
          const badgeCount = getBadgeCount(role.path);
          return (
            <button
              key={role.path}
              onClick={() => navigate(role.path)}
              style={{
                position: 'relative',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                border: isActive ? '1px solid var(--mustard-deep)' : '1px solid var(--rule)',
                background: isActive ? 'var(--mustard)' : 'var(--ticket)',
                color: isActive ? 'var(--ticket)' : 'var(--ink-soft)',
                boxShadow: isActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {role.label}
              {badgeCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: 'var(--tomato)',
                  color: 'var(--ticket)',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9px',
                  boxShadow: '0 2px 4px rgba(193,53,37,0.3)',
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User info + logout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginLeft: '16px',
        paddingLeft: '16px',
        borderLeft: '1px solid var(--rule)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink-soft)',
        }}>
          <User size={14} color="var(--mustard)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{currentUser.id}</span>
        </div>
        <button
          onClick={logout}
          title="Cerrar Sesión"
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-faint)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 'var(--radius-md)',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--tomato)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-faint)'}
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
};

export default RoleSwitcher;
