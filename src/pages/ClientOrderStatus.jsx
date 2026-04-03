import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { io } from 'socket.io-client';
import { CheckCircle, Clock, ChefHat, Bike, Star, X, RotateCcw } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

const STATUS_CONFIG = {
  PENDING:   { label: 'Esperando confirmación', icon: Clock,        color: 'var(--warning-color)', step: 0 },
  ACCEPTED:  { label: 'Pedido aceptado',         icon: CheckCircle,  color: 'var(--success-color)', step: 1 },
  COOKING:   { label: 'En preparación',           icon: ChefHat,      color: 'var(--primary-color)', step: 2 },
  READY:     { label: 'Listo para entrega',       icon: Star,         color: '#6366f1',              step: 3 },
  DELIVERED: { label: '¡Entregado!',              icon: CheckCircle,  color: 'var(--success-color)', step: 4 },
  REJECTED:  { label: 'No disponible',           icon: X,            color: 'var(--error-color)',   step: -1 },
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
    <div className="theme-switch" style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: "'Inter', sans-serif", color: 'var(--text-main)', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header */}
      <div className="glass" style={{ width: '100%', maxWidth: '480px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderRadius: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>🧀</span>
          <span style={{ fontWeight: '800', fontSize: '18px', fontFamily: "'Outfit', sans-serif" }}>Cheesy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? 'var(--success-color)' : 'var(--error-color)', transition: 'background 0.3s' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{connected ? 'En vivo' : 'Reconectando...'}</span>
        </div>
      </div>

      {/* Falling Burgers Animation para PENDING */}
      {status === 'PENDING' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="falling-burger" style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${2.5 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
              fontSize: `${24 + Math.random() * 24}px`
            }}>
              🍔
            </div>
          ))}
        </div>
      )}

      {/* Main Status Card */}
      <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 10 }}>
        <div className="card" style={{
          border: `2px solid ${config.color}`, borderRadius: 'var(--radius-xl)', padding: '40px 28px',
          textAlign: 'center', boxShadow: 'var(--shadow-premium)', marginBottom: '24px'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'var(--bg-container)', border: `3px solid ${config.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            transition: 'all 0.5s var(--spring)'
          }}>
            <Icon size={36} color={config.color} />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>{config.label}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px', fontWeight: '500' }}>
            Orden <strong style={{ color: 'var(--text-main)' }}>#{orderId.slice(-6).toUpperCase()}</strong>
          </p>

          {estimatedMinutes && status === 'ACCEPTED' && (
            <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-color)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: 'var(--primary-color)', marginTop: '16px', fontWeight: '700' }}>
              ⏱ Tiempo estimado: {estimatedMinutes} mins
            </div>
          )}

          {isRejected && rejectionReason && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--error-color)', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: 'var(--error-color)', marginTop: '16px', fontWeight: '600' }}>
              {rejectionReason}
            </div>
          )}
        </div>

        {/* Progress Stepper */}
        {!isRejected && (
          <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'var(--bg-container)', border: 'none' }}>
            {STEPS.map((step, idx) => {
              const stepConfig = STATUS_CONFIG[step];
              const StepIcon = stepConfig.icon;
              const isDone = currentStep > idx;
              const isActive = currentStep === idx;
              const stepColor = isDone ? 'var(--success-color)' : isActive ? 'var(--primary-color)' : 'var(--text-muted)';

              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: idx < STEPS.length - 1 ? '4px' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--success-color)' : isActive ? 'var(--primary-color)' : 'var(--bg-color)',
                      border: isActive ? `2px solid var(--primary-color)` : `1px solid var(--border-color)`,
                      transition: 'all 0.4s ease'
                    }}>
                      <StepIcon size={14} color={isDone || isActive ? 'white' : 'var(--text-muted)'} />
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{ width: '2px', height: '24px', background: isDone ? 'var(--success-color)' : 'var(--border-color)', transition: 'all 0.4s ease' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: isActive ? '800' : '600', color: stepColor, transition: 'all 0.3s' }}>
                    {stepConfig.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          {(isRejected || isDelivered) && (
            <button onClick={() => navigate('/client/menu')} className="btn btn-primary" style={{ padding: '16px', fontSize: '16px' }}>
              <RotateCcw size={20} /> {isDelivered ? 'Pedir de nuevo' : 'Volver al menú'}
            </button>
          )}
          <button onClick={() => { logout(); navigate('/client/login'); }} style={{ padding: '14px', border: 'none', borderRadius: '14px', background: 'var(--bg-container)', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px', cursor: 'pointer', textAlign: 'center' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .falling-burger {
          position: absolute;
          top: -50px;
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default ClientOrderStatus;
