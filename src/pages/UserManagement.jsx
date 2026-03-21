import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, ArrowLeft, Pencil, Trash2, UserPlus, Search,
  Shield, ChevronDown, X, Check, AlertCircle,
} from 'lucide-react';

// ─── Catálogo de roles ────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin',      label: 'Admin',      tw: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' },
  { value: 'marketer',   label: 'Marketer',   tw: 'bg-blue-500/20   text-blue-300   border border-blue-500/30'   },
  { value: 'parillero',  label: 'Parrillero', tw: 'bg-amber-500/20  text-amber-300  border border-amber-500/30'  },
  { value: 'repartidor', label: 'Repartidor', tw: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  { value: 'ayudante',   label: 'Ayudante',   tw: 'bg-zinc-500/20   text-zinc-400   border border-zinc-500/30'   },
];

const getRoleMeta = (val) => ROLES.find(r => r.value === val) ?? { label: val, tw: 'bg-zinc-500/20 text-zinc-400 border border-zinc-600/30' };

// ─── Avatar con iniciales ─────────────────────────────────────────────────────
const AVATAR_BG = [
  'bg-violet-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-amber-600',  'bg-rose-600', 'bg-cyan-600',
];
const Avatar = ({ name }) => {
  const color = AVATAR_BG[(name?.charCodeAt(0) ?? 0) % AVATAR_BG.length];
  const initials = name?.slice(0, 2).toUpperCase() ?? '??';
  return (
    <div className={`${color} flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0`}
      style={{ width: 36, height: 36 }}>
      {initials}
    </div>
  );
};

