import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, DollarSign, ListOrdered, CheckCircle2, Trash2, ArchiveRestore,
  Users, Check, X, LogOut, Settings, Beef, Calendar, ClipboardList, Package,
  Download, Smartphone, ChefHat, Clock, TrendingUp, TrendingDown, Target,
  Trophy, ArrowDownCircle, Plus, Receipt, Zap, AlertCircle, Megaphone,
} from 'lucide-react';
import OrderHistory from '../components/OrderHistory';

// ── Constantes de Unit Economics ────────────────────────────────────────────
const OPEX_DIARIO = 500; // Salario de 2 hermanos ($250 c/u)
const HOST_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
const API_BASE  = `${HOST_URL}/api`;

// ── Sub-componente: tarjeta de estadística genérica ─────────────────────────
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ background: 'var(--bg-container)', padding: '12px', borderRadius: '50%', color }}>
      <Icon size={24} />
    </div>
    <div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{title}</p>
      <h3 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{value}</h3>
    </div>
  </div>
);

// ── Sub-componente: modal para registrar egresos ─────────────────────────────
const OutflowModal = ({ onClose, onSubmit, submitting }) => {
  const [amount, setAmount]       = useState('');
  const [description, setDesc]    = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !description.trim()) return;
    onSubmit({ amount: parseFloat(amount), description: description.trim() });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <ArrowDownCircle size={22} color="#ef4444" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>Registrar Egreso</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Monto ($MXN)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '16px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Descripción
            </label>
            <input
              type="text"
              placeholder="ej. Aceite vegetal, Queso manchego…"
              value={description}
              onChange={e => setDesc(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '8px',
                background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '14px', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1, padding: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn"
              style={{ flex: 1, padding: '10px', border: 'none', background: '#ef4444', color: 'white', borderRadius: '8px', fontWeight: '700', opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Guardando…' : 'Registrar Egreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { orders, deleteOrder, restoreOrder, permanentlyDeleteOrder, updateOrderStatus } = useOrders();
  const { currentUser, pendingUsers, approveUser, rejectUser, logout } = useAuth();
  const { reports } = useInventory();
  const navigate   = useNavigate();

  // ── Estado de tabs y UI ──────────────────────────────────────────────────
  const [viewTab, setViewTab]           = useState('active');
  const [rejectReason, setRejectReason] = useState({});

  // ── Estado del módulo BI ─────────────────────────────────────────────────
  const [biStats,     setBiStats]     = useState(null);   // { orderCount, grossRevenue, aov, totalCogs }
  const [topProducts, setTopProducts] = useState([]);     // [{ productName, totalQty, grossRevenue, contributionMargin }]
  const [outflows,    setOutflows]    = useState([]);     // [{ id, amount, description, createdAt }]
  const [dailyOutflowTotal, setDailyOutflowTotal] = useState(0);
  const [biLoading,   setBiLoading]   = useState(false);

  // ── Estado del modal de egresos ──────────────────────────────────────────
  const [showOutflowModal, setShowOutflowModal] = useState(false);
  const [outflowSubmitting, setOutflowSubmitting] = useState(false);
  const [closingDay, setClosingDay] = useState(false);

  // ── Derived values para listas de órdenes ───────────────────────────────
  const activeOrders  = orders.filter(o => o.status !== 'TRASHED');
  const trashedOrders = orders.filter(o => o.status === 'TRASHED');
  const clientOrders  = orders.filter(o => o.source === 'CLIENT' && o.status !== 'TRASHED');

  const deliveredOrders = activeOrders.filter(o => o.status === 'DELIVERED');
  const totalSales      = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders     = activeOrders.length;
  const completedOrders = deliveredOrders.length;

  const burgersSold = deliveredOrders.reduce((count, order) => {
    const burgers = (order.items || []).filter(item =>
      ['mexa', 'bbq', 'hawaiana', 'clásica', 'clasica', 'burger'].some(k =>
        item.name?.toLowerCase().includes(k)
      )
    );
    return count + burgers.reduce((s, b) => s + (b.quantity || 1), 0);
  }, 0);

  // Trigger de re-fetch BI: cuando cambia la cantidad de órdenes entregadas
  const deliveredCount = useMemo(() => deliveredOrders.length, [deliveredOrders.length]);

  // ── Fetch de datos BI ────────────────────────────────────────────────────
  const fetchBIData = useCallback(async () => {
    setBiLoading(true);
    try {
      const [summaryRes, topRes, outflowsRes] = await Promise.all([
        fetch(`${API_BASE}/bi/summary`),
        fetch(`${API_BASE}/bi/top-products`),
        fetch(`${API_BASE}/cash-outflows/today`),
      ]);
      const [summary, top, outflowData] = await Promise.all([
        summaryRes.json(),
        topRes.json(),
        outflowsRes.json(),
      ]);
      setBiStats(summary);
      setTopProducts(Array.isArray(top) ? top : []);
      setOutflows(outflowData.outflows || []);
      setDailyOutflowTotal(outflowData.dailyTotal || 0);
    } catch (err) {
      console.error('[BI] Error fetching data:', err);
    } finally {
      setBiLoading(false);
    }
  }, []);

  // Re-fetch cuando el conteo de entregadas cambia
  useEffect(() => {
    fetchBIData();
  }, [deliveredCount]);

  // Re-fetch al entrar al tab BI
  useEffect(() => {
    if (viewTab === 'bi') fetchBIData();
  }, [viewTab]);

  // ── Cálculos de Free Cash Flow ───────────────────────────────────────────
  const grossRevenue  = biStats?.grossRevenue  || 0;
  const totalCogs     = biStats?.totalCogs     || 0;
  const aov           = biStats?.aov           || 0;
  const orderCount    = biStats?.orderCount    || 0;
  const grossProfit   = grossRevenue - totalCogs;
  const fcf           = grossProfit - OPEX_DIARIO - dailyOutflowTotal;
  const breakEvenPct  = Math.min((grossProfit / OPEX_DIARIO) * 100, 100);
  const breakEvenGap  = Math.max(OPEX_DIARIO - grossProfit, 0);

  // ── AI Advisor & Predictions ─────────────────────────────────────────────
  const marginPerBurger = (grossProfit > 0 && burgersSold > 0) ? (grossProfit / burgersSold) : 45;
  const burgersNeededToBreakEven = Math.ceil(breakEvenGap / marginPerBurger);

  const getAdvisorMessage = () => {
    if (breakEvenGap > 0) {
      return {
        title: "¡Modo Supervivencia! 🚨",
        desc: `Faltan vender aprox. ${burgersNeededToBreakEven} hamburguesas para cubrir tu sueldo y el de tu hermano ($500).`,
        action: "Sugerencia: Haz un push en grupos de WhatsApp de la zona ofreciendo 'Envío gratis en la próxima hora'."
      }
    } else {
      return {
        title: "¡Zona de Ganancias Neta! 💸",
        desc: `¡Cada hamburguesa extra suma ~$${marginPerBurger.toFixed(2)} directos a la ganancia de la empresa!`,
        action: "Sugerencia: Ofrece papas especiales a $35 en la compra de cualquier hamburguesa para inflar rápido el ticket promedio."
      }
    }
  };
  const advisor = getAdvisorMessage();

  const breakEvenColor =
    breakEvenPct >= 100 ? '#10b981' :
    breakEvenPct >= 50  ? '#f59e0b' : '#ef4444';

  // ── Handler: registrar egreso ────────────────────────────────────────────
  const handleOutflowSubmit = async ({ amount, description }) => {
    setOutflowSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/cash-outflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description, recordedBy: currentUser?.id }),
      });
      if (res.ok) {
        setShowOutflowModal(false);
        await fetchBIData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al registrar egreso.');
      }
    } catch (e) {
      console.error('[Outflow] Error:', e);
    } finally {
      setOutflowSubmitting(false);
    }
  };

  // ── Handler: cerrar día y reiniciar ──────────────────────────────────────
  const handleCloseDay = async () => {
    if (!window.confirm("⚠️ ADVERTENCIA: ¿Estás seguro de que deseas VACIAR y REINICIAR todas las cuentas actuales? Esta acción descargará un respaldo a tu computadora y borrará las órdenes del sistema para empezar de cero.")) {
      return;
    }
    setClosingDay(true);
    try {
      const res = await fetch(`${API_BASE}/reports/close-day`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.exportData) {
        // Trigger file download
        const blob = new Blob([JSON.stringify(data.exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName || 'cuentas_cierre.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert("✅ " + data.message + "\\n\\nArchivo guardado: " + data.fileName);
        
        // Wait briefly for download to start, then reload
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert("❌ Error: " + (data.error || "Fallo desconocido al intentar generar el archivo."));
      }
    } catch (e) {
      console.error('[CloseDay] Error:', e);
      alert("❌ Ocurrió un error de red al intentar el cierre.");
    } finally {
      // If we are reloading, the component will unmount anyway, but we set it false just in case
      setClosingDay(false);
    }
  };

  // ── Handlers de órdenes ──────────────────────────────────────────────────
  const handleDelete = (orderId) => {
    if (window.confirm(`¿Mover la orden #${orderId} a la papelera?`)) deleteOrder(orderId);
  };
  const handleRestore = (orderId) => {
    if (window.confirm(`¿Restaurar la orden #${orderId} a pendientes?`)) restoreOrder(orderId);
  };
  const handlePermanentDelete = (orderId) => {
    if (window.confirm(`¿ELIMINAR PERMANENTEMENTE la orden #${orderId}? Esta acción no se puede deshacer.`)) {
      permanentlyDeleteOrder(orderId);
    }
  };
  const handleDownloadJSON = (report) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Inventario_${new Date(report.createdAt).toLocaleDateString('es-MX').replace(/\//g, '-')}_${report.cookName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Constante de fecha ───────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Colores de estado de órdenes B2C ────────────────────────────────────
  const statusColors = {
    PENDING:   { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: 'Esperando' },
    ACCEPTED:  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Aceptado'  },
    COOKING:   { bg: 'rgba(249,115,22,0.15)',  color: '#f97316', label: 'Cocinando' },
    READY:     { bg: 'rgba(99,102,241,0.15)',  color: '#6366f1', label: 'Listo'     },
    DELIVERED: { bg: 'rgba(16,185,129,0.1)',   color: '#10b981', label: 'Entregado' },
    REJECTED:  { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444', label: 'Rechazado' },
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '40px' }}>

      {/* ── Header ── */}
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
            {currentUser?.role === 'admin' && (
              <button onClick={handleCloseDay} disabled={closingDay} className="btn" style={{ padding: '8px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '50%', opacity: closingDay ? 0.5 : 1 }} title="Cerrar Día y Reiniciar Cuentas">
                {closingDay ? <Clock size={16} /> : <ArchiveRestore size={16} />}
              </button>
            )}
            <button onClick={() => navigate('/admin/inventory-bom')} className="btn" style={{ padding: '8px', border: 'none', background: 'var(--bg-container)', color: 'var(--text-main)', borderRadius: '50%' }} title="Inventario BOM">
              <Beef size={16} />
            </button>
            <button onClick={() => navigate('/admin/users')} className="btn" style={{ padding: '8px', border: 'none', background: 'var(--bg-container)', color: 'var(--text-main)', borderRadius: '50%' }} title="Administrar Perfiles">
              <Settings size={16} />
            </button>
            <button onClick={logout} className="btn" style={{ padding: '8px', border: 'none', background: 'var(--bg-container)', color: 'var(--primary-color)', borderRadius: '50%' }} title="Cerrar Sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Usuarios pendientes de aprobación ── */}
      {currentUser?.role === 'admin' && pendingUsers.length > 0 && (
        <div style={{ marginBottom: '32px', background: 'var(--bg-container)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={20} color="var(--primary-color)" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Usuarios Pendientes ({pendingUsers.length})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingUsers.map(user => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontWeight: '600' }}>{user.id}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px', background: 'var(--bg-container)', padding: '2px 6px', borderRadius: '4px' }}>Esperando…</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn" onClick={() => approveUser(user.id)} style={{ padding: '6px 12px', border: 'none', background: 'var(--success-bg)', color: 'var(--success-color)', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Aprobar
                  </button>
                  <button className="btn" onClick={() => rejectUser(user.id)} style={{ padding: '6px 12px', border: 'none', background: 'var(--focus-ring)', color: 'var(--primary-color)', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={14} /> Denegar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Barra de Tabs ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'flex', background: 'var(--bg-container)', borderRadius: 'var(--border-radius-md)', padding: '4px', gap: '2px', flexWrap: 'wrap' }}>
          {[
            { key: 'bi',            icon: <Zap size={14} />,          label: 'BI',             activeColor: '#a78bfa' },
            { key: 'active',        icon: <ListOrdered size={14} />,  label: 'Activas',        activeColor: null      },
            { key: 'history',       icon: <ClipboardList size={14} />,label: 'Historial',      activeColor: null      },
            { key: 'inventory',     icon: <Package size={14} />,      label: 'Inventarios',    activeColor: null      },
            { key: 'client_orders', icon: <Smartphone size={14} />,   label: 'Online',         activeColor: '#f97316', badge: clientOrders.filter(o => o.status === 'PENDING').length },
            { key: 'marketing',     icon: <Megaphone size={14} />,    label: 'Marketing (Prompts)', activeColor: '#ec4899' },
            { key: 'trash',         icon: <Trash2 size={14} />,       label: `Papelera (${trashedOrders.length})`, activeColor: null },
          ].map(({ key, icon, label, activeColor, badge }) => (
            <button
              key={key}
              className="btn"
              onClick={() => setViewTab(key)}
              style={{
                background: viewTab === key ? 'var(--bg-color)' : 'transparent',
                boxShadow: viewTab === key ? 'var(--shadow-sm)' : 'none',
                border: 'none',
                fontSize: '12px',
                padding: '6px 12px',
                color: viewTab === key && activeColor ? activeColor : viewTab === key ? 'var(--primary-color)' : 'inherit',
                display: 'flex', alignItems: 'center', gap: '6px',
                position: 'relative',
              }}
            >
              {icon}{label}
              {badge > 0 && (
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', position: 'absolute', top: '-4px', right: '-4px' }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: BI — Terminal de Business Intelligence                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'bi' && (
        <div>
          {biLoading && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Zap size={28} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <p style={{ margin: 0 }}>Calculando métricas del turno…</p>
            </div>
          )}

          {!biLoading && (
            <>
              {/* ── Fila 1: Free Cash Flow + AOV ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>

                {/* Free Cash Flow */}
                <div className="card" style={{ border: `1px solid ${fcf >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Free Cash Flow</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Utilidad Neta del Turno</p>
                    </div>
                    {fcf >= 0
                      ? <TrendingUp size={22} color="#10b981" />
                      : <TrendingDown size={22} color="#ef4444" />
                    }
                  </div>
                  <p style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 14px', color: fcf >= 0 ? '#10b981' : '#ef4444' }}>
                    {fcf >= 0 ? '+' : ''}{fcf.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { label: 'Ventas', value: grossRevenue, color: '#10b981' },
                      { label: 'COGS',   value: -totalCogs,   color: '#f59e0b' },
                      { label: 'OPEX',   value: -OPEX_DIARIO, color: '#6366f1' },
                      { label: 'Egresos',value: -dailyOutflowTotal, color: '#ef4444' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label} </span>
                        <span style={{ color, fontWeight: '700' }}>
                          {value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AOV */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>AOV</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Average Order Value</p>
                    </div>
                    <Receipt size={22} color="var(--primary-color)" />
                  </div>
                  <p style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 14px', color: 'var(--text-main)' }}>
                    {aov.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Órdenes entregadas </span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{orderCount}</span>
                    </div>
                    <div style={{ background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ventas brutas </span>
                      <span style={{ color: '#10b981', fontWeight: '700' }}>
                        {grossRevenue.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Fila 2: Break-Even Tracker & AI Advisor ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="card" style={{ border: `1px solid ${breakEvenColor}33`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Target size={18} color={breakEvenColor} />
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>Break-Even Tracker</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>— Sueldos de Paul y su hermano</span>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: breakEvenColor }}>
                      {breakEvenPct.toFixed(1)}%
                    </span>
                  </div>

                  <div style={{ height: '10px', background: 'var(--bg-color)', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ height: '100%', width: `${breakEvenPct}%`, background: breakEvenPct >= 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : breakEvenPct >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    <span>Utilidad bruta: <strong style={{ color: 'var(--text-main)' }}>{grossProfit.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</strong> / ${OPEX_DIARIO.toLocaleString('es-MX')}</span>
                    <span style={{ color: breakEvenColor, fontWeight: '700' }}>{breakEvenPct >= 100 ? '✓ Día salvado' : `Faltan ${breakEvenGap.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`}</span>
                  </div>
                  
                  {breakEvenGap > 0 && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🍔</span>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        Necesitamos vender aprox. <strong>{burgersNeededToBreakEven} hamburguesas</strong> más para salir tablas hoy.
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Business Advisor (Wow Feature) */}
                <div className="card" style={{ background: 'linear-gradient(145deg, var(--bg-container) 0%, rgba(99, 102, 241, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '18px' }}>🤖</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Asesor de Negocio Cheesy
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: 'var(--text-main)' }}>{advisor.title}</h4>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>{advisor.desc}</p>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', borderLeft: '3px solid #6366f1', padding: '10px 14px', borderRadius: '4px 8px 8px 4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-main)' }}>
                    ✨ {advisor.action}
                  </div>
                </div>
              </div>

              {/* ── Fila 3: Top Performers + Cash Outflows ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

                {/* Top Performers */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Trophy size={18} color="#f59e0b" />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Top Performers del Turno</span>
                  </div>

                  {topProducts.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Sin datos de ventas aún.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {topProducts.map((p, i) => (
                        <div key={p.productName} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-color)', borderRadius: '8px' }}>
                          <span style={{
                            width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: '800',
                            background: i === 0 ? 'rgba(251,191,36,0.2)' : i === 1 ? 'rgba(156,163,175,0.2)' : 'rgba(180,120,60,0.2)',
                            color:      i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#b4783c',
                            flexShrink: 0,
                          }}>
                            {i + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.productName}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                              {p.totalQty} unid. · Ingresos {p.grossRevenue.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#10b981' }}>
                              +{p.contributionMargin.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                            </p>
                            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>margen</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cash Outflows */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ArrowDownCircle size={18} color="#ef4444" />
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>Egresos del Turno</span>
                    </div>
                    <button
                      className="btn"
                      onClick={() => setShowOutflowModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}
                    >
                      <Plus size={13} /> Agregar
                    </button>
                  </div>

                  {outflows.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Sin egresos registrados hoy.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                      {outflows.map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-color)', borderRadius: '6px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description}</p>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(o.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              {o.recordedBy && <span> · {o.recordedBy}</span>}
                            </p>
                          </div>
                          <span style={{ fontWeight: '700', color: '#ef4444', marginLeft: '12px', flexShrink: 0, fontSize: '13px' }}>
                            -{o.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {outflows.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total egresos</span>
                      <span style={{ fontWeight: '800', color: '#ef4444' }}>
                        -{dailyOutflowTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Órdenes Activas                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'active' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <StatCard title="Ventas del Día"    value={`$${totalSales.toFixed(2)}`} icon={DollarSign}  color="var(--success-color)" />
            <StatCard title="Órdenes Totales"   value={totalOrders}                 icon={ListOrdered} color="var(--primary-color)" />
            <StatCard title="Completadas"        value={completedOrders}             icon={CheckCircle2} color="var(--text-main)" />
            <StatCard title="Burgers Vendidas"  value={burgersSold}                 icon={Beef}        color="#f97316" />
          </div>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Órdenes Recientes</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {activeOrders.map((order, idx) => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: idx !== activeOrders.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div>
                  <span style={{ fontWeight: '600' }}>#{order.id}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px' }}>{order.customerName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-container)' }}>{order.status}</span>
                  <span style={{ fontWeight: '600', minWidth: '60px', textAlign: 'right' }}>${(parseFloat(order.total) || 0).toFixed(2)}</span>
                  <button className="btn" onClick={() => handleDelete(order.id)} title="Mover a papelera" style={{ padding: '12px', border: 'none', background: 'var(--focus-ring)', color: 'var(--primary-color)', marginLeft: '8px', borderRadius: 'var(--border-radius-md)' }}>
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
            {activeOrders.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay órdenes activas.</div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Papelera                                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'trash' && (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Papelera de Reciclaje</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {trashedOrders.map((order, idx) => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: idx !== trashedOrders.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div>
                  <span style={{ fontWeight: '600', textDecoration: 'line-through' }}>#{order.id}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px' }}>{order.customerName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: '600', opacity: 0.5 }}>${(parseFloat(order.total) || 0).toFixed(2)}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn" onClick={() => handleRestore(order.id)} title="Restaurar" style={{ padding: '12px', border: 'none', background: 'var(--success-bg)', color: 'var(--success-color)', borderRadius: 'var(--border-radius-md)' }}>
                      <ArchiveRestore size={20} />
                    </button>
                    <button className="btn" onClick={() => handlePermanentDelete(order.id)} title="Eliminar definitivamente" style={{ padding: '12px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 'var(--border-radius-md)' }}>
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {trashedOrders.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>La papelera está vacía.</div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Historial                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'history' && <OrderHistory />}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Pedidos Online (B2C)                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'client_orders' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Smartphone size={20} color="#f97316" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Pedidos del Portal Cliente ({clientOrders.length})</h2>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {clientOrders.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Smartphone size={36} opacity={0.3} />
                No hay pedidos de clientes en este momento.
              </div>
            )}
            {clientOrders.map((order, idx) => {
              const sc = statusColors[order.status] || statusColors.PENDING;
              return (
                <div key={order.id} style={{ padding: '20px', borderBottom: idx !== clientOrders.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>#{order.id}</span>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        👤 <strong style={{ color: 'var(--text-main)' }}>{order.customerName}</strong>
                      </div>
                      {order.items?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {order.items.map((item, i) => (
                            <span key={i} style={{ background: 'var(--bg-container)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                              {item.quantity}× {item.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '800', fontSize: '16px', color: '#f97316' }}>${parseFloat(order.total || 0).toFixed(2)}</span>
                      {order.status === 'PENDING' && (
                        <>
                          <button className="btn" onClick={() => updateOrderStatus(order.id, 'ACCEPTED', currentUser?.id)} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> Aceptar
                          </button>
                          <button className="btn" onClick={() => updateOrderStatus(order.id, 'REJECTED', currentUser?.id)} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <X size={14} /> Rechazar
                          </button>
                        </>
                      )}
                      {order.status === 'ACCEPTED' && (
                        <button className="btn" onClick={() => updateOrderStatus(order.id, 'COOKING', currentUser?.id)} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'rgba(249,115,22,0.15)', color: '#f97316', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ChefHat size={14} /> Marcar Cocinando
                        </button>
                      )}
                      {order.status === 'COOKING' && (
                        <button className="btn" onClick={() => updateOrderStatus(order.id, 'READY', currentUser?.id)} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} /> Marcar Listo
                        </button>
                      )}
                      {order.status === 'READY' && (
                        <button className="btn" onClick={() => updateOrderStatus(order.id, 'DELIVERED', currentUser?.id)} style={{ padding: '8px 14px', border: 'none', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> Marcar Entregado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Marketing (Prompts)                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'marketing' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Megaphone size={20} color="#ec4899" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Prompts Publicitarios Diarios</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            Copia y pega estos prompts en ChatGPT o Claude para generar el contenido de hoy para tus redes sociales.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {(() => {
              const promptsInfo = [
                { title: 'Post Instagram (Antojo)', text: 'Escribe un post de Instagram (con emojis) promocionando nuestra Cheesy Burger clásica, resaltando que la carne es 100% de res y el queso se derrite en cada mordida. Tono divertido y antojable.' },
                { title: 'Guion TikTok / Reel', text: 'Crea un guion para un Reel de 15 segundos donde mostramos cómo preparamos nuestra hamburguesa BBQ. El tono debe ser enérgico y terminar con una llamada a la acción para pedir a domicilio.' },
                { title: 'Mensaje WhatsApp', text: 'Redacta un mensaje de WhatsApp para enviar a nuestros clientes frecuentes. Ofréceles un combo especial de Hamburguesa Hawaiana + Papas usando urgencia (solo válido por hoy). Tono cercano y amigable.' },
                { title: 'Promo Fin de Semana', text: 'Escribe un caption para Facebook dirigido a familias, promocionando nuestro Combo Mexa para el fin de semana. Resalta que es la opción ideal para no cocinar el domingo.' },
                { title: 'Story Interactivo', text: 'Diseña un Story interactivo de Instagram (texto e ideas de encuestas) para hacer que los seguidores voten entre la Clásica o la BBQ. Tono competitivo y dinámico para aumentar engagement.' },
                { title: 'Lanzamiento Secreto', text: 'Redacta un email corto y misterioso para nuestros clientes VIP anunciando que la próxima semana tendremos un nuevo aderezo secreto para las hamburguesas. Tono de exclusividad.' },
              ];
              // Elegir 3 basados en el día para variar diariamente
              const day = new Date().getDate();
              const startIdx = (day % 2) * 3;
              const todaysPrompts = promptsInfo.slice(startIdx, startIdx + 3);

              return todaysPrompts.map((p, i) => (
                <div key={i} className="card" style={{ borderTop: '4px solid #ec4899', position: 'relative' }}>
                  <h3 style={{ fontSize: '15px', marginTop: 0, marginBottom: '8px', color: '#ec4899' }}>{p.title}</h3>
                  <textarea 
                    readOnly 
                    value={p.text} 
                    style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', background: 'var(--bg-container)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button 
                      className="btn" 
                      onClick={() => { navigator.clipboard.writeText(p.text); alert('Prompt copiado al portapapeles'); }}
                      style={{ padding: '6px 14px', background: 'rgba(236,72,153,0.15)', color: '#ec4899', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                      Copiar Prompt
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Inventarios                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {viewTab === 'inventory' && (
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Reportes de Inventario Recibidos</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {reports.map((r, idx) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: idx !== reports.length - 1 ? '1px solid var(--border-color)' : 'none', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} color="var(--primary-color)" />
                    Reporte de Faltantes (#{r.id})
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Por: <strong style={{ color: 'var(--text-main)' }}>{r.cookName}</strong> · {new Date(r.createdAt).toLocaleString('es-MX')}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {r.missingItems.map(item => (
                      <span key={item} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{item}</span>
                    ))}
                    {r.missingItems.length === 0 && <span style={{ color: 'var(--success-color)', fontSize: '12px', fontWeight: 'bold' }}>✓ Sin faltantes.</span>}
                  </div>
                </div>
                <button className="btn" onClick={() => handleDownloadJSON(r)} style={{ padding: '10px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                  <Download size={16} /> Descargar JSON
                </button>
              </div>
            ))}
            {reports.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Package size={32} opacity={0.5} />
                No hay reportes de inventario recibidos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de Egresos ── */}
      {showOutflowModal && (
        <OutflowModal
          onClose={() => setShowOutflowModal(false)}
          onSubmit={handleOutflowSubmit}
          submitting={outflowSubmitting}
        />
      )}

    </div>
  );
};

export default AdminDashboard;
