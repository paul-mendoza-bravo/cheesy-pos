import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import BurgerLogo from '../components/BurgerLogo';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!userId.trim() || !password.trim()) {
      setError('Por favor llena todos los campos.');
      return;
    }

    const { success, message: loginMsg, user } = await login(userId, password);
    
    if (success) {
      if (user?.role === 'admin') {
        navigate('/admin');
      } else if (user?.role === 'parillero') {
        navigate('/kitchen');
      } else if (user?.role === 'repartidor') {
        navigate('/delivery');
      } else {
        navigate('/pos');
      }
    } else {
      if (loginMsg.includes('aprobación')) {
         setMessage(loginMsg);
      } else {
         setError(loginMsg);
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'var(--paper)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 32px 32px',
        background: 'var(--ticket)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo SVG */}
        <BurgerLogo size={64} />

        {/* Brand */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--ink)',
          marginTop: '16px',
          marginBottom: '2px',
          letterSpacing: '-0.01em',
        }}>
          Cheeseburguers
        </h1>

        {/* Tagline */}
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--ink-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          marginBottom: '8px',
        }}>
          Cocina · Tapachula
        </span>

        {/* Subtitle */}
        <p style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          color: 'var(--ink-faint)',
          marginBottom: '28px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 400,
        }}>
          Identifícate para abrir tu turno
        </p>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--tomato-soft)',
            color: 'var(--tomato)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            width: '100%',
            marginBottom: '16px',
            fontSize: '13px',
            textAlign: 'center',
            fontWeight: 500,
            border: '1px solid rgba(193,53,37,0.15)',
          }}>
            {error}
          </div>
        )}

        {/* Info message */}
        {message && (
          <div style={{
            background: 'var(--lettuce-soft)',
            color: 'var(--lettuce)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            width: '100%',
            marginBottom: '16px',
            fontSize: '13px',
            textAlign: 'center',
            fontWeight: 500,
            border: '1px solid rgba(91,124,58,0.15)',
          }}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--ink-soft)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              User ID
            </label>
            <input 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              placeholder="Ej. PAUL"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                fontFamily: 'var(--font-mono)',
                background: 'var(--paper)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--ink-soft)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-faint)',
              }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 36px',
                  fontSize: '15px',
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--ink)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            style={{ 
              marginTop: '8px', 
              padding: '14px', 
              background: 'var(--mustard)', 
              color: 'var(--ticket)', 
              border: '1px solid var(--mustard-deep)',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '15px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-md)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--mustard-deep)';
              e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--mustard)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            Abrir turno
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: '24px',
        fontSize: '11px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
      }}>
        v2.0 · Cheeseburguers OS
      </p>
    </div>
  );
};

export default Login;
