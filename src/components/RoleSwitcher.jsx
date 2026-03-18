import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

const RoleSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const roles = [
    { path: '/pos', label: 'Caja', allowed: ['ayudante', 'admin'] },
    { path: '/kitchen', label: 'Cocina', allowed: ['parillero', 'admin'] },
    { path: '/delivery', label: 'Repartidor', allowed: ['repartidor', 'admin'] },
    { path: '/admin', label: 'Admin', allowed: ['marketer', 'admin'] }
  ];

  if (!currentUser) return null;

  const visibleRoles = roles.filter(r => r.allowed.includes(currentUser.role) || currentUser.role === 'admin');

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
        {visibleRoles.map(role => (
          <button
            key={role.path}
            className={`btn ${location.pathname === role.path ? 'btn-primary' : ''}`}
            onClick={() => navigate(role.path)}
            style={{ whiteSpace: 'nowrap', flexShrink: 0, borderRadius: '20px', fontSize: '12px', padding: '6px 12px' }}
          >
            {role.label}
          </button>
        ))}
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
