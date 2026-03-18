import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, ArrowLeft, Shield, Trash2 } from 'lucide-react';

const ROLES = [
  { value: 'parillero', label: 'Parrillero (Cocina)' },
  { value: 'ayudante', label: 'Ayudante (Caja)' },
  { value: 'repartidor', label: 'Repartidor' },
  { value: 'marketer', label: 'Marketer' },
  { value: 'admin', label: 'Administrador' }
];

const UserManagement = () => {
  const { activeUsers, updateUserRole, currentUser, rejectUser } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (userId, e) => {
    updateUserRole(userId, e.target.value);
  };

  const handleDeleteUser = (userId) => {
    const pwd = window.prompt(`Ingresa la contraseña del SUPERADMIN para eliminar permanentemente a: ${userId}`);
    if (pwd === '12345') {
       rejectUser(userId);
    } else if (pwd !== null) {
       alert("Contraseña de administrador incorrecta.");
    }
  };

  // Si no es admin, no debería estar aquí (protección doble)
  if (currentUser?.role !== 'admin') {
     return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
           <h2>Acceso Denegado</h2>
           <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '16px' }}>Volver</button>
        </div>
     );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/admin')} 
          className="btn" 
          style={{ padding: '8px', background: 'var(--bg-container)', border: 'none', borderRadius: '50%', display: 'flex' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={28} color="var(--primary-color)" />
          <h1 style={{ fontSize: '24px', margin: 0 }}>Administrar Perfiles</h1>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activeUsers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
             No hay usuarios activos registrados (excepto el SuperAdmin).
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-container)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px', fontWeight: '600', fontSize: '14px', color: 'var(--text-muted)' }}>USUARIO (ID)</th>
                <th style={{ padding: '16px', fontWeight: '600', fontSize: '14px', color: 'var(--text-muted)' }}>ESTADO</th>
                <th style={{ padding: '16px', fontWeight: '600', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>ACCIONES Y PERFIL</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user, idx) => (
                <tr key={user.id} style={{ borderBottom: idx !== activeUsers.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <td style={{ padding: '16px', fontWeight: '600' }}>{user.id}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontSize: '12px', background: 'var(--success-bg)', color: 'var(--success-color)', padding: '4px 8px', borderRadius: '4px' }}>
                      Activo
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                      <Shield size={16} color="var(--primary-color)" />
                      <select 
                        value={user.role === 'staff' ? 'ayudante' : (user.role || 'ayudante')} 
                        onChange={(e) => handleRoleChange(user.id, e)}
                        className="input-field"
                        style={{ padding: '8px 12px', width: '200px', fontSize: '14px', cursor: 'pointer' }}
                      >
                        {ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>

                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn" 
                        style={{ padding: '8px', border: 'none', background: 'var(--focus-ring)', color: 'var(--primary-color)', borderRadius: '8px' }}
                        title="Eliminar Cuenta"
                      >
                         <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
