import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { io } from 'socket.io-client';
import { CheckCircle, Clock, ChefHat, Bike, Star, X, RotateCcw } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

const STATUS_CONFIG = {
  PENDING:   { label: 'Esperando cocina',    icon: Clock,        color: 'var(--warning-color)', step: 0 },
  ACCEPTED:  { label: '¡Orden aceptada!',     icon: CheckCircle,  color: 'var(--success-color)', step: 1 },
  COOKING:   { label: 'Cocinando tu burger', icon: ChefHat,      color: 'var(--accent-color)',  step: 2 },
  READY:     { label: '¡Listisimo p/entrega!', icon: Star,         color: 'var(--primary-color)', step: 3 },
  DELIVERED: { label: '¡Entregado! Disfruta', icon: CheckCircle,  color: 'var(--success-color)', step: 4 },
  REJECTED:  { label: 'No disponible hoy',    icon: X,            color: 'var(--error-color)',   step: -1 },
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
    <div className="theme-switch" style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: "'Inter', sans-serif", color: 'var(--text-main)', padding: '0 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Header - McNavbar */}
      <div className="glass" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', marginBottom: '32px', borderRadius: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🧀</span>
          <span style={{ fontWeight: '900', fontSize: '20px', fontFamily: "'Outfit', sans-serif", color: 'white' }}>CHEESY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: connected ? '#FFC72C' : 'white', boxShadow: connected ? '0 0 8px #FFC72C' : 'none' }} />
          <span style={{ fontSize: '12px', color: 'white', fontWeight: '800' }}>{connected ? 'LIVE TRACKING' : 'RECONNECTING...'}</span>
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
      <div style={{ width: '100%', maxWidth: '480px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div className="card" style={{
          border: `4px solid ${config.color}`, borderRadius: '24px', padding: '40px 24px',
          textAlign: 'center', boxShadow: 'var(--shadow-lg)', marginBottom: '28px'
        }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: '#f9f9f9', border: `4px solid ${config.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            transform: 'scale(1.1)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Icon size={48} color={config.color} />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '10px', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>{config.label}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: '0 0 20px', fontWeight: '700' }}>
            ORDEN <span style={{ color: 'var(--primary-color)' }}>#{orderId.slice(-6).toUpperCase()}</span>
          </p>

          {estimatedMinutes && status === 'ACCEPTED' && (
            <div style={{ background: 'var(--accent-color)', borderRadius: 'var(--radius-full)', padding: '12px 24px', fontSize: '15px', color: '#292929', marginTop: '20px', fontWeight: '900', display: 'inline-block', boxShadow: 'var(--shadow-sm)' }}>
              ⏱ LISTO EN {estimatedMinutes} MINS
            </div>
          )}

          {isRejected && rejectionReason && (
            <div style={{ background: '#FFEEF0', border: '2px solid var(--error-color)', borderRadius: '16px', padding: '16px', fontSize: '15px', color: 'var(--error-color)', marginTop: '20px', fontWeight: '800' }}>
              {rejectionReason}
            </div>
          )}
        </div>

        {/* Progress Stepper - McPill Style */}
        {!isRejected && (
          <div className="card" style={{ padding: '32px 28px', marginBottom: '32px', background: 'var(--bg-container)', border: '1px solid #eee' }}>
            {STEPS.map((step, idx) => {
              const stepConfig = STATUS_CONFIG[step];
              const StepIcon = stepConfig.icon;
              const isDone = currentStep > idx;
              const isActive = currentStep === idx;
              const stepColor = isDone ? 'var(--success-color)' : isActive ? 'var(--primary-color)' : '#CCCCCC';

              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: idx < STEPS.length - 1 ? '6px' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="theme-switch" style={{
                      width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--success-color)' : isActive ? 'var(--accent-color)' : '#F5F5F5',
                      border: isActive ? `3px solid var(--primary-color)` : isDone ? 'none' : `2px solid #EEEEEE`,
                      transition: 'all 0.4s var(--spring)'
                    }}>
                      <StepIcon size={18} color={isDone ? 'white' : isActive ? '#292929' : '#BBB'} />
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{ width: '4px', height: '28px', background: isDone ? 'var(--success-color)' : '#EEEEEE', transition: 'all 0.4s ease', borderRadius: '2px' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: isActive || isDone ? '900' : '700', color: stepColor, transition: 'all 0.3s' }}>
                    {stepConfig.label.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', padding: '0 20px' }}>
          {(isRejected || isDelivered) && (
            <button onClick={() => navigate('/client/menu')} className="btn btn-primary" style={{ padding: '20px', fontSize: '18px', textTransform: 'uppercase' }}>
              <RotateCcw size={22} /> {isDelivered ? 'Pedir de nuevo' : 'Volver al menú'}
            </button>
          )}
          <button onClick={() => { logout(); navigate('/client/login'); }} style={{ padding: '18px', border: 'none', borderRadius: 'var(--radius-full)', background: '#EEEEEE', color: '#666', fontWeight: '900', fontSize: '15px', cursor: 'pointer', textAlign: 'center', textTransform: 'uppercase' }}>
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