// ─── MultiRoleSelect con Portal (fix Sebastian bug) ───────────────────────────
const MultiRoleSelect = ({ value, onChange }) => {
  const current  = value ? value.split(',').filter(Boolean) : ['ayudante'];
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [rect, setRect] = useState(null);

  const openDropdown = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  };

  // Cierra al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!clickedTrigger && !clickedDropdown) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (val) => {
    const next = current.includes(val)
      ? current.filter(r => r !== val)
      : [...current, val];
    onChange((next.length ? next : ['ayudante']).join(','));
  };

  const label = current.length === ROLES.length
    ? 'Todos los roles'
    : current.map(v => getRoleMeta(v).label).join(', ');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition-colors w-full"
      >
        <Shield size={13} className="text-zinc-400 shrink-0" />
        <span className="truncate flex-1 text-left text-xs">{label}</span>
        <ChevronDown size={13} className="text-zinc-400 shrink-0" />
      </button>

      {/* Portal: el dropdown siempre flota sobre el DOM, nunca clippeado */}
      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 z-[9999]"
          style={{
            position:  'fixed',
            top:       rect.bottom + 6,
            left:      rect.left,
            width:     Math.max(rect.width, 200),
            zIndex:    9999,
          }}
        >
          {ROLES.map(role => {
            const checked = current.includes(role.value);
            return (
              <button
                key={role.value}
                type="button"
                onClick={() => toggle(role.value)}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-zinc-800 transition-colors"
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${checked ? 'bg-violet-600 border-violet-600' : 'border-zinc-600 bg-transparent'}`}>
                  {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${role.tw}`}>{role.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Modal base (portal) ──────────────────────────────────────────────────────
const Modal = ({ onClose, children }) => createPortal(
  <div
    className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md"
      style={{ animation: 'slideUp 0.18s ease' }}
    >
      {children}
    </div>
  </div>,
  document.body
);

// ─── Modal de edición ─────────────────────────────────────────────────────────
const EditModal = ({ user, onSave, onClose }) => {
  const [roleString, setRoleString] = useState(user.role || 'ayudante');

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar name={user.id} />
            <div>
              <p className="font-bold text-white text-sm">{user.id}</p>
              <p className="text-zinc-500 text-xs">Editar perfil</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Roles asignados</label>
          <MultiRoleSelect value={roleString} onChange={setRoleString} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(roleString)}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal de nuevo integrante ────────────────────────────────────────────────
const AddMemberModal = ({ onClose, onCreate }) => {
  const [userId,     setUserId]     = useState('');
  const [roleString, setRoleString] = useState('ayudante');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const HOST_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
  const API_URL  = `${HOST_URL}/api`;

  const handleCreate = async () => {
    const uid = userId.trim().toUpperCase();
    if (!uid) { setError('El ID de usuario es obligatorio.'); return; }
    setLoading(true);
    setError('');
    try {
      // 1. Crear usuario (POST login con master password lo registra como PENDING)
      const res1 = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, password: 'Cheesy12345' }),
      });
      const data1 = await res1.json();
      if (res1.status !== 201 && !data1.user) {
        setError(data1.message || 'No se pudo crear el usuario.');
        setLoading(false);
        return;
      }

      // 2. Activar + asignar rol
      await fetch(`${API_URL}/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE', role: roleString }),
      });

      onCreate();
      onClose();
    } catch (e) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600/20 border border-violet-500/30 p-2 rounded-xl">
              <UserPlus size={18} className="text-violet-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Nuevo Integrante</p>
              <p className="text-zinc-500 text-xs">Crear y activar cuenta inmediatamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">ID de Usuario</label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value.toUpperCase())}
              placeholder="ej. CARLOS, MARIA01…"
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Rol inicial</label>
            <MultiRoleSelect value={roleString} onChange={setRoleString} />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creando…' : 'Crear Integrante'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const UserManagement = () => {
  const { activeUsers, updateUserRole, rejectUser, currentUser, fetchUsers } = useAuth();
  const navigate = useNavigate();

  const [search,    setSearch]    = useState('');
  const [editing,   setEditing]   = useState(null); // user object
  const [showAdd,   setShowAdd]   = useState(false);

  // Filtro de búsqueda
  const filtered = (activeUsers ?? []).filter(u =>
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveRole = (userId, newRole) => {
    updateUserRole(userId, newRole);
    setEditing(null);
  };

  const handleDelete = (userId) => {
    const pwd = window.prompt(`Contraseña SUPERADMIN para eliminar a: ${userId}`);
    if (pwd === '12345') {
      rejectUser(userId);
    } else if (pwd !== null) {
      alert('Contraseña incorrecta.');
    }
  };

  // Protección doble de acceso
  const userRoles = currentUser?.role?.split(',') ?? [];
  if (!userRoles.includes('admin')) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-16 text-zinc-500">
        <Shield size={36} className="opacity-30" />
        <p className="text-sm">Acceso denegado.</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm hover:bg-zinc-700 transition-colors">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <Users size={24} className="text-violet-400" />
            <h1 className="text-xl font-bold text-white">Administrar Perfiles</h1>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-900/30"
        >
          <UserPlus size={15} />
          Añadir Integrante
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por ID de usuario…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              <th className="px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Usuario</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Estado</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest">Roles</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-zinc-600 text-sm">
                  {search ? `Sin resultados para "${search}".` : 'No hay usuarios activos registrados.'}
                </td>
              </tr>
            ) : filtered.map((user, idx) => {
              const roles = user.role ? user.role.split(',').filter(Boolean) : ['ayudante'];
              const isLast = idx === filtered.length - 1;
              return (
                <tr
                  key={user.id}
                  className={`bg-zinc-950 hover:bg-zinc-900 transition-colors ${!isLast ? 'border-b border-zinc-800/60' : ''}`}
                >
                  {/* Usuario */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.id} />
                      <div>
                        <p className="font-semibold text-white text-sm">{user.id}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Personal del POS</p>
                      </div>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Activo
                    </span>
                  </td>

                  {/* Roles */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map(r => {
                        const meta = getRoleMeta(r);
                        return (
                          <span key={r} className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${meta.tw}`}>
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing(user)}
                        title="Editar roles"
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        title="Eliminar cuenta"
                        className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer con conteo */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
            {filtered.length} {filtered.length === 1 ? 'integrante' : 'integrantes'}
            {search && ` · filtrando por "${search}"`}
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {editing && (
        <EditModal
          user={editing}
          onSave={(newRole) => handleSaveRole(editing.id, newRole)}
          onClose={() => setEditing(null)}
        />
      )}

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onCreate={() => {
            // AuthContext re-fetches al detectar cambio en usersDB;
            // si tiene fetchUsers expuesto lo llamamos, si no el socket/polling se encarga
            if (typeof fetchUsers === 'function') fetchUsers();
          }}
        />
      )}

      {/* Animación de entrada para modales */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
