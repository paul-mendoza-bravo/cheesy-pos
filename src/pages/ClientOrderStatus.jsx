import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { io } from 'socket.io-client';
import { CheckCircle, Clock, ChefHat, Bike, Star, X, RotateCcw } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const STATUS_CONFIG = {
  PENDING:   { label: 'Esperando confirmación', icon: Clock,        color: '#f59e0b', step: 0 },
  ACCEPTED:  { label: 'Pedido aceptado',         icon: CheckCircle,  color: '#10b981', step: 1 },
  COOKING:   { label: 'En preparación',           icon: ChefHat,      color: '#f97316', step: 2 },
  READY:     { label: 'Listo para entrega',       icon: Star,         color: '#6366f1', step: 3 },
  DELIVERED: { label: '¡Entregado! Buen provecho',icon: Star,         color: '#10b981', step: 4 },
  REJECTED:  { label: 'Pedido no disponible',     icon: X,            color: '#ef4444', step: -1 },
};

const STEPS = ['PENDING', 'ACCEPTED', 'COOKING', 'READY', 'DELIVERED'];

const ClientOrderStatus = () => {
  const { orderId } = useParams();
  const { customer, token, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [status, setStatus] = useState('PENDING');
  const [rejectionReason, setRejectionReason] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!customer || !token) { navigate('/client/login'); return; }

    // Cargar estado actual desde la API
    fetch(`${BACKEND_URL}/api/client/orders/${orderId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (data.status) setStatus(data.status); })
      .catch(() => {});

    // Conectar Socket.io y unirse al room privado del cliente
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_customer_room', { token });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('order_accepted',  ({ orderId: id, estimatedMinutes: mins }) => {
      if (id === orderId) { setStatus('ACCEPTED'); setEstimatedMinutes(mins); }
    });
    socket.on('order_rejected',  ({ orderId: id, reason }) => {
      if (id === orderId) { setStatus('REJECTED'); setRejectionReason(reason); }
    });
    socket.on('order_cooking',   ({ orderId: id }) => { if (id === orderId) setStatus('COOKING'); });
    socket.on('order_ready',     ({ orderId: id }) => { if (id === orderId) setStatus('READY'); });
    socket.on('order_delivered', ({ orderId: id }) => { if (id === orderId) setStatus('DELIVERED'); });

    return () => socket.disconnect();
  }, [orderId, token]);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  const currentStep = config.step;
  const isRejected = status === 'REJECTED';
  const isDelivered = status === 'DELIVERED';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', fontFamily: "'Inter', sans-serif", color: 'white', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🧀</span>
          <span style={{ fontWeight: '800', fontSize: '18px' }}>Cheesy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', animation: connected ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{connected ? 'En vivo' : 'Reconectando...'}</span>
        </div>
      </div>

      {/* Main Status Card */}
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
          border: `1px solid ${config.color}40`, borderRadius: '24px', padding: '36px 28px',
          textAlign: 'center', boxShadow: `0 20px 60px ${config.color}20`, marginBottom: '24px'
        }}>
          <div style={{
            width: '88px', height: '88px', borderRadius: '50%',
            background: `${config.color}20`, border: `3px solid ${config.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            animation: !isRejected && !isDelivered ? 'pulse 2s infinite' : 'none'
          }}>
            <Icon size={40} color={config.color} />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>{config.label}</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 12px' }}>
            Orden: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>#{orderId}</strong>
          </p>

          {estimatedMinutes && status === 'ACCEPTED' && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', color: '#6ee7b7', marginTop: '12px' }}>
              ⏱ Tiempo estimado: <strong>{estimatedMinutes} minutos</strong>
            </div>
          )}

          {isRejected && rejectionReason && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', color: '#fca5a5', marginTop: '12px' }}>
              {rejectionReason}
            </div>
          )}
        </div>

        {/* Progress Stepper (solo si no está rechazado) */}
        {!isRejected && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
            {STEPS.map((step, idx) => {
              const stepConfig = STATUS_CONFIG[step];
              const StepIcon = stepConfig.icon;
              const isDone = currentStep > idx;
              const isActive = currentStep === idx;
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: idx < STEPS.length - 1 ? '4px' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? '#10b981' : isActive ? config.color : 'rgba(255,255,255,0.07)',
                      border: isActive ? `2px solid ${config.color}` : 'none',
                      transition: 'all 0.4s ease'
                    }}>
                      <StepIcon size={16} color={isDone || isActive ? 'white' : 'rgba(255,255,255,0.3)'} />
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{ width: '2px', height: '20px', background: isDone ? '#10b981' : 'rgba(255,255,255,0.07)', transition: 'all 0.4s ease' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: isActive ? '700' : '500', color: isDone ? '#6ee7b7' : isActive ? 'white' : 'rgba(255,255,255,0.35)', transition: 'all 0.3s' }}>
                    {stepConfig.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(isRejected || isDelivered) && (
            <button onClick={() => navigate('/client/menu')} style={{ padding: '14px', border: 'none', borderRadius: '14px', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <RotateCcw size={18} /> {isDelivered ? 'Pedir de nuevo' : 'Volver al menú'}
            </button>
          )}
          <button onClick={() => { logout(); navigate('/client/login'); }} style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ClientOrderStatus;
