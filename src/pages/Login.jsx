import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChefHat, Lock } from 'lucide-react';

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
      // Redirigir según el rol del usuario
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
         setMessage(loginMsg); // Mensaje neutral/información
      } else {
         setError(loginMsg); // Error de contraseña o similares
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
      background: 'var(--bg-color)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px' }}>
        <div style={{ background: 'var(--primary-color)', padding: '16px', borderRadius: '50%', color: 'white', marginBottom: '24px' }}>
           <ChefHat size={40} />
        </div>
        <h1 style={{ fontSize: '24px', marginBottom: '4px', fontWeight: '900' }}>Cheeseburgers POS</h1>
        <p style={{ color: 'var(--primary-color)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
          fernando es putito
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', fontSize: '14px' }}>
          Identifícate con tu ID de Equipo para iniciar tu turno.
        </p>

        {error && (
          <div style={{ background: 'var(--focus-ring)', color: 'var(--primary-color)', padding: '12px', borderRadius: 'var(--border-radius-sm)', width: '100%', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '12px', borderRadius: 'var(--border-radius-sm)', width: '100%', marginBottom: '16px', fontSize: '14px', textAlign: 'center', border: '1px solid #bae6fd' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>User ID</label>
            <input 
              type="text" 
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              placeholder="Ej. FELIPE12"
              className="input-field"
              style={{ padding: '12px', fontSize: '16px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Contraseña Maestra</label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="input-field"
                style={{ padding: '12px 12px 12px 40px', fontSize: '16px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn" 
            style={{ 
              marginTop: '16px', 
              padding: '14px', 
              background: 'var(--primary-color)', 
              color: 'white', 
              border: 'none', 
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Iniciar Turno
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
